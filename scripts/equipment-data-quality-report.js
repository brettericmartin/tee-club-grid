import { supabase } from './supabase-admin.js';

async function generateDataQualityReport() {
  console.log('🏌️ EQUIPMENT TABLE DATA QUALITY REPORT');
  console.log('=====================================\n');
  
  try {
    // 1. Basic Statistics
    console.log('📊 BASIC STATISTICS');
    console.log('-------------------');
    
    const { count: totalCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true });
    console.log(`Total Equipment Items: ${totalCount}`);
    
    // User-generated vs. seed data
    const { count: userGenerated } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .not('added_by_user_id', 'is', null);
    console.log(`User-Generated Items: ${userGenerated}`);
    console.log(`Seed/System Items: ${totalCount - userGenerated}`);
    
    // 2. Category Distribution
    console.log('\n📈 CATEGORY DISTRIBUTION');
    console.log('-------------------------');
    
    const { data: allEquipment } = await supabase
      .from('equipment')
      .select('category, added_by_user_id');
      
    const categoryStats = {};
    allEquipment.forEach(item => {
      const cat = item.category || 'NULL';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, userGenerated: 0, system: 0 };
      }
      categoryStats[cat].total++;
      if (item.added_by_user_id) {
        categoryStats[cat].userGenerated++;
      } else {
        categoryStats[cat].system++;
      }
    });
    
    const sortedCategories = Object.entries(categoryStats)
      .sort((a, b) => b[1].total - a[1].total);
      
    console.log('Category           | Total | User | System');
    console.log('-------------------|-------|------|--------');
    sortedCategories.forEach(([category, stats]) => {
      const categoryPadded = category.padEnd(18);
      const totalPadded = stats.total.toString().padStart(5);
      const userPadded = stats.userGenerated.toString().padStart(4);
      const systemPadded = stats.system.toString().padStart(6);
      console.log(`${categoryPadded} | ${totalPadded} | ${userPadded} | ${systemPadded}`);
    });
    
    // 3. Data Completeness Analysis
    console.log('\n🔍 DATA COMPLETENESS ANALYSIS');
    console.log('------------------------------');
    
    // Check missing brands
    const { count: missingBrands } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .or('brand.is.null,brand.eq.');
    console.log(`Missing Brand: ${missingBrands} items (${((missingBrands/totalCount)*100).toFixed(1)}%)`);
    
    // Check missing models
    const { count: missingModels } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .or('model.is.null,model.eq.');
    console.log(`Missing Model: ${missingModels} items (${((missingModels/totalCount)*100).toFixed(1)}%)`);
    
    // Check specs data
    const { count: withSpecs } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .not('specs', 'is', null);
    console.log(`Has Specs Data: ${withSpecs} items (${((withSpecs/totalCount)*100).toFixed(1)}%)`);
    
    // Check images
    const { count: withImages } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .not('image_url', 'eq', '');
    console.log(`Has Image URL: ${withImages} items (${((withImages/totalCount)*100).toFixed(1)}%)`);
    
    // 4. Specs Data Analysis
    console.log('\n📋 SPECS DATA STRUCTURE ANALYSIS');
    console.log('---------------------------------');
    
    const { data: specsData } = await supabase
      .from('equipment')
      .select('category, specs')
      .not('specs', 'is', null)
      .limit(100);
      
    const specsByCategory = {};
    specsData.forEach(item => {
      const cat = item.category || 'unknown';
      if (!specsByCategory[cat]) {
        specsByCategory[cat] = [];
      }
      if (item.specs && typeof item.specs === 'object') {
        specsByCategory[cat].push(Object.keys(item.specs));
      }
    });
    
    Object.entries(specsByCategory).forEach(([category, specsArrays]) => {
      const allKeys = new Set();
      specsArrays.forEach(keys => keys.forEach(key => allKeys.add(key)));
      
      console.log(`\n${category.toUpperCase()} specs fields (${specsArrays.length} items):`);
      Array.from(allKeys).sort().forEach(key => {
        const frequency = specsArrays.filter(keys => keys.includes(key)).length;
        const percentage = ((frequency / specsArrays.length) * 100).toFixed(0);
        console.log(`  ${key}: ${frequency}/${specsArrays.length} (${percentage}%)`);
      });
    });
    
    // 5. Potential Data Issues
    console.log('\n⚠️  POTENTIAL DATA QUALITY ISSUES');
    console.log('----------------------------------');
    
    // Check for inconsistent category naming
    const categories = [...new Set(allEquipment.map(item => item.category))];
    const categoryIssues = categories.filter(cat => 
      cat && (cat.includes('_') || cat.includes(' ') || cat !== cat.toLowerCase())
    );
    
    if (categoryIssues.length > 0) {
      console.log('Inconsistent category naming:');
      categoryIssues.forEach(cat => console.log(`  "${cat}"`));
    }
    
    // Look for potential duplicates (simple check)
    const { data: equipmentForDupeCheck } = await supabase
      .from('equipment')
      .select('brand, model, category')
      .not('brand', 'is', null)
      .not('model', 'is', null);
      
    const brandModelGroups = {};
    equipmentForDupeCheck.forEach(item => {
      const key = `${item.brand}-${item.model}-${item.category}`;
      brandModelGroups[key] = (brandModelGroups[key] || 0) + 1;
    });
    
    const duplicates = Object.entries(brandModelGroups)
      .filter(([key, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);
      
    if (duplicates.length > 0) {
      console.log(`\nPotential duplicates found: ${duplicates.length} groups`);
      duplicates.slice(0, 10).forEach(([key, count]) => {
        console.log(`  ${key}: ${count} entries`);
      });
    }
    
    // 6. Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-------------------');
    
    console.log('1. DATA STANDARDIZATION:');
    if (categoryIssues.length > 0) {
      console.log('   • Standardize category naming (use lowercase, hyphens instead of underscores)');
    }
    console.log('   • Consider normalizing brand names (e.g., "TaylorMade" vs "Taylormade")');
    
    console.log('\n2. SPECS STANDARDIZATION:');
    console.log('   • Create standardized specs schema per category');
    console.log('   • Most common driver specs: year, adjustable, loft_options, shaft_options');
    console.log('   • Most common iron specs: year, set_makeup, shaft_options, shaft_material');
    console.log('   • Most common wedge specs: year, loft_options, grind_options, bounce_options');
    
    console.log('\n3. DATA QUALITY IMPROVEMENTS:');
    if (missingBrands > 0) {
      console.log(`   • Fill missing brands for ${missingBrands} items`);
    }
    if (missingModels > 0) {
      console.log(`   • Fill missing models for ${missingModels} items`);
    }
    if (duplicates.length > 0) {
      console.log(`   • Review and merge ${duplicates.length} potential duplicate groups`);
    }
    
    console.log('\n4. ENHANCED FEATURES:');
    console.log('   • Add professional tour usage data');
    console.log('   • Include MSRP and current market pricing');
    console.log('   • Add equipment performance ratings/reviews');
    console.log('   • Include equipment release dates and model years');
    
  } catch (error) {
    console.error('Report generation failed:', error);
  }
}

generateDataQualityReport().catch(console.error);