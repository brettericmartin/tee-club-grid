#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'glob';
const { glob } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

console.log('🔍 Dynamic Import Diagnostic Tool for Teed.club\n');
console.log('=' .repeat(60));

// Configuration
const componentPaths = [
  'src/components/equipment/EquipmentSelectorImproved.tsx',
  'src/components/equipment/AddEquipmentMethodDialog.tsx',
  'src/components/equipment/AIEquipmentAnalyzer.tsx',
  'src/components/equipment/AIAnalysisResultsDialog.tsx',
  'src/components/bag/BagGalleryDndKit.tsx',
  'src/components/bag/EquipmentEditor.tsx'
];

const issues = [];
const warnings = [];
const suggestions = [];

// Check 1: File existence
console.log('\n1. Checking component file existence...');
for (const filePath of componentPaths) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    issues.push(`❌ Missing file: ${filePath}`);
  } else {
    console.log(`  ✅ Found: ${filePath}`);
  }
}

// Check 2: Export analysis
console.log('\n2. Analyzing component exports...');
for (const filePath of componentPaths) {
  const fullPath = path.join(projectRoot, filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // Check for default export
    const hasDefaultExport = /export\s+default\s+|export\s+\{[^}]*as\s+default/m.test(content);
    if (!hasDefaultExport) {
      issues.push(`❌ No default export in: ${filePath}`);
    } else {
      console.log(`  ✅ Default export found: ${filePath}`);
    }
    
    // Check for problematic patterns
    if (/export\s+\*\s+from/.test(content)) {
      warnings.push(`⚠️  Re-export pattern in ${filePath} might cause issues`);
    }
    
    // Check for React.forwardRef issues
    if (/React\.forwardRef/.test(content) && !/import\s+.*React/.test(content)) {
      warnings.push(`⚠️  React.forwardRef used without React import in ${filePath}`);
    }
  }
}

// Check 3: Lazy loading patterns
console.log('\n3. Checking lazy loading implementations...');
const lazyFiles = glob.sync('src/**/*.{tsx,ts}', { cwd: projectRoot });

for (const file of lazyFiles) {
  const fullPath = path.join(projectRoot, file);
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  // Find lazy imports
  const lazyImports = content.match(/lazy\(\s*\(\)\s*=>\s*import\([^)]+\)\s*\)/g) || [];
  
  for (const lazyImport of lazyImports) {
    // Check if lazy is imported from React
    if (!content.includes("import { lazy") && !content.includes("import {lazy") && 
        !content.includes("import React") && !content.includes("React.lazy")) {
      issues.push(`❌ Lazy used without proper import in ${file}`);
    }
    
    // Check for Suspense wrapper
    if (lazyImports.length > 0 && !content.includes('Suspense')) {
      warnings.push(`⚠️  Lazy components without Suspense in ${file}`);
    }
  }
}

// Check 4: Vite-specific issues
console.log('\n4. Checking for Vite-specific issues...');

// Check package.json for type module
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
if (packageJson.type !== 'module') {
  suggestions.push('📝 Consider adding "type": "module" to package.json');
}

// Check 5: Import path analysis
console.log('\n5. Analyzing import paths...');
for (const filePath of componentPaths) {
  const fullPath = path.join(projectRoot, filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // Check for problematic imports
    const imports = content.match(/import[^;]+from\s+['"][^'"]+['"]/g) || [];
    
    for (const imp of imports) {
      // Check for circular imports back to pages
      if (imp.includes('/pages/')) {
        issues.push(`❌ Component imports from pages directory: ${filePath}`);
      }
      
      // Check for missing extensions in relative imports
      if (imp.includes('./') && !imp.includes('.tsx') && !imp.includes('.ts') && 
          !imp.includes('.css') && !imp.includes('.json')) {
        // This is okay for Vite, but could be an issue
      }
    }
  }
}

// Check 6: Common HMR issues
console.log('\n6. Checking for HMR (Hot Module Replacement) issues...');

// Look for components with useEffect that might not clean up properly
for (const filePath of componentPaths) {
  const fullPath = path.join(projectRoot, filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    if (content.includes('useEffect') && !content.includes('return () =>')) {
      warnings.push(`⚠️  useEffect without cleanup in ${filePath} might cause HMR issues`);
    }
  }
}

// Generate Solutions
console.log('\n' + '='.repeat(60));
console.log('📊 DIAGNOSTIC RESULTS\n');

if (issues.length === 0) {
  console.log('✅ No critical issues found!');
} else {
  console.log(`❌ Found ${issues.length} critical issues:`);
  issues.forEach(issue => console.log(`  ${issue}`));
}

if (warnings.length > 0) {
  console.log(`\n⚠️  Found ${warnings.length} warnings:`);
  warnings.forEach(warning => console.log(`  ${warning}`));
}

if (suggestions.length > 0) {
  console.log(`\n📝 Suggestions:`);
  suggestions.forEach(suggestion => console.log(`  ${suggestion}`));
}

// Provide solutions
console.log('\n' + '='.repeat(60));
console.log('🔧 RECOMMENDED SOLUTIONS\n');

console.log('1. Add retry logic for dynamic imports:');
console.log(`   const retryDynamicImport = (fn, retriesLeft = 3, interval = 500) => {
     return new Promise((resolve, reject) => {
       fn()
         .then(resolve)
         .catch((error) => {
           if (retriesLeft === 0) {
             reject(error);
             return;
           }
           setTimeout(() => {
             retryDynamicImport(fn, retriesLeft - 1, interval).then(resolve, reject);
           }, interval);
         });
     });
   };`);

console.log('\n2. Update Vite config to handle dynamic imports better:');
console.log(`   optimizeDeps: {
     include: [/* your deps */],
     exclude: ['@dnd-kit/sortable'],
     force: true, // Force re-optimization in development
   }`);

console.log('\n3. Add error boundaries around lazy components:');
console.log(`   <ErrorBoundary fallback={<div>Loading failed. Please refresh.</div>}>
     <Suspense fallback={<div>Loading...</div>}>
       <LazyComponent />
     </Suspense>
   </ErrorBoundary>`);

console.log('\n4. Consider preloading critical components:');
console.log(`   // Preload on mount or route change
   useEffect(() => {
     import('@/components/equipment/EquipmentSelectorImproved');
   }, []);`);

console.log('\n' + '='.repeat(60));
console.log('✨ Diagnostic complete!\n');

// Export results for CI/CD integration
const results = {
  timestamp: new Date().toISOString(),
  issues: issues.length,
  warnings: warnings.length,
  suggestions: suggestions.length,
  details: { issues, warnings, suggestions }
};

fs.writeFileSync(
  path.join(projectRoot, 'dynamic-import-diagnostic.json'),
  JSON.stringify(results, null, 2)
);

console.log('Results saved to dynamic-import-diagnostic.json');

// Exit with error code if critical issues found
if (issues.length > 0) {
  process.exit(1);
}