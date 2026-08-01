const fs = require('fs');

// Fix BotAPI.js
const botApiPath = 'src/utils/BotAPI.js';
let content = fs.readFileSync(botApiPath, 'utf8');

// Replace the incorrect function definitions with proper const declarations
content = content.replace(
  /captureMarketingLead: async function\(payload\) \{/g,
  'const captureMarketingLead = async (payload) => {'
);

content = content.replace(
  /getMarketAnalysis: async function\(\{/g,
  'const getMarketAnalysis = async ({'
);

content = content.replace(
  /getMarketCandles: async function\(\{/g,
  'const getMarketCandles = async ({'
);

content = content.replace(
  /getReferralStats: async function\(\) \{/g,
  'const getReferralStats = async () => {'
);

// Make sure functions are properly closed
// Add missing semicolons after function bodies
content = content.replace(
  /(\}\s*)$/gm,
  '};'
);

fs.writeFileSync(botApiPath, content);
console.log('✅ BotAPI.js fixed');

// Fix MemberDashboard.jsx
const dashPath = 'src/components/Dashboard/MemberDashboard.jsx';
let dashContent = fs.readFileSync(dashPath, 'utf8');

// Remove extra closing brace at line 257 if it exists
const lines = dashContent.split('\n');
if (lines[256] && lines[256].trim() === '}') {
  lines.splice(256, 1);
  dashContent = lines.join('\n');
  console.log('✅ Removed extra closing brace at line 257');
}

fs.writeFileSync(dashPath, dashContent);
console.log('✅ MemberDashboard.jsx fixed');
