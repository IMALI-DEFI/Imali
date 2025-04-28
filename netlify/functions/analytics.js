const { BetaAnalyticsDataClient } = require("@google-analytics/data");

exports.handler = async () => {
  // Debug environment variables
  console.log("ENV VARIABLES:", {
    client_email: !!process.env.GOOGLE_CLIENT_EMAIL,
    private_key: !!process.env.GOOGLE_PRIVATE_KEY,
    property_id: !!process.env.GA_PROPERTY_ID
  });

  try {
    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error("Missing Google Analytics credentials");
    }

    // Format private key (handle Netlify's environment variables)
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    console.log("Private key snippet:", privateKey.substring(0, 25) + "...");
    console.log("Is private key multi-line?", privateKey.includes('\n'));
    console.log("Private key first few lines:", privateKey.split('\n').slice(0, 5));

    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey
      },
    });

    console.log("GA Client initialized successfully");

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${process.env.GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }],
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        data: response.rows.map(row => ({
          date: row.dimensionValues[0].value,
          users: parseInt(row.metricValues[0].value)
        }))
      })
    };

  } catch (error) {
    console.error("FULL ERROR:", {
      message: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: "Failed to fetch analytics",
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};