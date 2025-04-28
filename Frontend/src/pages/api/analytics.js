// src/pages/api/analytics.js

import { BetaAnalyticsDataClient } from "@google-analytics/data";

export default async function handler(req, res) {
  const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
  });

  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${process.env.GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }],
    });

    const formattedData = response.rows.map(row => ({
      day: row.dimensionValues[0].value,
      value: Number(row.metricValues[0].value),
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("GA4 fetch error:", error);
    res.status(500).send("Error fetching analytics data");
  }
}
