import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Webcam from 'react-webcam'

const WebcamComponent = () => <Webcam style={{ width: '100%', maxWidth: '800px' }} />

function App() {
  const [cameraOn, setCameraOn] = useState(true);

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
