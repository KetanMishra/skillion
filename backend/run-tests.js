#!/usr/bin/env node

/**
 * Test Runner Script for HelpDesk Mini
 * Runs all tests with proper setup and teardown
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting HelpDesk Mini Test Suite...\n');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';

const testCommands = [
  {
    name: 'Unit Tests - Models',
    command: 'npx jest tests/unit --testPathPattern=models --verbose',
    description: 'Testing database models and validation'
  },
  {
    name: 'Unit Tests - Middleware',
    command: 'npx jest tests/unit --testPathPattern=middleware --verbose',
    description: 'Testing authentication and authorization middleware'
  },
  {
    name: 'Integration Tests - Authentication',
    command: 'npx jest tests/integration/auth.test.js --verbose',
    description: 'Testing authentication endpoints'
  },
  {
    name: 'Integration Tests - Tickets',
    command: 'npx jest tests/integration/tickets.test.js --verbose',
    description: 'Testing ticket CRUD operations'
  },
  {
    name: 'Integration Tests - Comments',
    command: 'npx jest tests/integration/comments.test.js --verbose',
    description: 'Testing comment functionality'
  },
  {
    name: 'Integration Tests - Health Check',
    command: 'npx jest tests/integration/health.test.js --verbose',
    description: 'Testing server health endpoint'
  },
  {
    name: 'End-to-End Tests',
    command: 'npx jest tests/e2e --verbose',
    description: 'Testing complete user workflows'
  }
];

async function runTests() {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const test of testCommands) {
    console.log(`\n📋 ${test.name}`);
    console.log(`📄 ${test.description}`);
    console.log('─'.repeat(50));

    try {
      const result = execSync(test.command, { 
        cwd: __dirname,
        stdio: 'inherit',
        encoding: 'utf8'
      });
      
      console.log(`✅ ${test.name} - PASSED\n`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${test.name} - FAILED\n`);
      failedTests++;
    }
    totalTests++;
  }

  // Run coverage report
  console.log('\n📊 Generating Test Coverage Report...');
  console.log('─'.repeat(50));
  
  try {
    execSync('npx jest --coverage --silent', {
      cwd: __dirname,
      stdio: 'inherit'
    });
  } catch (error) {
    console.log('⚠️  Coverage report generation failed');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎯 TEST SUITE SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Test Suites: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Your HelpDesk Mini application is working correctly.');
  } else {
    console.log(`\n⚠️  ${failedTests} test suite(s) failed. Please check the output above for details.`);
  }

  console.log('\n📁 Test artifacts saved to:');
  console.log('   - Coverage report: coverage/lcov-report/index.html');
  console.log('   - Test results: Available in terminal output');
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// Handle process interruption
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test execution interrupted by user');
  process.exit(1);
});

// Run the tests
runTests().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});