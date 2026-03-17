const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const FILE_PATH = '/tmp/cc-agent/64501807/project-export.zip';

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);

  if (req.url === '/project-export.zip' || req.url === '/download') {
    const stat = fs.statSync(FILE_PATH);

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="project-export.zip"'
    });

    const readStream = fs.createReadStream(FILE_PATH);
    readStream.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head><title>Download Project</title></head>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h1>Project Export Ready</h1>
          <p>Click the button below to download your project:</p>
          <a href="/download" style="display: inline-block; padding: 15px 30px; background: #0070f3; color: white; text-decoration: none; border-radius: 5px; font-size: 18px;">
            Download project-export.zip (180KB)
          </a>
        </body>
      </html>
    `);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==============================================`);
  console.log(`Download server running!`);
  console.log(`==============================================`);
  console.log(`\nAccess the download page at:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`\nDirect download link:`);
  console.log(`  http://localhost:${PORT}/download`);
  console.log(`\nPress Ctrl+C to stop the server\n`);
});
