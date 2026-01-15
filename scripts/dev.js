const { spawn } = require('child_process');
const { exec } = require('child_process');

// Start Next.js dev server
const nextDev = spawn('npx', ['next', 'dev', '-p', '4000'], {
  stdio: 'inherit',
  shell: true
});

// Wait for server to be ready, then open browser
let browserOpened = false;
const checkServer = setInterval(() => {
  const http = require('http');
  const req = http.get('http://localhost:4000', (res) => {
    if (res.statusCode === 200 && !browserOpened) {
      browserOpened = true;
      clearInterval(checkServer);
      // Open browser (works on macOS, Linux, and Windows)
      const openCommand = process.platform === 'win32' 
        ? 'start' 
        : process.platform === 'darwin' 
        ? 'open' 
        : 'xdg-open';
      exec(`${openCommand} http://localhost:4000`, (error) => {
        if (error) {
          console.error('Failed to open browser:', error);
        }
      });
    }
  });
  req.on('error', () => {
    // Server not ready yet, continue checking
  });
  req.end();
}, 1000); // Check every second

// Cleanup on exit
process.on('SIGINT', () => {
  clearInterval(checkServer);
  nextDev.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  clearInterval(checkServer);
  nextDev.kill();
  process.exit();
});
