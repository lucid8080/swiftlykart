# HTTPS Setup for Phone Testing

To test the barcode scanner on your phone, you need HTTPS. Here are the easiest options:

## Option 1: Use ngrok (Easiest - Recommended)

1. Install ngrok: https://ngrok.com/download
2. Run your dev server: `npm run dev`
3. In another terminal, run: `ngrok http 3001`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Access that URL on your phone

**Pros:** No certificate setup needed, works immediately
**Cons:** Requires internet connection, URL changes each time

## Option 2: Use mkcert (Best for Local Network)

1. Install mkcert:
   ```powershell
   # Using Chocolatey
   choco install mkcert
   
   # Or download from: https://github.com/FiloSottile/mkcert/releases
   ```

2. Install the local CA:
   ```powershell
   mkcert -install
   ```

3. Generate certificate for your IP:
   ```powershell
   mkcert 192.168.0.48 localhost 127.0.0.1
   ```
   This creates `192.168.0.48+2.pem` and `192.168.0.48+2-key.pem`

4. Copy them to the `certs` folder:
   ```powershell
   mkdir certs
   move 192.168.0.48+2.pem certs/localhost.pem
   move 192.168.0.48+2-key.pem certs/localhost-key.pem
   ```

5. Run the HTTPS dev server:
   ```powershell
   npm run dev:https
   ```

6. Access from your phone: `https://192.168.0.48:3001`
   - You may need to accept the certificate warning on your phone

## Option 3: Install OpenSSL and Use Our Script

1. Install OpenSSL:
   - Using Chocolatey: `choco install openssl`
   - Or download: https://slproweb.com/products/Win32OpenSSL.html

2. Generate certificates:
   ```powershell
   npm run generate-cert
   ```

3. Run HTTPS server:
   ```powershell
   npm run dev:https
   ```

4. Access from phone: `https://192.168.0.48:3001`

## Quick Test (Without HTTPS)

If you just want to test the app (without barcode scanning), you can:
- Access via `http://192.168.0.48:3001` on your phone
- The barcode scanner won't work, but other features will
