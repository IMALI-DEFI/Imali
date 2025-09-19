import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';  // Import BrowserRouter

// Global styles
import './index.css';
import './Animations.css';

// Main app component
import App from './App';

// Find the root element
const rootElement = document.getElementById('root');

// Ensure BrowserRouter wraps the entire application
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
} else {
  console.error(
    '❌ Failed to find the root element. Ensure there is a <div id="root"></div> in your public/index.html file.'
  );
}
