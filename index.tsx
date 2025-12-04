import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

if (import.meta.env.VITE_DEVTOOLS_ENABLED === "true") {
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === ",") {
      document.querySelector("button")?.click();
    }
  });
}

root.render(
  <App />
);
