const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create scripts directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, '..'))) {
  fs.mkdirSync(path.join(__dirname, '..'));
}

// Create dist directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, '..', 'dist'))) {
  fs.mkdirSync(path.join(__dirname, '..', 'dist'));
}

// Compile main process with tsc
console.log('Compiling main process...');
try {
  execSync('npx tsc --project tsconfig.main.json', { stdio: 'inherit' });
  console.log('Main process compiled successfully');
} catch (error) {
  console.error('Error compiling main process:', error);
  process.exit(1);
} 