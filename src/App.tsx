import React, { useState, useRef, useCallback } from "react";
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

  const aiReq = async (
    frame: number,
    imageData?: string | null,
    allFrames?: FrameData[]
  ) => {
    try {
      const framesForPayload = (allFrames ?? frames).map((f, i) => ({
        index: i + 1,
        file: f.image,
        caption: f.caption,
      }));
      const payload: any = {
        frame,
        file: imageData,
        // provide recursive context without breaking existing API
        frames: framesForPayload,
        files: framesForPayload.map((f) => f.file).filter(Boolean),
        captions: framesForPayload.map((f) => f.caption).filter(Boolean),
      };

      const response = await fetch("http://localhost:3001/handle_img", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      // Per-frame caption (fallback to data.response)
      const perFrameCaption = data.caption ?? data.response ?? null;

      if (perFrameCaption) {
        setFrames((prev) => {
          const next = [...prev];
          next[frame - 1] = { ...next[frame - 1], caption: perFrameCaption };
          return next;
        });
      }

      if (typeof data.story === "string" && data.story.length > 0) {
        setStory(data.story);
      } else {
        // If all frames captured and no story provided, synthesize a simple one
        const base = allFrames ?? frames;
        const allHaveCaptions = base.every((f) => !!f.caption);
        const allHaveImages = base.every((f) => !!f.image);
        if (allHaveImages && allHaveCaptions) {
          const synthetic = base
            .map((f, i) => (f.caption ? `${i + 1}. ${f.caption}` : null))
            .filter(Boolean)
            .join(" ");
          setStory(synthetic || null);
        }
      }
    } catch (error) {
      console.error("Error sending image to AI API:", error);
    }
  };

  const advanceFrame = useCallback(() => {
    setCurrentFrame((prev) => (prev % 4) + 1);
  }, []);

  const handleCapture = useCallback(
    (imageSrc?: string | null) => {
      if (!imageSrc) return;
      const frameIndex = currentFrame;

      setFrames((prev) => {
        const next = prev.map((f, i) =>
          i === frameIndex - 1 ? { ...f, image: imageSrc } : f
        );
        // Send with full context including this frame
        aiReq(frameIndex, imageSrc, next);
        return next;
      });

      advanceFrame();
    },
    [currentFrame, advanceFrame]
  );

  const WebcamPanel: React.FC<{ onCapture: (image?: string | null) => void }> = ({
    onCapture,
  }) => {
    const webcamRef = useRef<Webcam>(null);

    const videoConstraints = {
      width: 1280,
      height: 720,
      facingMode: "user",
    };

    const capture = useCallback(() => {
      const imageSrc = webcamRef.current?.getScreenshot();
      onCapture(imageSrc);
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
      <button className="toggle" onClick={() => setCameraOn((prev) => !prev)}>
        Camera on/off
      </button>

      <h1 className="title">FRAME BY FRAME</h1>

      <div className="layout">
        <div className="grid">
          <div className="comic-frame frame-1">
            {currentFrame === 1 ? (
              <WebcamPanel onCapture={handleCapture} />
            ) : frames[0].image ? (
              <Still src={frames[0].image as string} caption={frames[0].caption} />
            ) : (
              <Placeholder caption={frames[0].caption} />
            )}
          </div>

          <div className="comic-frame frame-2">
            {currentFrame === 2 ? (
              <WebcamPanel onCapture={handleCapture} />
            ) : frames[1].image ? (
              <Still src={frames[1].image as string} caption={frames[1].caption} />
            ) : (
              <Placeholder caption={frames[1].caption} />
            )}
          </div>

          <div className="comic-frame frame-3">
            {currentFrame === 3 ? (
              <WebcamPanel onCapture={handleCapture} />
            ) : frames[2].image ? (
              <Still src={frames[2].image as string} caption={frames[2].caption} />
            ) : (
              <Placeholder caption={frames[2].caption} />
            )}
          </div>

          <div className="comic-frame frame-4">
            {currentFrame === 4 ? (
              <WebcamPanel onCapture={handleCapture} />
            ) : frames[3].image ? (
              <Still src={frames[3].image as string} caption={frames[3].caption} />
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
                Capture frames to build a cohesive story. The sidebar will summarize the whole
                narrative as frames are filled.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
