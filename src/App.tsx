import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Webcam from 'react-webcam'

const WebcamComponent = () => <Webcam/>

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <WebcamComponent/>
    </>
  )
}

export default App
