import React, { useState, useEffect } from "react";
import { FaUsers } from "react-icons/fa";

const AdminPanel = () => {
  const [gaError, setGaError] = useState(null);

  useEffect(() => {
    const initGA = () => {
      // First load the Google API client
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.onload = () => {
        window.gapi.load('client:auth2', () => {
          window.gapi.client.init({
            apiKey: process.env.REACT_APP_GA_API_KEY,
            clientId: process.env.REACT_APP_GA_CLIENT_ID,
            discoveryDocs: ['https://analyticsreporting.googleapis.com/$discovery/rest'],
            scope: 'https://www.googleapis.com/auth/analytics.readonly'
          }).then(() => {
            // Now load the Analytics Embed API
            const analyticsScript = document.createElement('script');
            analyticsScript.src = 'https://www.google-analytics.com/analytics.js';
            analyticsScript.async = true;
            analyticsScript.onload = initEmbedAPI;
            document.body.appendChild(analyticsScript);
          }).catch(err => {
            console.error("GAPI init failed:", err);
            setGaError("Failed to initialize Google Analytics");
          });
        });
      };
      document.body.appendChild(gapiScript);
    };

    const initEmbedAPI = () => {
      window.gapi.analytics.ready(() => {
        // Auth setup
        window.gapi.analytics.auth.authorize({
          container: 'auth-container',
          clientid: process.env.REACT_APP_GA_CLIENT_ID,
        });

        // Create view selector
        const viewSelector = new window.gapi.analytics.ViewSelector({
          container: 'view-selector'
        });

        // Create timeline chart
        const timeline = new window.gapi.analytics.googleCharts.DataChart({
          query: {
            ids: `ga:${process.env.REACT_APP_GA_VIEW_ID}`,
            metrics: 'ga:users',
            dimensions: 'ga:date',
            'start-date': '7daysAgo',
            'end-date': 'yesterday'
          },
          chart: {
            type: 'LINE',
            container: 'timeline',
            options: {
              width: '100%',
              height: '300px'
            }
          }
        });

        // Render both components
        viewSelector.execute();
        timeline.execute();
      });
    };

    initGA();

    return () => {
      // Cleanup
      ['https://apis.google.com/js/api.js', 'https://www.google-analytics.com/analytics.js']
        .forEach(src => {
          const script = document.querySelector(`script[src="${src}"]`);
          if (script) document.body.removeChild(script);
        });
    };
  }, []);

  return (
    <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {gaError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {gaError}
        </div>
      )}

      <div className="mb-6 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <FaUsers className="mr-2" /> Engagement Trends
        </h2>
        <div id="auth-container"></div>
        <div id="view-selector"></div>
        <div id="timeline"></div>
      </div>
    </div>
  );
};

export default AdminPanel;
