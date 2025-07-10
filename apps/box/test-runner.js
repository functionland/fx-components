#!/usr/bin/env node

/**
 * Comprehensive test runner for the Box React Native app
 * This script runs all tests and provides detailed reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Comprehensive Test Suite for Box App\n');

// Test configuration
const testConfig = {
  // Test files to run
  testFiles: [
    'src/__tests__/contractIntegration.test.ts',
    'src/__tests__/hooks.test.tsx',
    'src/__tests__/components.test.tsx',
    'src/__tests__/integration.test.tsx',
  ],
  
  // Coverage thresholds
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function logSection(title) {
  console.log(`\n${colorize('='.repeat(60), 'cyan')}`);
  console.log(`${colorize(title, 'bright')}`);
  console.log(`${colorize('='.repeat(60), 'cyan')}\n`);
}

function logSuccess(message) {
  console.log(`${colorize('✅', 'green')} ${message}`);
}

function logError(message) {
  console.log(`${colorize('❌', 'red')} ${message}`);
}

function logWarning(message) {
  console.log(`${colorize('⚠️', 'yellow')} ${message}`);
}

function logInfo(message) {
  console.log(`${colorize('ℹ️', 'blue')} ${message}`);
}

// Check if required files exist
function checkTestFiles() {
  logSection('Checking Test Files');
  
  let allFilesExist = true;
  
  testConfig.testFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      logSuccess(`${file}`);
    } else {
      logError(`${file} - NOT FOUND`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

// Check if Jest is configured
function checkJestConfig() {
  logSection('Checking Jest Configuration');
  
  const jestConfigPath = path.join(__dirname, 'jest.config.js');
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  if (fs.existsSync(jestConfigPath)) {
    logSuccess('jest.config.js found');
  } else {
    logWarning('jest.config.js not found, using default configuration');
  }
  
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.devDependencies && packageJson.devDependencies.jest) {
      logSuccess('Jest dependency found in package.json');
    } else {
      logWarning('Jest not found in package.json devDependencies');
    }
  }
  
  return true;
}

// Run individual test file
function runTestFile(testFile) {
  try {
    console.log(`\n${colorize(`Running ${testFile}...`, 'blue')}`);
    
    const command = `npx jest ${testFile} --verbose --no-cache`;
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: __dirname 
    });
    
    console.log(output);
    logSuccess(`${testFile} passed`);
    return true;
  } catch (error) {
    logError(`${testFile} failed`);
    console.log(error.stdout || error.message);
    return false;
  }
}

// Run all tests
function runAllTests() {
  logSection('Running All Tests');
  
  let passedTests = 0;
  let totalTests = testConfig.testFiles.length;
  
  testConfig.testFiles.forEach(testFile => {
    if (runTestFile(testFile)) {
      passedTests++;
    }
  });
  
  return { passedTests, totalTests };
}

// Run tests with coverage
function runCoverageTests() {
  logSection('Running Tests with Coverage');
  
  try {
    const command = 'npx jest --coverage --verbose --no-cache';
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: __dirname 
    });
    
    console.log(output);
    logSuccess('Coverage tests completed');
    return true;
  } catch (error) {
    logError('Coverage tests failed');
    console.log(error.stdout || error.message);
    return false;
  }
}

// Validate contract integration
function validateContractIntegration() {
  logSection('Validating Contract Integration');
  
  const filesToCheck = [
    'src/contracts/types.ts',
    'src/contracts/abis.ts',
    'src/contracts/config.ts',
    'src/contracts/contractService.ts',
    'src/hooks/useContractIntegration.ts',
    'src/hooks/usePools.ts',
    'src/hooks/useRewards.ts',
  ];
  
  let allValid = true;
  
  filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      logSuccess(`${file}`);
    } else {
      logError(`${file} - NOT FOUND`);
      allValid = false;
    }
  });
  
  return allValid;
}

// Generate test report
function generateTestReport(results) {
  logSection('Test Report');
  
  const { passedTests, totalTests } = results;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log(`${colorize('Total Tests:', 'bright')} ${totalTests}`);
  console.log(`${colorize('Passed:', 'green')} ${passedTests}`);
  console.log(`${colorize('Failed:', 'red')} ${totalTests - passedTests}`);
  console.log(`${colorize('Success Rate:', 'bright')} ${successRate}%`);
  
  if (passedTests === totalTests) {
    logSuccess('All tests passed! 🎉');
  } else {
    logWarning(`${totalTests - passedTests} test(s) failed`);
  }
  
  // Check if coverage report exists
  const coverageDir = path.join(__dirname, 'coverage');
  if (fs.existsSync(coverageDir)) {
    logInfo('Coverage report generated in ./coverage directory');
  }
}

// Main execution
async function main() {
  try {
    // Check prerequisites
    if (!checkTestFiles()) {
      logError('Some test files are missing. Please ensure all test files exist.');
      process.exit(1);
    }
    
    checkJestConfig();
    
    if (!validateContractIntegration()) {
      logError('Contract integration files are missing. Please ensure all contract files exist.');
      process.exit(1);
    }
    
    // Run tests
    const results = runAllTests();
    
    // Run coverage if all tests pass
    if (results.passedTests === results.totalTests) {
      runCoverageTests();
    }
    
    // Generate report
    generateTestReport(results);
    
    // Exit with appropriate code
    process.exit(results.passedTests === results.totalTests ? 0 : 1);
    
  } catch (error) {
    logError(`Test runner failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${colorize('Box App Test Runner', 'bright')}

Usage: node test-runner.js [options]

Options:
  --help, -h     Show this help message
  --coverage     Run tests with coverage only
  --validate     Validate contract integration only
  --file <name>  Run specific test file

Examples:
  node test-runner.js                           # Run all tests
  node test-runner.js --coverage                # Run coverage tests only
  node test-runner.js --validate                # Validate integration only
  node test-runner.js --file hooks.test.tsx     # Run specific test file
`);
  process.exit(0);
}

if (args.includes('--coverage')) {
  logSection('Running Coverage Tests Only');
  runCoverageTests();
  process.exit(0);
}

if (args.includes('--validate')) {
  logSection('Validating Contract Integration Only');
  const isValid = validateContractIntegration();
  process.exit(isValid ? 0 : 1);
}

const fileIndex = args.indexOf('--file');
if (fileIndex !== -1 && args[fileIndex + 1]) {
  const testFile = args[fileIndex + 1];
  logSection(`Running Specific Test File: ${testFile}`);
  const success = runTestFile(`src/__tests__/${testFile}`);
  process.exit(success ? 0 : 1);
}

// Run main function
main();
