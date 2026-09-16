import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'

import '@/styles/index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Khong tim thay #root trong index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
