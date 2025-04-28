const { BetaAnalyticsDataClient } = require('@google-analytics/data');

exports.handler = async () => {
  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }
  });
  
  try {
    await client.getMetadata({ 
      name: `properties/${process.env.GA_PROPERTY_ID}` 
    });
    return { statusCode: 200, body: "Auth successful!" };
  } catch (error) {
    return { 
      statusCode: 500, 
      body: `Auth failed: ${error.message}` 
    };
  }
};