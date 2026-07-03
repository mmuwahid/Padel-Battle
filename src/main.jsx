import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { SubscriptionProvider } from './contexts/SubscriptionProvider'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><SubscriptionProvider><App /></SubscriptionProvider></React.StrictMode>)
