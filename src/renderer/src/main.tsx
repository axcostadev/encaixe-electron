import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

console.log('Renderer startup: mounting App')

window.addEventListener('error', (event) => {
  console.error('Renderer uncaught error:', event.error || event.message)
})
window.addEventListener('unhandledrejection', (event) => {
  console.error('Renderer unhandled rejection:', event.reason)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
