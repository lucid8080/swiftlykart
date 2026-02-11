const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, '..', 'certs');
const keyPath = path.join(certDir, 'localhost-key.pem');
const certPath = path.join(certDir, 'localhost.pem');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('Certificates already exist. Skipping generation.');
  process.exit(0);
}

console.log('Generating self-signed certificate for HTTPS...');

try {
  // Generate self-signed certificate valid for 365 days
  // Includes localhost and common IP addresses
  execSync(
    `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 365 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,DNS:*.local,IP:127.0.0.1,IP:192.168.0.48"`,
    { stdio: 'inherit' }
  );
  console.log('✅ Certificates generated successfully!');
  console.log(`Key: ${keyPath}`);
  console.log(`Cert: ${certPath}`);
} catch (error) {
  console.error('❌ Failed to generate certificates. Make sure OpenSSL is installed.');
  console.error('On Windows, you can install OpenSSL via:');
  console.error('  - Chocolatey: choco install openssl');
  console.error('  - Or download from: https://slproweb.com/products/Win32OpenSSL.html');
  process.exit(1);
}
