const fs = require('fs');

const filePath = 'src/utils/BotAPI.js';
let content = fs.readFileSync(filePath, 'utf8');

// Check if request function already exists
if (content.includes('const request = async')) {
  console.log('✅ request function already exists');
  process.exit(0);
}

// Find the position after api.interceptors.response.use
const interceptorEnd = content.indexOf('api.interceptors.response.use');
const interceptorEndPos = content.indexOf('});', interceptorEnd) + 3;

// Insert the request helper function
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

content = content.slice(0, interceptorEndPos) + requestHelper + content.slice(interceptorEndPos);

fs.writeFileSync(filePath, content);
console.log('✅ request helper function added to BotAPI.js');
