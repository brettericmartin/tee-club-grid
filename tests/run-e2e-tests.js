#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const config = {
  testUrl: process.env.TEST_URL || 'http://localhost:3334',
  headless: process.env.HEADLESS !== 'false',
  slowMo: process.env.SLOW_MO || '0',
  testUserEmail: process.env.TEST_USER_EMAIL || 'test@example.com',
  testUserPassword: process.env.TEST_USER_PASSWORD || 'testpassword123'
};

console.log('🧪 Running AI Equipment Flow E2E Tests');
console.log('Configuration:', {
  url: config.testUrl,
  headless: config.headless,
  slowMo: config.slowMo
});

// Run the tests
const testProcess = spawn('node', [
  '--experimental-modules',
  join(__dirname, 'e2e', 'ai-equipment-flow.test.js')
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    TEST_URL: config.testUrl,
    HEADLESS: config.headless.toString(),
    SLOW_MO: config.slowMo,
    TEST_USER_EMAIL: config.testUserEmail,
    TEST_USER_PASSWORD: config.testUserPassword
  }
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log(`❌ Tests failed with code ${code}`);
    process.exit(code);
  }
});