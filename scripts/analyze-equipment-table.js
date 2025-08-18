import { supabase } from './supabase-admin.js';

async function analyzeEquipmentTable() {
  console.log('=== EQUIPMENT TABLE SCHEMA ANALYSIS ===\n');
  
  try {
    // Get table schema using raw SQL
    console.log('1. TABLE STRUCTURE:');
    const { data: columns, error: schemaError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default,
          ordinal_position
        FROM information_schema.columns 
        WHERE table_name = 'equipment' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });
      
    if (schemaError) {
      console.error('Schema error:', schemaError);
      // Fallback: try direct table description
      console.log('Trying alternate schema query...');
      try {
        // Get sample row to understand structure
        const { data: sampleData, error: sampleError } = await supabase
          .from('equipment')
          .select('*')
          .limit(1);
          
        if (!sampleError && sampleData && sampleData.length > 0) {
          console.log('  Sample row structure:');
          Object.keys(sampleData[0]).forEach(key => {
            const value = sampleData[0][key];
            const type = typeof value;
            console.log(`  ${key}: ${type} (sample: ${value !== null ? String(value).substring(0, 50) : 'null'})`);
          });
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    } else if (columns && columns.length > 0) {
      columns.forEach(col => {
        const nullable = col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)';
        console.log(`  ${col.column_name}: ${col.data_type} ${nullable}`);
      });
    }
    
    // Get total count
    console.log('\n2. TOTAL EQUIPMENT COUNT:');
    const { count: totalCount, error: totalError } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true });
      
    if (totalError) {
      console.error('Total count error:', totalError);
    } else {
      console.log(`  Total: ${totalCount} items`);
    }
    
    // Get category distribution
    console.log('\n3. EQUIPMENT COUNT BY CATEGORY:');
    const { data: allEquipment, error: allError } = await supabase
      .from('equipment')
      .select('category');
      
    if (allError) {
      console.error('Category error:', allError);
      return;
    }
    
    const categoryCounts = {};
    allEquipment.forEach(item => {
      const cat = item.category || 'NULL';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    
    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    sortedCategories.forEach(([category, count]) => {
      console.log(`  ${category}: ${count} items`);
    });
    
    // Sample data by major categories
    console.log('\n4. SAMPLE DATA BY MAJOR CATEGORIES:');
    const majorCategories = ['driver', 'iron', 'putter', 'wedge', 'fairway-wood', 'hybrid'];
    
    for (const category of majorCategories) {
      console.log(`\n--- ${category.toUpperCase()} SAMPLES ---`);
      const { data: samples, error: sampleError } = await supabase
        .from('equipment')
        .select('*')
        .eq('category', category)
        .limit(5);
        
      if (sampleError) {
        console.error(`Error fetching ${category}:`, sampleError);
        continue;
      }
      
      if (samples.length === 0) {
        console.log(`  No ${category} items found`);
        continue;
      }
      
      samples.forEach((item, index) => {
        console.log(`  Sample ${index + 1}:`);
        console.log(`    ID: ${item.id}`);
        console.log(`    Brand: ${item.brand || 'NULL'}`);
        console.log(`    Model: ${item.model || 'NULL'}`);
        console.log(`    Name: ${item.name || 'NULL'}`);
        console.log(`    Specs: ${item.specs ? JSON.stringify(item.specs, null, 2) : 'NULL'}`);
        console.log(`    Added by user: ${item.added_by_user_id ? 'YES' : 'NO'}`);
        console.log(`    Created: ${item.created_at}`);
        console.log('    ---');
      });
    }
    
    // Data quality analysis
    console.log('\n5. DATA QUALITY ANALYSIS:');
    
    // Check for missing brands
    const { data: missingBrands, error: brandError } = await supabase
      .from('equipment')
      .select('id, name, category')
      .or('brand.is.null,brand.eq.');
      
    if (!brandError && missingBrands) {
      console.log(`  Missing brands: ${missingBrands.length} items`);
      if (missingBrands.length > 0 && missingBrands.length <= 10) {
        missingBrands.forEach(item => {
          console.log(`    ID ${item.id}: ${item.name} (${item.category})`);
        });
      }
    }
    
    // Check for missing models
    const { data: missingModels, error: modelError } = await supabase
      .from('equipment')
      .select('id, name, brand, category')
      .or('model.is.null,model.eq.');
      
    if (!modelError && missingModels) {
      console.log(`  Missing models: ${missingModels.length} items`);
    }
    
    // Check specs column usage
    const { data: withSpecs, error: specsError } = await supabase
      .from('equipment')
      .select('id, specs')
      .not('specs', 'is', null);
      
    if (!specsError && withSpecs) {
      console.log(`  Items with specs data: ${withSpecs.length} items`);
      
      if (withSpecs.length > 0) {
        console.log('\n  Sample specs structures:');
        withSpecs.slice(0, 3).forEach((item, index) => {
          console.log(`    Sample ${index + 1} (ID ${item.id}):`);
          console.log(`      ${JSON.stringify(item.specs, null, 6)}`);
        });
      }
    }
    
    // Check for potential duplicates
    console.log('\n6. POTENTIAL DUPLICATE ANALYSIS:');
    const { data: duplicateCheck, error: dupError } = await supabase
      .from('equipment')
      .select('brand, model, category, count(*)')
      .not('brand', 'is', null)
      .not('model', 'is', null)
      .group('brand, model, category')
      .having('count(*)', 'gt', 1);
      
    if (!dupError && duplicateCheck) {
      console.log(`  Potential duplicates found: ${duplicateCheck.length} groups`);
      if (duplicateCheck.length > 0) {
        duplicateCheck.slice(0, 5).forEach(dup => {
          console.log(`    ${dup.brand} ${dup.model} (${dup.category}): ${dup.count} entries`);
        });
      }
    }
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

analyzeEquipmentTable().catch(console.error);