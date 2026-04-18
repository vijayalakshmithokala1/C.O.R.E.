import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { DomainProvider } from './context/DomainContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <DomainProvider>
        <App />
      </DomainProvider>
    </ThemeProvider>
  </StrictMode>,
)
