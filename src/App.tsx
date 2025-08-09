import React, { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import "./App.css";

function App() {
  const [cameraOn, setCameraOn] = useState(true);
  const [modelResponse, setModelResponse] = useState<string | null>(null);

  const aiReq = async (frame: number, imageData?: string | null) => {
    // frame will be a number 1-4, imageData is the image in b64
    try {
      const response = await fetch("http://localhost:3001/handle_img", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame: frame, file: imageData }),
      });
      const data = await response.json();
      console.log("AI API response:", data);
      setModelResponse(data.response);
    } catch (error) {
      console.error("Error sending image to AI API:", error);
    }
  };

  const WebcamPanel: React.FC = () => {
    const webcamRef = useRef<Webcam>(null);

    const videoConstraints = {
      width: 1280,
      height: 720,
      facingMode: "user",
    };

    const capture = useCallback(() => {
      const imageSrc = webcamRef.current?.getScreenshot();
      // Send as frame 1 by default. Logic sequencing can be expanded later if needed.
      aiReq(1, imageSrc);
    }, []);

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

  return (
    <div className="app">
      <button className="toggle" onClick={() => setCameraOn((prev) => !prev)}>
        Camera on/off
      </button>

      <h1 className="title">FRAME BY FRAME</h1>

      <div className="grid">
        <div className="comic-frame frame-1">
          <WebcamPanel />
        </div>

        <div className="comic-frame frame-2">
          <div className="frame-content" />
        </div>

        <div className="comic-frame frame-3">
          <div className="frame-content" />
        </div>

        <div className="comic-frame frame-4">
          <div className="frame-content" />
        </div>
      </div>

      {modelResponse ? <p className="response">{modelResponse}</p> : null}
    </div>
  );
}

export default App;
