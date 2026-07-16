import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design-system/fonts.css'
import './design-system/tokens.css'
import './design-system/components.css'
import { App } from './app/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
