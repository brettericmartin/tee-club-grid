import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  EQUIPMENT_SPEC_STANDARDS, 
  NAMING_CONVENTIONS, 
  validateEquipmentSpecs,
  normalizeSpecs 
} from './equipment-spec-standards.js';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Equipment Data Auditor
 * 
 * Comprehensive audit system for equipment data quality
 * Reviews existing data against defined standards
 * Generates detailed reports and recommendations
 */

class EquipmentAuditor {
  constructor() {
    this.stats = {
      total: 0,
      byCategory: {},
      issues: {
        critical: [],
        warnings: [],
        recommendations: []
      },
      coverage: {
        images: { total: 0, missing: 0 },
        specs: { total: 0, empty: 0, invalid: 0 },
        prices: { total: 0, missing: 0, suspicious: 0 }
      }
    };
  }

  async auditAll() {
    console.log('🔍 Starting Comprehensive Equipment Audit');
    console.log('=' .repeat(60));
    
    // Fetch all equipment
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('*')
      .order('category', { ascending: true })
      .order('brand', { ascending: true });

    if (error) {
      console.error('Error fetching equipment:', error);
      return;
    }

    this.stats.total = equipment.length;
    console.log(`\n📊 Auditing ${equipment.length} equipment items...\n`);

    // Audit each item
    for (const item of equipment) {
      await this.auditItem(item);
    }

    // Generate report
    await this.generateReport();
  }

  async auditItem(item) {
    // Track category stats
    if (!this.stats.byCategory[item.category]) {
      this.stats.byCategory[item.category] = {
        count: 0,
        issues: 0,
        missingSpecs: 0,
        missingImages: 0
      };
    }
    this.stats.byCategory[item.category].count++;

    // Check brand formatting
    const correctBrand = this.checkBrandFormat(item.brand);
    if (correctBrand !== item.brand) {
      this.stats.issues.warnings.push({
        id: item.id,
        type: 'brand_format',
        message: `Brand "${item.brand}" should be "${correctBrand}"`,
        item: `${item.brand} ${item.model}`
      });
    }

    // Check model doesn't include brand
    if (item.model && item.brand && 
        item.model.toLowerCase().includes(item.brand.toLowerCase())) {
      this.stats.issues.warnings.push({
        id: item.id,
        type: 'model_includes_brand',
        message: `Model "${item.model}" includes brand name "${item.brand}"`,
        item: `${item.brand} ${item.model}`
      });
    }

    // Check image coverage
    if (!item.image_url || item.image_url.trim() === '') {
      this.stats.coverage.images.missing++;
      this.stats.byCategory[item.category].missingImages++;
      
      // Critical for popular categories
      if (['driver', 'iron', 'putter', 'wedge'].includes(item.category)) {
        this.stats.issues.critical.push({
          id: item.id,
          type: 'missing_image',
          message: `No image for ${item.category}`,
          item: `${item.brand} ${item.model}`
        });
      }
    }
    this.stats.coverage.images.total++;

    // Audit specs
    await this.auditSpecs(item);

    // Check pricing
    this.auditPricing(item);

    // Check category naming
    if (item.category === 'fairway_wood') {
      this.stats.issues.recommendations.push({
        id: item.id,
        type: 'category_format',
        message: 'Category "fairway_wood" should use hyphen: "fairway-wood"',
        item: `${item.brand} ${item.model}`
      });
    }
  }

  async auditSpecs(item) {
    this.stats.coverage.specs.total++;

    // Check for empty specs
    if (!item.specs || Object.keys(item.specs).length === 0) {
      this.stats.coverage.specs.empty++;
      this.stats.byCategory[item.category].missingSpecs++;
      
      this.stats.issues.critical.push({
        id: item.id,
        type: 'empty_specs',
        message: `No specifications data`,
        item: `${item.brand} ${item.model}`,
        category: item.category
      });
      return;
    }

    // Validate specs against standards
    const validation = validateEquipmentSpecs(item.category, item.specs);
    
    if (!validation.valid) {
      this.stats.coverage.specs.invalid++;
      
      validation.errors.forEach(error => {
        this.stats.issues.warnings.push({
          id: item.id,
          type: 'invalid_specs',
          message: error,
          item: `${item.brand} ${item.model}`,
          category: item.category
        });
      });
    }

    validation.warnings?.forEach(warning => {
      this.stats.issues.recommendations.push({
        id: item.id,
        type: 'spec_warning',
        message: warning,
        item: `${item.brand} ${item.model}`,
        category: item.category
      });
    });

    // Check for recommended fields
    const standard = EQUIPMENT_SPEC_STANDARDS[item.category];
    if (standard) {
      // Check if important optional fields are missing
      const importantOptional = ['year', 'stock_shaft', 'stock_grip'];
      importantOptional.forEach(field => {
        if (standard.optional?.[field] && !item.specs[field]) {
          this.stats.issues.recommendations.push({
            id: item.id,
            type: 'missing_recommended',
            message: `Consider adding "${field}" to specs`,
            item: `${item.brand} ${item.model}`,
            category: item.category
          });
        }
      });
    }
  }

  auditPricing(item) {
    this.stats.coverage.prices.total++;

    if (!item.msrp || item.msrp === 0) {
      this.stats.coverage.prices.missing++;
      
      if (['driver', 'iron', 'putter'].includes(item.category)) {
        this.stats.issues.warnings.push({
          id: item.id,
          type: 'missing_price',
          message: 'No MSRP data',
          item: `${item.brand} ${item.model}`
        });
      }
    } else if (item.msrp < 10) {
      this.stats.coverage.prices.suspicious++;
      this.stats.issues.critical.push({
        id: item.id,
        type: 'suspicious_price',
        message: `MSRP $${item.msrp} seems incorrect`,
        item: `${item.brand} ${item.model}`
      });
    } else if (item.msrp > 5000 && item.category !== 'iron') {
      this.stats.coverage.prices.suspicious++;
      this.stats.issues.warnings.push({
        id: item.id,
        type: 'high_price',
        message: `MSRP $${item.msrp} seems unusually high`,
        item: `${item.brand} ${item.model}`
      });
    }
  }

  checkBrandFormat(brand) {
    if (!brand) return brand;
    const lower = brand.toLowerCase().trim();
    return NAMING_CONVENTIONS.brands[lower] || brand;
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_items: this.stats.total,
        critical_issues: this.stats.issues.critical.length,
        warnings: this.stats.issues.warnings.length,
        recommendations: this.stats.issues.recommendations.length
      },
      coverage: {
        images: {
          coverage: ((this.stats.coverage.images.total - this.stats.coverage.images.missing) / 
                    this.stats.coverage.images.total * 100).toFixed(1) + '%',
          missing: this.stats.coverage.images.missing
        },
        specs: {
          complete: ((this.stats.coverage.specs.total - this.stats.coverage.specs.empty) / 
                    this.stats.coverage.specs.total * 100).toFixed(1) + '%',
          empty: this.stats.coverage.specs.empty,
          invalid: this.stats.coverage.specs.invalid
        },
        prices: {
          coverage: ((this.stats.coverage.prices.total - this.stats.coverage.prices.missing) / 
                    this.stats.coverage.prices.total * 100).toFixed(1) + '%',
          missing: this.stats.coverage.prices.missing,
          suspicious: this.stats.coverage.prices.suspicious
        }
      },
      byCategory: this.stats.byCategory,
      issues: this.stats.issues
    };

    // Save report to file
    const reportPath = path.join(__dirname, '..', 'data', 'audit-reports', 
                                 `equipment-audit-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 AUDIT REPORT SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\n📊 Overall Statistics:');
    console.log(`  Total Equipment: ${report.summary.total_items}`);
    console.log(`  Critical Issues: ${report.summary.critical_issues}`);
    console.log(`  Warnings: ${report.summary.warnings}`);
    console.log(`  Recommendations: ${report.summary.recommendations}`);

    console.log('\n📸 Coverage Metrics:');
    console.log(`  Images: ${report.coverage.images.coverage} (${report.coverage.images.missing} missing)`);
    console.log(`  Specs: ${report.coverage.specs.complete} (${report.coverage.specs.empty} empty)`);
    console.log(`  Prices: ${report.coverage.prices.coverage} (${report.coverage.prices.missing} missing)`);

    console.log('\n📂 Category Breakdown:');
    const sortedCategories = Object.entries(this.stats.byCategory)
      .sort((a, b) => b[1].count - a[1].count);
    
    for (const [category, stats] of sortedCategories.slice(0, 10)) {
      const issues = stats.missingSpecs + stats.missingImages;
      const status = issues === 0 ? '✅' : issues < 5 ? '⚠️' : '❌';
      console.log(`  ${status} ${category}: ${stats.count} items` +
                  ` (${stats.missingSpecs} missing specs, ${stats.missingImages} missing images)`);
    }

    console.log('\n🚨 Top Critical Issues:');
    const criticalByType = {};
    this.stats.issues.critical.forEach(issue => {
      criticalByType[issue.type] = (criticalByType[issue.type] || 0) + 1;
    });
    
    Object.entries(criticalByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count} occurrences`);
      });

    console.log('\n💡 Top Recommendations:');
    const recByType = {};
    this.stats.issues.recommendations.forEach(issue => {
      recByType[issue.type] = (recByType[issue.type] || 0) + 1;
    });
    
    Object.entries(recByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count} occurrences`);
      });

    console.log('\n✅ Report saved to:', reportPath);
    console.log('\n🎯 Next Steps:');
    console.log('1. Review critical issues in popular categories (driver, iron, putter)');
    console.log('2. Source missing images for high-traffic equipment');
    console.log('3. Standardize brand names across the database');
    console.log('4. Fill in missing spec data using equipment-enricher.js');
    console.log('5. Verify and correct suspicious pricing data');

    return report;
  }

  async fixCommonIssues(dryRun = true) {
    console.log('\n🔧 ' + (dryRun ? 'Analyzing' : 'Fixing') + ' Common Issues...');
    console.log('='.repeat(60));

    const fixes = {
      brandFormatting: [],
      categoryNaming: [],
      modelCleaning: []
    };

    // Get all equipment
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('*');

    if (error) {
      console.error('Error fetching equipment:', error);
      return;
    }

    for (const item of equipment) {
      // Fix brand formatting
      const correctBrand = this.checkBrandFormat(item.brand);
      if (correctBrand !== item.brand) {
        fixes.brandFormatting.push({
          id: item.id,
          old: item.brand,
          new: correctBrand
        });

        if (!dryRun) {
          await supabase
            .from('equipment')
            .update({ brand: correctBrand })
            .eq('id', item.id);
        }
      }

      // Fix category naming
      if (item.category === 'fairway_wood') {
        fixes.categoryNaming.push({
          id: item.id,
          old: 'fairway_wood',
          new: 'fairway-wood'
        });

        if (!dryRun) {
          await supabase
            .from('equipment')
            .update({ category: 'fairway-wood' })
            .eq('id', item.id);
        }
      }

      // Clean model names that include brand
      if (item.model && item.brand && 
          item.model.toLowerCase().includes(item.brand.toLowerCase())) {
        const cleanModel = item.model
          .replace(new RegExp(item.brand, 'gi'), '')
          .replace(/^\s*-\s*/, '')
          .trim();
        
        if (cleanModel !== item.model) {
          fixes.modelCleaning.push({
            id: item.id,
            old: item.model,
            new: cleanModel
          });

          if (!dryRun) {
            await supabase
              .from('equipment')
              .update({ model: cleanModel })
              .eq('id', item.id);
          }
        }
      }
    }

    // Report fixes
    console.log('\n📝 ' + (dryRun ? 'Proposed' : 'Applied') + ' Fixes:');
    console.log(`  Brand Formatting: ${fixes.brandFormatting.length} items`);
    if (fixes.brandFormatting.length > 0 && fixes.brandFormatting.length <= 5) {
      fixes.brandFormatting.forEach(fix => {
        console.log(`    - "${fix.old}" → "${fix.new}"`);
      });
    }

    console.log(`  Category Naming: ${fixes.categoryNaming.length} items`);
    console.log(`  Model Cleaning: ${fixes.modelCleaning.length} items`);
    if (fixes.modelCleaning.length > 0 && fixes.modelCleaning.length <= 5) {
      fixes.modelCleaning.forEach(fix => {
        console.log(`    - "${fix.old}" → "${fix.new}"`);
      });
    }

    if (dryRun) {
      console.log('\n💡 Run with --fix flag to apply these changes');
    } else {
      console.log('\n✅ Fixes applied successfully!');
    }

    return fixes;
  }
}

// Main execution
async function main() {
  const auditor = new EquipmentAuditor();
  
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const fixOnly = args.includes('--fix-only');

  if (fixOnly) {
    await auditor.fixCommonIssues(false);
  } else {
    await auditor.auditAll();
    
    if (shouldFix) {
      await auditor.fixCommonIssues(false);
    } else {
      await auditor.fixCommonIssues(true);
    }
  }
}

main().catch(console.error);