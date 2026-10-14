const fs = require('fs');
const home = fs.readFileSync('src/pages/Home.jsx', 'utf8');
const demo = fs.readFileSync('src/pages/TradeDemo.jsx', 'utf8');
const component = fs.readFileSync('src/components/demo/MultiServiceDemo.jsx', 'utf8');
const required = [
  [home.includes('MultiServiceDemo'), 'homepage interactive preview'],
  [home.includes('preview'), 'preview mode'],
  [home.includes('to="/trade-demo"'), 'full demo link'],
  [demo.includes('MultiServiceDemo'), 'full interactive demo'],
  [['Spot','DEX','Stocks','Futures','Options'].every(x => component.includes(x + ':')), 'five services'],
  [component.includes('Place simulated'), 'simulated trade controls']
];
const missing = required.filter(([ok]) => !ok).map(([,name]) => name);
if (missing.length) {
  console.error('IMALI DEMO PROTECTION: refusing deployment; missing ' + missing.join(', '));
  process.exit(1);
}
console.log('IMALI homepage demo and five-service simulator verified.');
