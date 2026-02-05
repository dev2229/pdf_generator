
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Critical: Root element not found.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
  } catch (error) {
    console.error("React Mounting Error:", error);
    rootElement.innerHTML = `
      <div style="color: white; background: #ef4444; padding: 20px; font-family: sans-serif; text-align: center;">
        <h2 style="font-weight: 800;">Application Initialization Failed</h2>
        <p>${error instanceof Error ? error.message : String(error)}</p>
        <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: white; color: #ef4444; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">RELOAD</button>
      </div>
    `;
  }
}
