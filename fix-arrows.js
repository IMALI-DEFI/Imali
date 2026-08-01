const fs = require('fs');

const botApiPath = 'src/utils/BotAPI.js';
let content = fs.readFileSync(botApiPath, 'utf8');

// Fix the arrow function syntax - add missing =>
content = content.replace(
  /const getMarketAnalysis = async \(\{/g,
  'const getMarketAnalysis = async ({'
);

content = content.replace(
  /} = {}\) \{/g,
  '} = {}) => {'
);

content = content.replace(
  /} = {}\) \{\s*$/gm,
  '} = {}) => {'
);

// More specific fix for the pattern we see
content = content.replace(
  /const getMarketAnalysis = async \(\{[\s\S]*?\} = \{\}\) \{/,
  (match) => {
    return match.replace(/\} = \{\}\) \{/, '} = {}) => {');
  }
);

content = content.replace(
  /const getMarketCandles = async \(\{[\s\S]*?\} = \{\}\) \{/,
  (match) => {
    return match.replace(/\} = \{\}\) \{/, '} = {}) => {');
  }
);

fs.writeFileSync(botApiPath, content);
console.log('✅ Fixed arrow function syntax');
