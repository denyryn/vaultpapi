const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const firefoxDir = path.join(__dirname, '..', 'dist-firefox');

// Remove old Firefox build
if (fs.existsSync(firefoxDir)) {
  fs.rmSync(firefoxDir, { recursive: true });
}

// Copy entire dist to dist-firefox
fs.cpSync(distDir, firefoxDir, { recursive: true });

// Replace manifest with Firefox variant
fs.copyFileSync(
  path.join(__dirname, '..', 'public', 'manifest.firefox.json'),
  path.join(firefoxDir, 'manifest.json')
);

console.log('✓ Firefox build ready in dist-firefox/');
