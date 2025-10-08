// This is a simple script that transpiles our TypeScript files
// and runs the Electron app in development mode

const { spawn } = require('child_process');
const path = require('path');

// First, run webpack to build the app
console.log('Building app...');
const webpack = spawn('npx', ['webpack', '--config', 'webpack.config.js', '--mode', 'development'], { 
  shell: true,
  stdio: 'inherit'
});

webpack.on('close', (code) => {
  if (code !== 0) {
    console.error(`Webpack build failed with code ${code}`);
    process.exit(code);
  }
  
  console.log('Webpack build completed. Starting Electron...');
  
  // Then start Electron
  const electron = spawn('npx', ['electron', '.'], { 
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });
  
  electron.on('close', (code) => {
    if (code !== 0) {
      console.error(`Electron exited with code ${code}`);
    }
    process.exit(code);
  });
}); 