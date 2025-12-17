import React from 'react'
import ReactDOM from 'react-dom/client'
import Popup from './Popup'
import '@/index.css'
import '@/i18n/config'
import '@/lib/theme' // Apply theme


ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>,
)
