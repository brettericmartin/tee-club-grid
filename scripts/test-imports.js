// Test if we can parse the BagsBrowser file
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const bagsBrowserPath = join(__dirname, '../src/pages/BagsBrowser.tsx');
  const content = fs.readFileSync(bagsBrowserPath, 'utf8');
  
  // Check for common syntax errors
  const issues = [];
  
  // Check for unclosed brackets
  const openBrackets = (content.match(/\{/g) || []).length;
  const closeBrackets = (content.match(/\}/g) || []).length;
  if (openBrackets !== closeBrackets) {
    issues.push(`Mismatched brackets: ${openBrackets} open, ${closeBrackets} close`);
  }
  
  // Check for unclosed parentheses
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push(`Mismatched parentheses: ${openParens} open, ${closeParens} close`);
  }
  
  // Check imports
  const imports = content.match(/import .* from .*/g) || [];
  console.log(`Found ${imports.length} imports`);
  
  // Look for any obvious syntax errors
  if (content.includes('export default default')) {
    issues.push('Double default export found');
  }
  
  if (issues.length > 0) {
    console.log('Found issues:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log('No obvious syntax errors found');
  }
  
  // Check if the file ends with an export
  const lastLines = content.split('\n').slice(-5).join('\n');
  console.log('\nLast 5 lines of file:');
  console.log(lastLines);
  
} catch (error) {
  console.error('Error reading file:', error);
}