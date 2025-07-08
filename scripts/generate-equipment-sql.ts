import { allEquipment } from '../src/lib/equipment-database';
import { normalizeCategory } from '../src/lib/equipment-categories';
import * as fs from 'fs';

// Generate SQL INSERT statements for all equipment
function generateSQL() {
  const sqlStatements: string[] = [];
  
  // Add header
  sqlStatements.push('-- Equipment data export from hardcoded database');
  sqlStatements.push('-- Generated on ' + new Date().toISOString());
  sqlStatements.push('');
  sqlStatements.push('-- This script will only insert equipment that does not already exist');
  sqlStatements.push('-- based on brand and model combination');
  sqlStatements.push('');
  sqlStatements.push('-- Insert equipment data');
  
  for (const item of allEquipment) {
    // Normalize category
    const category = normalizeCategory(item.category);
    
    // Escape single quotes in strings
    const escape = (str: string | undefined) => {
      if (!str) return 'NULL';
      return `'${str.replace(/'/g, "''")}'`;
    };
    
    // Format specs as JSON
    const specs = item.specs ? `'${JSON.stringify(item.specs).replace(/'/g, "''")}'::jsonb` : '\'{}\'::jsonb';
    
    // Generate INSERT statement with duplicate check
    const sql = `
INSERT INTO equipment (brand, model, category, image_url, msrp, release_year, created_at)
SELECT 
  ${escape(item.brand)},
  ${escape(item.model)},
  ${escape(category)},
  ${escape(item.image)},
  ${item.msrp || 'NULL'},
  ${item.year || 'NULL'},
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM equipment 
  WHERE brand = ${escape(item.brand)} 
  AND model = ${escape(item.model)}
);`;
    
    sqlStatements.push(sql);
  }
  
  // Add footer
  sqlStatements.push('');
  sqlStatements.push(`-- Total equipment items: ${allEquipment.length}`);
  
  return sqlStatements.join('\n');
}

// Generate CSV as alternative
function generateCSV() {
  const headers = ['brand', 'model', 'category', 'image_url', 'msrp', 'release_year'];
  const rows = [headers.join(',')];
  
  for (const item of allEquipment) {
    const category = normalizeCategory(item.category);
    const row = [
      `"${item.brand}"`,
      `"${item.model}"`,
      category,
      `"${item.image || ''}"`,
      item.msrp || '',
      item.year || ''
    ];
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}

// Generate both files
const sql = generateSQL();
const csv = generateCSV();

fs.writeFileSync('equipment-import.sql', sql);
fs.writeFileSync('equipment-import.csv', csv);

console.log('Generated files:');
console.log('- equipment-import.sql (SQL INSERT statements)');
console.log('- equipment-import.csv (CSV format for import)');
console.log(`Total equipment items: ${allEquipment.length}`);