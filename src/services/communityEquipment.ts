import { supabase } from '@/lib/supabase';

/**
 * Community Equipment Service
 * 
 * Enables users to contribute equipment while maintaining quality
 * Aligns with Teed.club vision: community-driven, high-quality data
 */

export interface EquipmentSubmission {
  brand: string;
  model: string;
  category: string;
  year?: number;
  msrp?: number;
  image_url?: string;
  specs?: Record<string, any>;
}

export interface AIAnalysis {
  is_duplicate: boolean;
  duplicate_of_id?: string;
  suggested_corrections?: {
    brand?: string;
    model?: string;
    category?: string;
    year?: number;
  };
  confidence_score: number;
  variants: string[];
  notes: string;
}

// Submit new equipment
export async function submitEquipment(submission: EquipmentSubmission) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Must be logged in to submit equipment');
  }
  
  // Basic validation
  if (!submission.brand || !submission.model || !submission.category) {
    throw new Error('Brand, model, and category are required');
  }
  
  // Clean the data
  const cleanedSubmission = {
    ...submission,
    brand: submission.brand.trim(),
    model: submission.model.trim(),
    // Remove brand from model if present
    model_cleaned: submission.model.replace(new RegExp(submission.brand, 'gi'), '').trim()
  };
  
  // Check for obvious duplicates first
  const { data: existing } = await supabase
    .from('equipment')
    .select('id, brand, model')
    .eq('brand', cleanedSubmission.brand)
    .ilike('model', `%${cleanedSubmission.model_cleaned.split(' ')[0]}%`);
  
  // Quick duplicate check
  if (existing && existing.length > 0) {
    const exactMatch = existing.find(e => 
      e.model.toLowerCase() === cleanedSubmission.model_cleaned.toLowerCase()
    );
    
    if (exactMatch) {
      return {
        success: false,
        error: 'This equipment already exists',
        existing: exactMatch
      };
    }
  }
  
  // Create submission record
  const { data, error } = await supabase
    .from('equipment_submissions')
    .insert({
      submitted_by: user.id,
      brand: cleanedSubmission.brand,
      model: cleanedSubmission.model_cleaned,
      category: cleanedSubmission.category,
      year: cleanedSubmission.year,
      msrp: cleanedSubmission.msrp,
      image_url: cleanedSubmission.image_url,
      specs: cleanedSubmission.specs || {},
      status: 'pending',
      ai_analysis: {
        checked_at: new Date().toISOString(),
        similar_equipment: existing || []
      }
    })
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  
  // If no similar equipment found, auto-approve
  if (!existing || existing.length === 0) {
    await autoApproveSubmission(data.id);
    return {
      success: true,
      message: 'Equipment added successfully!',
      submission: data
    };
  }
  
  return {
    success: true,
    message: 'Equipment submitted for review',
    submission: data,
    similar: existing
  };
}

// Auto-approve high-confidence submissions
async function autoApproveSubmission(submissionId: string) {
  const { data: submission } = await supabase
    .from('equipment_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();
  
  if (!submission) return;
  
  // Add to main equipment table
  const { data: newEquipment, error } = await supabase
    .from('equipment')
    .insert({
      brand: submission.brand,
      model: submission.model,
      category: submission.category,
      msrp: submission.msrp || 0,
      image_url: submission.image_url,
      specs: {
        ...submission.specs,
        year: submission.year,
        community_submitted: true,
        submitted_by: submission.submitted_by
      },
      popularity_score: 50
    })
    .select()
    .single();
  
  if (!error && newEquipment) {
    // Update submission status
    await supabase
      .from('equipment_submissions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', submissionId);
  }
  
  return newEquipment;
}

// Get pending submissions for community review
export async function getPendingSubmissions() {
  const { data, error } = await supabase
    .from('equipment_submissions')
    .select(`
      *,
      submitted_by:profiles(username, avatar_url)
    `)
    .eq('status', 'community_review')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Vote on a submission
export async function voteOnSubmission(submissionId: string, vote: 'up' | 'down') {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Must be logged in to vote');
  }
  
  // Get current submission
  const { data: submission } = await supabase
    .from('equipment_submissions')
    .select('community_votes')
    .eq('id', submissionId)
    .single();
  
  if (!submission) {
    throw new Error('Submission not found');
  }
  
  // Update votes
  const votes = submission.community_votes || { up: 0, down: 0, voters: {} };
  
  // Check if user already voted
  if (votes.voters && votes.voters[user.id]) {
    throw new Error('You have already voted on this submission');
  }
  
  // Add vote
  votes[vote] = (votes[vote] || 0) + 1;
  votes.voters = { ...votes.voters, [user.id]: vote };
  
  // Update submission
  const { error } = await supabase
    .from('equipment_submissions')
    .update({ community_votes: votes })
    .eq('id', submissionId);
  
  if (error) throw error;
  
  // Check if we should auto-approve/reject based on votes
  if (votes.up >= 5 && votes.up > votes.down * 2) {
    await autoApproveSubmission(submissionId);
  } else if (votes.down >= 5 && votes.down > votes.up * 2) {
    await supabase
      .from('equipment_submissions')
      .update({
        status: 'rejected',
        rejection_reason: 'Community voted against this submission'
      })
      .eq('id', submissionId);
  }
  
  return { success: true };
}

// Search for equipment (for duplicate checking in UI)
export async function searchEquipmentForDuplicates(query: string) {
  const { data, error } = await supabase
    .from('equipment')
    .select('id, brand, model, category')
    .or(`brand.ilike.%${query}%,model.ilike.%${query}%`)
    .limit(10);
  
  if (error) throw error;
  return data;
}

// Get user's submissions
export async function getUserSubmissions(userId: string) {
  const { data, error } = await supabase
    .from('equipment_submissions')
    .select('*')
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Report duplicate equipment
export async function reportDuplicate(equipmentId1: string, equipmentId2: string, notes?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Must be logged in to report duplicates');
  }
  
  const { error } = await supabase
    .from('equipment_duplicate_reports')
    .insert({
      equipment_id_1: equipmentId1,
      equipment_id_2: equipmentId2,
      reported_by: user.id,
      notes
    });
  
  if (error) throw error;
  return { success: true };
}