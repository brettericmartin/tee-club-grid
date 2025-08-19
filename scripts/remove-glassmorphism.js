#!/usr/bin/env node

/**
 * Script to remove all glassmorphism effects and replace with solid colors
 * This improves performance especially on mobile devices
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Map of glassmorphism patterns to solid color replacements
const replacements = [
  // Backdrop blur removals
  { pattern: /backdrop-blur-\[[\d]+px\]/g, replacement: '' },
  { pattern: /backdrop-blur-sm/g, replacement: '' },
  { pattern: /backdrop-blur-md/g, replacement: '' },
  { pattern: /backdrop-blur-lg/g, replacement: '' },
  { pattern: /backdrop-blur-xl/g, replacement: '' },
  { pattern: /backdrop-blur/g, replacement: '' },
  
  // Transparent backgrounds to solid
  { pattern: /bg-white\/5(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  { pattern: /bg-white\/10(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  { pattern: /bg-white\/20(?!\d)/g, replacement: 'bg-[#3a3a3a]' },
  { pattern: /bg-white\/30(?!\d)/g, replacement: 'bg-[#3a3a3a]' },
  
  { pattern: /bg-black\/20(?!\d)/g, replacement: 'bg-[#1a1a1a]' },
  { pattern: /bg-black\/30(?!\d)/g, replacement: 'bg-[#1a1a1a]' },
  { pattern: /bg-black\/40(?!\d)/g, replacement: 'bg-[#1a1a1a]' },
  { pattern: /bg-black\/50(?!\d)/g, replacement: 'bg-[#1a1a1a]' },
  { pattern: /bg-black\/60(?!\d)/g, replacement: 'bg-[#1a1a1a]' },
  { pattern: /bg-black\/80(?!\d)/g, replacement: 'bg-[#111111]' },
  { pattern: /bg-black\/90(?!\d)/g, replacement: 'bg-[#0a0a0a]' },
  { pattern: /bg-black\/95(?!\d)/g, replacement: 'bg-[#0a0a0a]' },
  
  { pattern: /bg-background\/50(?!\d)/g, replacement: 'bg-[#1a1a1a]' },
  { pattern: /bg-background\/80(?!\d)/g, replacement: 'bg-[#1a1a1a]' },
  { pattern: /bg-background\/10(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  { pattern: /bg-background\/20(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  
  // Emerald transparencies
  { pattern: /bg-emerald-950\/30(?!\d)/g, replacement: 'bg-[#1a1a1a]' },
  { pattern: /bg-emerald-950\/80(?!\d)/g, replacement: 'bg-[#1a1a1a]' },
  { pattern: /bg-emerald-950\/95(?!\d)/g, replacement: 'bg-[#0a0a0a]' },
  { pattern: /bg-emerald-900\/30(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  { pattern: /bg-emerald-500\/10(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  { pattern: /bg-emerald-500\/20(?!\d)/g, replacement: 'bg-[#3a3a3a]' },
  { pattern: /bg-emerald-600\/5(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  
  // Gray transparencies
  { pattern: /bg-gray-900\/90(?!\d)/g, replacement: 'bg-[#1a1a1a]' },
  
  // Accent/primary transparencies
  { pattern: /bg-accent\/20(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  { pattern: /bg-primary\/10(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  { pattern: /bg-primary\/20(?!\d)/g, replacement: 'bg-[#3a3a3a]' },
  
  // Blue transparencies
  { pattern: /bg-blue-500\/10(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  { pattern: /bg-blue-500\/20(?!\d)/g, replacement: 'bg-[#3a3a3a]' },
  { pattern: /bg-blue-600\/5(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  
  // Purple transparencies
  { pattern: /bg-purple-500\/10(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  { pattern: /bg-purple-600\/5(?!\d)/g, replacement: 'bg-[#2a2a2a]' },
  
  // Hover states
  { pattern: /hover:bg-white\/10(?!\d)/g, replacement: 'hover:bg-[#3a3a3a]' },
  { pattern: /hover:bg-white\/20(?!\d)/g, replacement: 'hover:bg-[#4a4a4a]' },
  { pattern: /hover:bg-white\/30(?!\d)/g, replacement: 'hover:bg-[#4a4a4a]' },
  { pattern: /hover:bg-black\/60(?!\d)/g, replacement: 'hover:bg-[#2a2a2a]' },
  { pattern: /hover:bg-black\/80(?!\d)/g, replacement: 'hover:bg-[#1a1a1a]' },
  { pattern: /hover:bg-emerald-500\/20(?!\d)/g, replacement: 'hover:bg-[#3a3a3a]' },
  { pattern: /hover:bg-blue-500\/20(?!\d)/g, replacement: 'hover:bg-[#3a3a3a]' },
  { pattern: /hover:bg-purple-500\/20(?!\d)/g, replacement: 'hover:bg-[#3a3a3a]' },
  { pattern: /hover:bg-emerald-800\/30(?!\d)/g, replacement: 'hover:bg-[#2a2a2a]' },
  
  // Border colors
  { pattern: /border-emerald-500\/20(?!\d)/g, replacement: 'border-white/10' },
  { pattern: /border-emerald-500\/30(?!\d)/g, replacement: 'border-white/10' },
  { pattern: /border-emerald-800\/30(?!\d)/g, replacement: 'border-white/10' },
  
  // Gradient transparencies (convert to solid)
  { pattern: /from-emerald-500\/10(?!\d)/g, replacement: 'from-[#2a2a2a]' },
  { pattern: /to-emerald-600\/5(?!\d)/g, replacement: 'to-[#2a2a2a]' },
  { pattern: /from-blue-500\/10(?!\d)/g, replacement: 'from-[#2a2a2a]' },
  { pattern: /to-blue-600\/5(?!\d)/g, replacement: 'to-[#2a2a2a]' },
  { pattern: /from-purple-500\/10(?!\d)/g, replacement: 'from-[#2a2a2a]' },
  { pattern: /to-purple-600\/5(?!\d)/g, replacement: 'to-[#2a2a2a]' },
  
  // Shadow removals (performance)
  { pattern: /shadow-emerald-500\/25(?!\d)/g, replacement: '' },
];

// Files to exclude from processing (navigation components keep glassmorphism)
const excludeFiles = [
  'Navigation.tsx',
  'BottomNavigation.tsx',
  'navigation/',
];

function shouldProcessFile(filePath) {
  const fileName = path.basename(filePath);
  for (const exclude of excludeFiles) {
    if (filePath.includes(exclude) || fileName === exclude) {
      return false;
    }
  }
  return true;
}

function processFile(filePath) {
  if (!shouldProcessFile(filePath)) {
    console.log(`⏭️  Skipping (navigation): ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const { pattern, replacement } of replacements) {
    const before = content;
    content = content.replace(pattern, replacement);
    if (before !== content) {
      modified = true;
    }
  }
  
  // Clean up double spaces that might result from replacements
  content = content.replace(/\s+className="/g, ' className="');
  content = content.replace(/"\s+>/g, '">');
  content = content.replace(/\s{2,}/g, ' ');
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  }
}

function findFiles(dir, extensions = ['.tsx', '.jsx']) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      files.push(...findFiles(fullPath, extensions));
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function main() {
  console.log('🎨 Removing glassmorphism effects and replacing with solid colors...\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = findFiles(srcDir);
  
  console.log(`Found ${files.length} files to process\n`);
  
  let updatedCount = 0;
  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8');
    processFile(file);
    const after = fs.readFileSync(file, 'utf8');
    if (before !== after) {
      updatedCount++;
    }
  }
  
  console.log(`\n✨ Complete! Updated ${updatedCount} files`);
  console.log('🚀 Performance improvements applied:');
  console.log('  - Removed all backdrop-filter effects');
  console.log('  - Replaced transparent backgrounds with solid colors');
  console.log('  - Maintained visual hierarchy with solid color scheme');
  console.log('  - Navigation components preserved with glassmorphism');
}

main();