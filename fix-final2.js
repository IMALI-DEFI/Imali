const fs = require('fs');

const botApiPath = 'src/utils/BotAPI.js';
let content = fs.readFileSync(botApiPath, 'utf8');

// Remove the malformed block (lines with orphaned }); and );)
// Look for the pattern: });\n  };\n);
content = content.replace(
  /}\);\s*\n\s*\};\s*\n\s*\);/g,
  '});'
);

// Also clean up any extra closing braces
content = content.replace(
  /\n\s*\}\s*\n\s*\);\s*\n/g,
  '\n});\n'
);

// Make sure the request helper function is properly defined before auth section
// We'll look for the pattern and clean it up
const requestHelper = `
// Helper function for API requests
const request = async (url, options = {}) => {
  const { method = "GET", body, auth = true } = options;
  const config = {
    method,
    url,
    headers: {},
  };
  
  if (body) {
    config.data = body;
  }
  
  if (auth) {
    const token = getToken();
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`;
    }
  }
  
  try {
    const response = await api(config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

`;

// Check if request helper exists, if not add it
if (!content.includes('const request = async')) {
  // Find the position after api interceptors
  const interceptorEnd = content.indexOf('api.interceptors.response.use');
  const interceptorEndPos = content.indexOf('});', interceptorEnd) + 3;
  content = content.slice(0, interceptorEndPos) + requestHelper + content.slice(interceptorEndPos);
}

fs.writeFileSync(botApiPath, content);
console.log('✅ BotAPI.js cleaned up');

// Fix MemberDashboard.jsx
const dashPath = 'src/components/Dashboard/MemberDashboard.jsx';
let dashContent = fs.readFileSync(dashPath, 'utf8');

// Remove any extra closing braces at line 257
const lines = dashContent.split('\n');
if (lines[256]) {
  const lineContent = lines[256].trim();
  if (lineContent === '}' || lineContent === '};' || lineContent === '})') {
    lines.splice(256, 1);
    dashContent = lines.join('\n');
    console.log('✅ Removed problematic line at 257: "' + lineContent + '"');
  }
}

fs.writeFileSync(dashPath, dashContent);
console.log('✅ MemberDashboard.jsx fixed');
