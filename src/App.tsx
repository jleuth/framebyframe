import { useState } from 'react'
import React from 'react'
import './App.css'
import Webcam from 'react-webcam'

function App() {
  const [cameraOn, setCameraOn] = useState(true);
  
  const WebcamComponent = () => {
    const webcamRef = React.useRef<Webcam>(null);
    const videoConstraints = { width: 1280, height: 720, facingMode: 'user' };
    const [currentFrame, setCurrentFrame] = useState(0)
    
    const capture = React.useCallback(
      () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        currentFrame + 1
        aiReq(currentFrame, imageSrc)
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

  const aiReq = async (frame: number, imageData?: string | null) => { // frame will be a number 1-4, imageData is the image in b64
    try {
      const response = await fetch('https://placeholder.local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: frame, image: imageData }),
      });
      const data = await response.json();
      console.log('AI API response:', data);
    } catch (error) {
      console.error('Error sending image to AI API:', error);
    }
  }

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

