const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Listen on all interfaces
const port = 3001;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Try to use a simple self-signed cert approach
const certDir = path.join(__dirname, '..', 'certs');
const keyPath = path.join(certDir, 'localhost-key.pem');
const certPath = path.join(certDir, 'localhost.pem');

// Check if certificates exist, if not, generate them
if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.log('📜 Generating self-signed certificates...');
  
  try {
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, { 
      days: 365,
      keySize: 2048,
      algorithm: 'sha256',
      extensions: [{
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 2, value: '*.local' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '192.168.0.48' }
        ]
      }]
    });

    fs.writeFileSync(keyPath, pems.private);
    fs.writeFileSync(certPath, pems.cert);
    console.log('✅ Certificates generated successfully!');
  } catch (err) {
    console.error('❌ Failed to generate certificates:', err.message);
    console.error('Please run: npm install --save-dev selfsigned');
    process.exit(1);
  }
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log('');
    console.log('🚀 HTTPS Server Ready!');
    console.log(`   Local:  https://localhost:${port}`);
    console.log(`   Network: https://192.168.0.48:${port}`);
    console.log('');
    console.log('📱 Access from your phone:');
    console.log(`   https://192.168.0.48:${port}`);
    console.log('');
    console.log('⚠️  You may need to accept the self-signed certificate warning on your phone');
    console.log('   (This is safe for local development)');
  });
});
