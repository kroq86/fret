/// <reference types="electron" />

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow: Electron.BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 1080,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
  });

  if (!mainWindow) {
    console.error('Failed to create main window');
    return;
  }

  // Load the HTML file
  const htmlPath = path.join(__dirname, 'index.html');
  
  // Check if the file exists
  if (fs.existsSync(htmlPath)) {
    mainWindow.loadFile(htmlPath);
    console.log(`Loading HTML from: ${htmlPath}`);
  } else {
    console.error(`HTML file not found at: ${htmlPath}`);
    // Try to find index.html in other locations
    const alternativePaths = [
      path.join(app.getAppPath(), 'dist', 'index.html'),
      path.join(app.getAppPath(), 'index.html')
    ];
    
    for (const altPath of alternativePaths) {
      if (fs.existsSync(altPath)) {
        console.log(`Found HTML at alternative path: ${altPath}`);
        mainWindow.loadFile(altPath);
        break;
      }
    }
  }

  // Open DevTools in development
  //mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
}); 