# Test from server
curl http://localhost:3001/api/trades | jq '.[0]'

# Test from browser
# Open browser console and run:
fetch('http://localhost:3001/api/trades').then(r => r.json()).then(console.log)