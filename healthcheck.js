#!/usr/bin/env node

/**
 * Health Check Script
 * Used by Docker, Kubernetes, or monitoring systems to check application health
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const TIMEOUT = parseInt(process.env.HEALTHCHECK_TIMEOUT) || 5000;

const options = {
  host: HOST,
  port: PORT,
  path: '/api/health',
  timeout: TIMEOUT,
  method: 'GET'
};

const healthCheck = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200 && response.status === 'ok') {
        console.log('✅ Health check passed');
        console.log(`Active requests: ${response.activeRequests || 0}`);
        process.exit(0);
      } else {
        console.error('❌ Health check failed - Invalid response');
        console.error('Response:', response);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Health check failed - Invalid JSON');
      console.error('Error:', error.message);
      console.error('Data:', data);
      process.exit(1);
    }
  });
});

healthCheck.on('error', (error) => {
  console.error('❌ Health check failed - Request error');
  console.error('Error:', error.message);
  process.exit(1);
});

healthCheck.on('timeout', () => {
  console.error('❌ Health check failed - Timeout');
  healthCheck.destroy();
  process.exit(1);
});

healthCheck.end();
