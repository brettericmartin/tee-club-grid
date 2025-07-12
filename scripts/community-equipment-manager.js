import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Community Equipment Manager
 * 
 * Aligns with Teed.club's vision: "Your golf bag IS your social profile"
 * 
 * This system allows community contributions while maintaining quality through:
 * 1. User submissions with moderation queue
 * 2. AI-powered duplicate detection that understands golf equipment nuances
 * 3. Community voting on equipment data accuracy
 * 4. Automated quality checks and standardization
 */

// Equipment submission states
const SUBMISSION_STATES = {
  PENDING: 'pending',        // Awaiting AI review
  AI_APPROVED: 'ai_approved', // AI thinks it's good
  COMMUNITY_REVIEW: 'community_review', // Needs community votes
  APPROVED: 'approved',      // Added to main equipment table
  REJECTED: 'rejected',      // Duplicate or invalid
  MERGED: 'merged'          // Merged with existing equipment
};

// Create equipment_submissions table if needed
const EQUIPMENT_SUBMISSIONS_SCHEMA = `
CREATE TABLE IF NOT EXISTS equipment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES profiles(id),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  year INTEGER,
  msrp DECIMAL,
  image_url TEXT,
  specs JSONB DEFAULT '{}',
  ai_analysis JSONB DEFAULT '{}',
  community_votes JSONB DEFAULT '{"up": 0, "down": 0}',
  status TEXT DEFAULT 'pending',
  merged_into UUID REFERENCES equipment(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Index for quick lookups
CREATE INDEX idx_submissions_status ON equipment_submissions(status);
CREATE INDEX idx_submissions_brand_model ON equipment_submissions(brand, model);
`;

// AI prompt for equipment analysis
const EQUIPMENT_ANALYSIS_PROMPT = `
You are a golf equipment expert helping maintain a community database. Analyze this equipment submission:

Brand: {brand}
Model: {model}
Category: {category}
Year: {year}
MSRP: {msrp}

Existing similar equipment in database:
{existing_equipment}

Please analyze:
1. Is this a duplicate of existing equipment?
   - Consider that "Qi10" and "Qi35" are DIFFERENT models
   - "Qi10 LS" is DIFFERENT from "Qi10"
   - "2023 Stealth" is the SAME as "Stealth" if no other year exists
   
2. Is the naming correct?
   - Model should NOT include brand name
   - Year should be separate field, not in model name
   - Correct common misspellings
   
3. What variations exist?
   - List known variants (LS, Max, Plus, Tour, etc.)
   - Note if this is a variant of existing equipment

4. Data validation:
   - Is the MSRP reasonable for this equipment type and brand?
   - Is the category correct?

Respond in JSON:
{
  "is_duplicate": boolean,
  "duplicate_of_id": "uuid or null",
  "suggested_corrections": {
    "brand": "corrected brand or null",
    "model": "corrected model or null",
    "category": "corrected category or null"
  },
  "confidence_score": 0-100,
  "variants": ["list of known variants"],
  "notes": "explanation of decision"
}
`;

// Function to analyze equipment with AI
async function analyzeEquipmentWithAI(submission) {
  // Find existing similar equipment
  const { data: existing } = await supabase
    .from('equipment')
    .select('id, brand, model, category, msrp')
    .or(`brand.eq.${submission.brand},model.ilike.%${submission.model.split(' ')[0]}%`);
  
  // Here you would call OpenAI/Claude API
  // For now, let's implement smart logic that understands golf equipment
  
  const analysis = {
    is_duplicate: false,
    duplicate_of_id: null,
    suggested_corrections: {},
    confidence_score: 85,
    variants: [],
    notes: ''
  };
  
  // Smart duplicate detection
  if (existing && existing.length > 0) {
    for (const item of existing) {
      // Exact match (case insensitive)
      if (item.brand.toLowerCase() === submission.brand.toLowerCase() &&
          item.model.toLowerCase() === submission.model.toLowerCase()) {
        analysis.is_duplicate = true;
        analysis.duplicate_of_id = item.id;
        analysis.confidence_score = 100;
        analysis.notes = 'Exact match found';
        break;
      }
      
      // Check if it's a year variant of the same model
      const modelWithoutYear = submission.model.replace(/\s*\(?\d{4}\)?\s*/g, '').trim();
      const existingWithoutYear = item.model.replace(/\s*\(?\d{4}\)?\s*/g, '').trim();
      
      if (modelWithoutYear.toLowerCase() === existingWithoutYear.toLowerCase() &&
          !submission.year && !item.year) {
        analysis.is_duplicate = true;
        analysis.duplicate_of_id = item.id;
        analysis.confidence_score = 90;
        analysis.notes = 'Same model without year specification';
        break;
      }
    }
  }
  
  // Check for brand in model name
  if (submission.model.includes(submission.brand)) {
    analysis.suggested_corrections.model = submission.model.replace(submission.brand, '').trim();
  }
  
  // Extract year from model if present
  const yearMatch = submission.model.match(/\b(20\d{2})\b/);
  if (yearMatch && !submission.year) {
    analysis.suggested_corrections.year = parseInt(yearMatch[1]);
    analysis.suggested_corrections.model = submission.model.replace(yearMatch[0], '').trim();
  }
  
  // Identify known variants
  const variantPatterns = ['LS', 'LST', 'Max', 'Plus', 'Tour', 'X', 'HD', 'SFT', 'Triple Diamond'];
  variantPatterns.forEach(variant => {
    if (submission.model.includes(variant)) {
      analysis.variants.push(variant);
    }
  });
  
  return analysis;
}

// Function for users to submit new equipment
async function submitEquipment(userId, equipmentData) {
  console.log(`📝 New equipment submission from user ${userId}`);
  
  // Basic validation
  if (!equipmentData.brand || !equipmentData.model || !equipmentData.category) {
    return { error: 'Missing required fields: brand, model, category' };
  }
  
  // Create submission
  const submission = {
    submitted_by: userId,
    brand: equipmentData.brand.trim(),
    model: equipmentData.model.trim(),
    category: equipmentData.category,
    year: equipmentData.year || null,
    msrp: equipmentData.msrp || null,
    image_url: equipmentData.image_url || null,
    specs: equipmentData.specs || {},
    status: SUBMISSION_STATES.PENDING
  };
  
  // Run AI analysis
  const aiAnalysis = await analyzeEquipmentWithAI(submission);
  submission.ai_analysis = aiAnalysis;
  
  // Apply AI corrections
  if (aiAnalysis.suggested_corrections.model) {
    submission.model = aiAnalysis.suggested_corrections.model;
  }
  if (aiAnalysis.suggested_corrections.year) {
    submission.year = aiAnalysis.suggested_corrections.year;
  }
  
  // Determine initial status based on AI analysis
  if (aiAnalysis.is_duplicate && aiAnalysis.confidence_score > 90) {
    submission.status = SUBMISSION_STATES.REJECTED;
    submission.rejection_reason = 'Duplicate equipment already exists';
    submission.merged_into = aiAnalysis.duplicate_of_id;
  } else if (aiAnalysis.confidence_score > 85) {
    submission.status = SUBMISSION_STATES.AI_APPROVED;
  } else {
    submission.status = SUBMISSION_STATES.COMMUNITY_REVIEW;
  }
  
  // Insert submission
  const { data, error } = await supabase
    .from('equipment_submissions')
    .insert(submission)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating submission:', error);
    return { error: error.message };
  }
  
  console.log(`✅ Submission created with status: ${submission.status}`);
  
  // If AI approved, add to main equipment table
  if (submission.status === SUBMISSION_STATES.AI_APPROVED) {
    await approveSubmission(data.id);
  }
  
  return { 
    success: true, 
    submission: data,
    aiNotes: aiAnalysis.notes 
  };
}

// Function to approve a submission
async function approveSubmission(submissionId) {
  const { data: submission, error } = await supabase
    .from('equipment_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();
  
  if (error || !submission) {
    return { error: 'Submission not found' };
  }
  
  // Add to main equipment table
  const equipment = {
    brand: submission.brand,
    model: submission.model,
    category: submission.category,
    msrp: submission.msrp,
    image_url: submission.image_url,
    specs: {
      ...submission.specs,
      year: submission.year,
      submitted_by: submission.submitted_by,
      community_verified: true
    },
    popularity_score: 50 // Start with neutral score
  };
  
  const { data: newEquipment, error: insertError } = await supabase
    .from('equipment')
    .insert(equipment)
    .select()
    .single();
  
  if (insertError) {
    console.error('Error adding equipment:', insertError);
    return { error: insertError.message };
  }
  
  // Update submission status
  await supabase
    .from('equipment_submissions')
    .update({ 
      status: SUBMISSION_STATES.APPROVED,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', submissionId);
  
  console.log(`✅ Equipment approved: ${equipment.brand} ${equipment.model}`);
  
  return { success: true, equipment: newEquipment };
}

// Community voting function
async function voteOnSubmission(userId, submissionId, vote) {
  // Implement community voting logic
  // This would update the community_votes field
  // If enough positive votes, move to approved
  // If too many negative votes, reject
}

// Regular AI maintenance function
async function runAIMaintenance() {
  console.log('🤖 Running AI maintenance on equipment database...\n');
  
  // Check for duplicates across all equipment
  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .order('brand, model');
  
  const potentialDuplicates = [];
  const corrections = [];
  
  // Group by brand
  const byBrand = {};
  equipment.forEach(item => {
    if (!byBrand[item.brand]) byBrand[item.brand] = [];
    byBrand[item.brand].push(item);
  });
  
  // Check each brand group
  for (const [brand, items] of Object.entries(byBrand)) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const item1 = items[i];
        const item2 = items[j];
        
        // Check for potential duplicates
        const similarity = calculateSimilarity(item1.model, item2.model);
        if (similarity > 0.8) {
          potentialDuplicates.push({
            item1: `${item1.brand} ${item1.model}`,
            item2: `${item2.brand} ${item2.model}`,
            similarity: Math.round(similarity * 100)
          });
        }
      }
      
      // Check for corrections needed
      if (items[i].model.includes(brand)) {
        corrections.push({
          id: items[i].id,
          current: items[i].model,
          suggested: items[i].model.replace(brand, '').trim()
        });
      }
    }
  }
  
  console.log(`Found ${potentialDuplicates.length} potential duplicates`);
  console.log(`Found ${corrections.length} items needing correction`);
  
  return { potentialDuplicates, corrections };
}

// Simple similarity calculation
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 1;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Levenshtein distance would be better here
  // For now, simple character comparison
  let matches = 0;
  const minLen = Math.min(s1.length, s2.length);
  for (let i = 0; i < minLen; i++) {
    if (s1[i] === s2[i]) matches++;
  }
  
  return matches / Math.max(s1.length, s2.length);
}

// Example usage
async function example() {
  console.log('🏌️ Teed.club Community Equipment Manager\n');
  console.log('This system enables community-driven equipment data while maintaining quality.\n');
  
  // Example: User submits new equipment
  const userSubmission = {
    brand: 'TaylorMade',
    model: 'Qi10 LS',  // This is different from Qi10!
    category: 'driver',
    year: 2024,
    msrp: 599,
    image_url: 'https://example.com/qi10-ls.jpg',
    specs: {
      loft_options: ['8°', '9°', '10.5°'],
      shaft_options: ['Regular', 'Stiff', 'X-Stiff']
    }
  };
  
  console.log('Example submission:', userSubmission);
  
  // This would be called from your API endpoint
  // const result = await submitEquipment('user-uuid', userSubmission);
  
  // Run maintenance
  const maintenance = await runAIMaintenance();
  console.log('\n🔧 Maintenance Report:');
  if (maintenance.potentialDuplicates.length > 0) {
    console.log('\nPotential Duplicates:');
    maintenance.potentialDuplicates.forEach(dup => {
      console.log(`  - "${dup.item1}" vs "${dup.item2}" (${dup.similarity}% similar)`);
    });
  }
}

// Export functions
export {
  submitEquipment,
  approveSubmission,
  voteOnSubmission,
  runAIMaintenance
};

// Run example if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  example().catch(console.error);
}