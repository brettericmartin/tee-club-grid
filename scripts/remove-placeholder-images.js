import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function removeAllPlaceholders() {
  console.log('🧹 Removing all placeholder.svg references...\n');
  
  const filesToUpdate = [
    '/src/components/bag/BagPreview.tsx',
    '/src/components/bag/EquipmentEditor.tsx',
    '/src/pages/MyBagSupabase.tsx',
    '/src/pages/Index.tsx',
    '/src/pages/admin/SeedEquipment.tsx',
    '/src/services/equipment-import.ts'
  ];
  
  let updatedCount = 0;
  
  for (const file of filesToUpdate) {
    const filePath = path.join(path.dirname(__dirname), file);
    
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      const originalContent = content;
      
      // Replace placeholder.svg with null or empty string in various contexts
      content = content.replace(
        /src=\{([^}]*)\s*\|\|\s*['"]\/placeholder\.svg['"]\}/g,
        'src={$1}'
      );
      
      // Replace cases where placeholder.svg is the only source
      content = content.replace(
        /src=['"]\/placeholder\.svg['"]/g,
        'src=""'
      );
      
      // For equipment-import.ts, replace the default image_url
      if (file.includes('equipment-import.ts')) {
        content = content.replace(
          /image_url:\s*['"]\/placeholder\.svg['"]/g,
          'image_url: null'
        );
      }
      
      if (content !== originalContent) {
        await fs.writeFile(filePath, content);
        console.log(`✅ Updated: ${file}`);
        updatedCount++;
      } else {
        console.log(`⏭️  No changes needed: ${file}`);
      }
      
    } catch (error) {
      console.error(`❌ Error updating ${file}:`, error.message);
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} files`);
  console.log('ℹ️  Components will now show brand initials instead of placeholder images');
}

removeAllPlaceholders().catch(console.error);