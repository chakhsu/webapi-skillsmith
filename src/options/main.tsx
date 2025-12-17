import React from 'react'
import ReactDOM from 'react-dom/client'
import Options from './Options'
import '@/index.css'
import '@/i18n/config'
import '@/lib/theme' // Apply theme


ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Options />
    </React.StrictMode>,
)
