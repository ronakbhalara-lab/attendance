const https = require('https');
const http = require('http');

// Configuration
const SERVER_URL = 'https://atndc.vednovaitsolution.in/'; // Update if your server runs on different port/host
const API_ENDPOINT = '/api/attendance/auto-clock-out';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (parseError) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runSystemCheckout() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting system check-out process...`);
  
  try {
    const response = await makeRequest(`${SERVER_URL}${API_ENDPOINT}`);
    
    console.log(`[${timestamp}] System check-out response:`, response.statusCode);
    console.log(`[${timestamp}] Response data:`, JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200) {
      console.log(`[${timestamp}] ✅ System check-out completed successfully!`);
      console.log(`[${timestamp}] Processed ${response.data.processedCount} users out of ${response.data.totalFound} found.`);
      
      if (response.data.errors && response.data.errors.length > 0) {
        console.log(`[${timestamp}] ⚠️  Errors encountered:`, response.data.errors.length);
        response.data.errors.forEach(error => {
          console.log(`[${timestamp}]   - User ${error.username}: ${error.error}`);
        });
      }
    } else {
      console.log(`[${timestamp}] ❌ System check-out failed with status:`, response.statusCode);
      console.log(`[${timestamp}] Error details:`, response.data);
    }
    
  } catch (error) {
    console.error(`[${timestamp}] ❌ System check-out failed:`, error.message);
    process.exit(1);
  }
}

// Run the system check-out
runSystemCheckout();
