import { useState } from 'react'
import React from 'react'
import './App.css'
import Webcam from 'react-webcam'

function App() {
  const [cameraOn, setCameraOn] = useState(true);
  const WebcamComponent = () => {
  const webcamRef = React.useRef<Webcam>(null);
  const videoConstraints = { width: 1280, height: 720, facingMode: 'user' };
  const capture = React.useCallback(
    () => {
      webcamRef.current?.getScreenshot();
    },
    [webcamRef]
  );
  return (
    <>
      <Webcam
        audio={false}
        height={720}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={1280}
        videoConstraints={videoConstraints}
      />
      <button onClick={capture}>Capture photo</button>
    </>
  );
};
  const handleCameraToggle = () => {
    setCameraOn((prev) => !prev);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <button
        onClick={handleCameraToggle}
        style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 10 }}
      >
        Camera on/off
      </button>

      <div style={{ width: '100%', display: 'grid', placeItems: 'center', padding: '1rem' }}>
        {cameraOn ? <WebcamComponent /> : null}
      </div>
    </div>
  )
}

export default App

