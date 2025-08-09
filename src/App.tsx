import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import Webcam from "react-webcam";
import "./App.css";

type FrameData = {
  image?: string | null;
  caption?: string | null;
};

function App() {
  const [cameraOn, setCameraOn] = useState(true);
  const [currentFrame, setCurrentFrame] = useState<number>(1);
  const [frames, setFrames] = useState<FrameData[]>([{}, {}, {}, {}]);
  const [story, setStory] = useState<string | null>(null);

  const isComplete = useMemo(() => frames.every((f) => !!f.image), [frames]);
  const batchTriggeredRef = useRef(false); // Ensures batch inference runs only once per full set; reset in resetAll

  const resetAll = useCallback(() => {
    setFrames([{}, {}, {}, {}]);
    setStory(null);
    setCurrentFrame(1);
    setCameraOn(true);
    batchTriggeredRef.current = false; // reset one-shot guard when starting a new session
  }, []);

  const advanceFrame = useCallback(() => {
    setCurrentFrame((prev) => Math.min(prev + 1, 4)); // stop at 4, never loop
  }, []);

  // Apply recursive caption updates coming back from the model
  const applyCaptionUpdates = useCallback(
    (base: FrameData[], data: any, justCapturedIdx: number): FrameData[] => {
      const updated = base.map((f) => ({ ...f }));

      // 1) captions: ["...", "..."] or [{ text: "..." }]
      if (Array.isArray(data?.captions)) {
        data.captions.slice(0, 4).forEach((c: any, i: number) => {
          if (typeof c === "string" && c.length) updated[i].caption = c;
          else if (c && typeof c.text === "string") updated[i].caption = c.text;
        });
      }

      // 2) frames: [{ index: 1, caption: "..." }, ...] or { frame: 1, ... }
      if (Array.isArray(data?.frames)) {
        data.frames.forEach((f: any) => {
          const idx = (typeof f.index === "number" ? f.index : f.frame) ?? null;
          if (idx && idx >= 1 && idx <= 4) {
            if (typeof f.caption === "string" && f.caption.length) {
              updated[idx - 1].caption = f.caption;
            } else if (f.caption && typeof f.caption.text === "string") {
              updated[idx - 1].caption = f.caption.text;
            }
          }
        });
      }

      // 3) updates: { "1": "cap", "2": { text: "cap2" }, ... }
      if (data?.updates && typeof data.updates === "object") {
        Object.entries(data.updates).forEach(([k, v]) => {
          const idx = parseInt(k, 10);
          if (idx >= 1 && idx <= 4) {
            if (typeof v === "string" && v.length) {
              updated[idx - 1].caption = v;
            } else if (v && typeof (v as any).text === "string") {
              updated[idx - 1].caption = (v as any).text;
            }
          }
        });
      }

      // 4) Per-call single caption fallback for the just captured frame
      if (typeof data?.caption === "string" && data.caption.length) {
        updated[justCapturedIdx].caption = data.caption;
      } else if (typeof data?.response === "string" && data.response.length) {
        updated[justCapturedIdx].caption = data.response;
      }

      return updated;
    },
    []
  );


  const runBatchInferenceOnce = useCallback(async () => {
    try {
      const payload = {
        files: frames.map((f) => (f.image ?? null)),
        captions: frames.map((f) => (f.caption ?? null)),
        story: story ?? null,
        complete: true,
      };

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/handle_batch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      // Merge captions once using existing helper
      const mergeInput = {
        captions: Array.isArray(data?.captions) ? data.captions : [],
      };

      if (typeof data?.story === "string" && data.story) {
        // If backend provided a story, set it directly
        setFrames((prev) => applyCaptionUpdates(prev, mergeInput, 0));
        setStory(data.story);
      } else {
        // Otherwise merge captions and apply single synthetic fallback once
        setFrames((prev) => {
          const merged = applyCaptionUpdates(prev, mergeInput, 0);
          const allHaveImages = merged.every((f) => !!f.image);
          const allHaveCaptions = merged.every((f) => !!f.caption);
          if (allHaveImages && allHaveCaptions && !story) {
            const synthetic = merged
              .map((f, i) => `${i + 1}. ${f.caption}`)
              .join(" ");
            setStory(synthetic);
          }
          return merged;
        });
      }
    } catch (e) {
      console.error("Batch AI request failed", e);
    }
  }, [frames, story, applyCaptionUpdates]);

  const handleCapture = useCallback(
    (imageSrc?: string | null) => {
      if (!imageSrc) return;
      const idx = currentFrame - 1;

      setFrames((prev) => {
        const snapshot = prev.map((f) => ({ ...f }));
        snapshot[idx].image = imageSrc;
        // No incremental inference; batch will run once after completion
        return snapshot;
      });

      // Advance but never loop beyond frame 4
      advanceFrame();
    },
    [currentFrame, advanceFrame]
  );

  // Trigger exactly once when all frames have images
  useEffect(() => {
    if (isComplete && !batchTriggeredRef.current) {
      batchTriggeredRef.current = true;
      runBatchInferenceOnce();
    }
  }, [isComplete, runBatchInferenceOnce]);

  const WebcamPanel: React.FC<{ onCapture: (img?: string | null) => void }> = ({
    onCapture,
  }) => {
    const webcamRef = useRef<Webcam>(null);
    const videoConstraints = { width: 1280, height: 720, facingMode: "user" };

    const capture = useCallback(() => {
      const img = webcamRef.current?.getScreenshot();
      onCapture(img);
    }, [onCapture]);

    return (
      <div className="frame-content camera-frame">
        {cameraOn ? (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            className="webcam"
            videoConstraints={videoConstraints}
          />
        ) : null}
        <button className="shutter" onClick={capture} aria-label="Shutter" />
      </div>
    );
  };

  const Placeholder: React.FC<{ caption?: string | null }> = ({ caption }) => (
    <div className="frame-content">
      {caption ? <div className="caption">{caption}</div> : null}
    </div>
  );

  const Still: React.FC<{ src: string; caption?: string | null }> = ({
    src,
    caption,
  }) => (
    <div className="frame-content camera-frame">
      <img className="still" src={src} alt="Captured frame" />
      {caption ? <div className="caption">{caption}</div> : null}
    </div>
  );

  return (
    <div className="app">
      <button className="toggle" onClick={() => setCameraOn((p) => !p)}>
        Camera on/off
      </button>
      <button className="reset" onClick={resetAll} title="Reset frames">
        Reset
      </button>

      <h1 className="title">FRAME BY FRAME</h1>

      <div className="layout">
        <div className="grid">
          <div className="comic-frame frame-1">
            {!isComplete && currentFrame === 1 ? (
              <WebcamPanel onCapture={handleCapture} />
            ) : frames[0].image ? (
              <Still
                src={frames[0].image as string}
                caption={frames[0].caption}
              />
            ) : (
              <Placeholder caption={frames[0].caption} />
            )}
          </div>

          <div className="comic-frame frame-2">
            {!isComplete && currentFrame === 2 ? (
              <WebcamPanel onCapture={handleCapture} />
            ) : frames[1].image ? (
              <Still
                src={frames[1].image as string}
                caption={frames[1].caption}
              />
            ) : (
              <Placeholder caption={frames[1].caption} />
            )}
          </div>

          <div className="comic-frame frame-3">
            {!isComplete && currentFrame === 3 ? (
              <WebcamPanel onCapture={handleCapture} />
            ) : frames[2].image ? (
              <Still
                src={frames[2].image as string}
                caption={frames[2].caption}
              />
            ) : (
              <Placeholder caption={frames[2].caption} />
            )}
          </div>

          <div className="comic-frame frame-4">
            {!isComplete && currentFrame === 4 ? (
              <WebcamPanel onCapture={handleCapture} />
            ) : frames[3].image ? (
              <Still
                src={frames[3].image as string}
                caption={frames[3].caption}
              />
            ) : (
              <Placeholder caption={frames[3].caption} />
            )}
          </div>
        </div>

        <aside className="sidebar">
          <h2 className="sidebar-title">The Story</h2>
          <div className="sidebar-body">
            {story ? (
              <p className="story-text">{story}</p>
            ) : (
              <p className="story-hint">
                Capture frames to build a cohesive story. The sidebar will
                summarize and refine the narrative as frames are filled.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
