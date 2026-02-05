
/**
 * CRITICAL: Immediate Global Polyfills
 * We must define 'process' before ANY other module is imported because 
 * @google/genai and other libraries may access it at the module level.
 */
(window as any).process = (window as any).process || { env: {} };
(window as any).process.env = (window as any).process.env || {};

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Global error logger for easier debugging on production deployments
window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root && root.innerHTML.includes('Initializing')) {
    root.innerHTML = `
      <div style="padding: 40px; color: #ef4444; font-family: sans-serif; text-align: center;">
        <h1 style="font-weight: 800; margin-bottom: 16px;">BOOT ERROR</h1>
        <p style="color: #94a3b8; font-size: 14px;">${message}</p>
        <button onclick="window.location.reload()" style="margin-top: 24px; padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">RETRY LOAD</button>
      </div>
    `;
  }
  return false;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Target container 'root' not found in document.");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e: any) {
  rootElement.innerHTML = `<div style="color: red; padding: 20px;">Mount Failure: ${e.message}</div>`;
}
