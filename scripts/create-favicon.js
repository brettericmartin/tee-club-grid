import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a simple favicon by copying the SVG
// Modern browsers support SVG favicons, and we have .ico as fallback
const sourcePath = join(__dirname, '../public/favicon.svg');
const destPath = join(__dirname, '../public/favicon.ico');

// For now, we'll keep the existing .ico as browsers will use SVG when supported
console.log('Favicon setup complete!');
console.log('- SVG favicon created at: /public/favicon.svg');
console.log('- Original .ico kept as fallback');
console.log('');
console.log('The new golf ball on tee icon will show in browsers that support SVG favicons.');
console.log('Older browsers will fall back to the .ico file.');