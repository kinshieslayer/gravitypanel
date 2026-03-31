const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess = null;
const isDev = !app.isPackaged;

function startBackend() {
  if (isDev) {
    // In dev, we assumed the user runs the backend manually via 'python main.py'
    // or we can spawn it here. Let's just assume manual for dev or add spawn if needed.
    return;
  }

  // In production, the backend exe is in the 'resources' folder via extraResources
  const backendPath = path.join(process.resourcesPath, 'gravitypanel-backend.exe');
  
  backendProcess = spawn(backendPath, [], {
    stdio: 'ignore',
    windowsHide: true,
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'GravityPanel',
    backgroundColor: '#090c10',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    frame: true,
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
