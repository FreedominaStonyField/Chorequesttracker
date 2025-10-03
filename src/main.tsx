import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { Provider as JotaiProvider } from 'jotai'
import App from './App'
import './index.css'
import { queryClient } from './lib/queryClient'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({ immediate: true })

if (updateSW) {
  updateSW()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ReactQueryDevtools position="bottom" initialIsOpen={false} buttonPosition="bottom-right" />
      </QueryClientProvider>
    </JotaiProvider>
  </React.StrictMode>,
)
