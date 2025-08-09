import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
import openai from "openai";
import express from "express";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import cors from "cors";
const schema = z.object({
  step: z.number().default(1),
  guess: z.string().max(20),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(
    z.object({
      guess: z.string().max(20),
      confidence: z.number().min(0).max(1),
    })
  ),
});
const app = express();

app.use(cors({ origin: "*" }));
app.use(
  express.json({
    limit: "550mb",
  })
);
const openaiApi = new openai.OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (req, res) => res.end("meow:3"));

app.post("/final_story"), async (res, req) => {
  if (!req.body) {
    return res.status(400).json({ error: "No request body specified "})
  }
  if (!req.body.captions) {
    return res.status(400).json({ error: "No captions specified "})
  }

   try {
    const response = await openaiApi.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: `${req.body.captions}. Using these captions, write a sub 50 word cohesive story or communication interpreted from the frames.` },
            {
              type: "input_image",
              image_url: `${req.body.file}`,
            },
          ],
        },
      ],
    });

    return res.status(200).json({ response: response.output_text });
  } catch (err) {
    return res.status(500).json({
      error: "Model call failed",
      details: String(err),
    });
  }
}
app.post("/handle_img", async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: "No request body provided" });
  }
  if (!req.body.file) {
    return res.status(400).json({ error: "No file provided" });
  }
  // return json of what it guesses
  try {
    const response = await openaiApi.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "what's in this image?" },
            {
              type: "input_image",
              image_url: `${req.body.file}`,
            },
          ],
        },
      ],
    });

    return res.status(200).json({ response: response.output_text });
  } catch (err) {
    return res.status(500).json({
      error: "Model call failed",
      details: String(err),
    });
  }
});

app.post("/handle_batch", async (req, res) => {
  // Expected body: { files: string[], captions?: (string|null)[], story?: string, complete?: boolean }
  if (!req.body) {
    return res.status(400).json({ error: "No request body provided" });
  }
  const { files } = req.body || {};
  if (!Array.isArray(files)) {
    return res.status(400).json({ error: "`files` must be an array" });
  }
  if (files.length !== 4) {
    return res
      .status(400)
      .json({ error: "`files` must contain exactly 4 items" });
  }
  if (!files.every((f) => typeof f === "string" && f.length > 0)) {
    return res
      .status(400)
      .json({ error: "Each entry in `files` must be a non-empty data URL string" });
  }

  try {
    const captions = [];
    for (let i = 0; i < 4; i++) {
      const file = files[i];

      const response = await openaiApi.responses.create({
        model: "gpt-5-mini",
        input: [
          {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
          "Describe what is shown in this drawing in a clear, simple sentence. Use present tense. If you cannot tell, reply with 'unclear'.",
          },
          {
            type: "input_image",
            image_url: `${file}`,
          },
        ],
          },
        ],
      });

      // Ensure index-aligned output; allow null in case of unexpected empty output
      const text = (response && response.output_text) ? String(response.output_text).trim() : null;
      captions[i] = text && text.length ? text : null;
    }

    // Optional story generation intentionally omitted (frontend will apply fallback once)
    const story = undefined;

    return res.status(200).json({ captions, story });
  } catch (err) {
    return res.status(500).json({
      error: "Model call failed",
      details: String(err),
    });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Server is running");
});
