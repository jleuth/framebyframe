import openai from "openai";
import express from "express";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
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

app.use(require('cors')({ origin: '*' }))
app.use(
  express.json({
    limit: "550mb",
  })
);
const openaiApi = new openai.OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (req, res) => res.end("meow:3"));
app.post("/handle_img", async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: "No request body provided" });
  }
  if (!req.body.file) {
    return res.status(400).json({ error: "No file provided" });
  }
  // return json of what it guesses
  await openaiApi.responses
    .parse({
      model: "gpt-5-nano",
      input: [
        {
          role: "system",
          content: "What character/letter/token is this image.",
        },
      ],
      files: [
        {
          name: "image",
          content: req.body.file,
          type: "image/png",
        },
      ],
      text: {
        format: zodTextFormat(schema, "event"),
      },
    })
    .then((r) => r.json())
    .then((json) => {
      res.status(200).json(json);
    });
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Server is running");
});

