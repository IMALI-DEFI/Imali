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

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${process.env.GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }]
    });

    const rows = response.rows || [];

    const formatted = rows.map(row => ({
      date: row.dimensionValues[0].value,
      users: row.metricValues[0].value
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: formatted
      })
    };
  } catch (error) {
    console.error("FULL ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: "Failed to fetch analytics",
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
