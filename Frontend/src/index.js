import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter for routing

// Global styles
import './index.css'; // Ensure this file exists in the src/ directory
import './Animations.css'; // Ensure this file exists in the src/ directory

// Main app component
import App from './App'; // Ensure App.js exists in the src/ directory

// Find the root element
const rootElement = document.getElementById('root');

// Ensure the root element exists before rendering the app
if (rootElement) {
  // Create a root for ReactDOM
  const root = ReactDOM.createRoot(rootElement);

  // Render the app inside React.StrictMode and BrowserRouter
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
} else {
  // Log an error if the root element is not found
  console.error(
    '❌ Failed to find the root element. Ensure there is a <div id="root"></div> in your public/index.html file.'
  );
}
