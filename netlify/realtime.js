const { BetaAnalyticsDataClient } = require("@google-analytics/data");

exports.handler = async () => {
  try {
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '')
      .replace(/\\n/g, '\n')
      .trim();

    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      throw new Error(`Invalid key format. Starts with: ${privateKey.substring(0, 20)}`);
    }

    const credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL.trim(),
      private_key: privateKey
    };

    const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });

    const [response] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${process.env.GA_PROPERTY_ID}`,
      metrics: [{ name: "activeUsers" }],
    });

    const activeUsers = response.rows?.[0]?.metricValues?.[0]?.value || "0";

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        activeUsers: parseInt(activeUsers)
      })
    };
  } catch (error) {
    console.error("REALTIME ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: "Failed to fetch realtime users",
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
