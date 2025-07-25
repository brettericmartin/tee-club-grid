import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validate OpenAI configuration
if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OpenAI API key');
}

export interface EquipmentAnalysisResult {
  clubs: Array<{
    type: 'driver' | 'fairway' | 'hybrid' | 'iron' | 'wedge' | 'putter' | 'other';
    brand: string;
    model?: string;
    confidence: number;
    details?: {
      shaft?: string;
      grip?: string;
      loft?: string;
      color?: string;
      condition?: string;
    };
    position?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    // New properties for enhanced workflow
    searchKeywords?: string[];
    alternativeMatches?: Array<{
      brand: string;
      model: string;
      confidence: number;
    }>;
    requiresManualReview?: boolean;
    databaseMatches?: any[];
    matchConfidence?: number;
    requiresUserConfirmation?: boolean;
    requiresManualAddition?: boolean;
    matchedEquipmentId?: string;
    verifiedBrand?: string;
    verifiedModel?: string;
    specs?: any;
  }>;
  bagInfo?: {
    brand?: string;
    model?: string;
    color?: string;
  };
  accessories?: Array<{
    type: string;
    description: string;
  }>;
  overallConfidence: number;
  rawResponse?: string;
  error?: string;
  metadata?: {
    totalItemsFound: number;
    overallConfidence: number;
    imageQuality: string;
    lightingConditions: string;
    recommendManualReview: boolean;
  };
  requiresManualReview?: boolean;
}

/**
 * Robust JSON extraction function for OpenAI responses
 * Handles markdown code blocks, mixed text responses, and partial JSON
 */
function extractJSON(text: string): any {
  try {
    // First try direct parsing
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e2) {
        console.error('Failed to parse extracted JSON from markdown:', e2);
      }
    }
    
    // Try to find JSON object in mixed text
    const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      try {
        return JSON.parse(jsonObjectMatch[0]);
      } catch (e3) {
        console.error('Failed to parse found JSON object:', e3);
      }
    }
    
    // Last resort: try to clean and parse
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/^[\s\w]*?(?=\{)/g, '') // Remove text before first {
      .replace(/\}[\s\S]*$/g, '}') // Remove text after last }
      .trim();
    
    try {
      return JSON.parse(cleaned);
    } catch (e4) {
      console.error('All JSON parsing attempts failed:', e4);
      throw new Error(`Unable to parse AI response as JSON. Raw response: ${text.substring(0, 200)}...`);
    }
  }
}

/**
 * Analyze a golf bag image using OpenAI Vision API
 */
export async function analyzeGolfBagImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<EquipmentAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert golf equipment identifier with access to online golf equipment databases. Analyze golf bag images using this 3-step process:

STEP 1 - VISUAL IDENTIFICATION:
- Identify each visible club/equipment piece
- Note brand markings, model text, visual characteristics
- Assign initial confidence scores (0.0-1.0)
- Include position coordinates in the image

STEP 2 - ONLINE VERIFICATION:
- For each identified item, consider what you know about:
  * Current golf equipment models and years
  * Brand-specific design characteristics
  * Common equipment configurations
- Adjust confidence based on likelihood of identification

STEP 3 - DATABASE MATCHING PREPARATION:
- Format results for database lookup
- Provide alternative spellings/models for fuzzy matching
- Include search keywords for equipment not found

REQUIRED JSON OUTPUT FORMAT:
{
  "identifiedEquipment": [
    {
      "visualId": "unique_id_1",
      "type": "driver|fairway|hybrid|iron|wedge|putter|ball|bag|accessory",
      "primaryIdentification": {
        "brand": "exact_brand_name",
        "model": "exact_model_name",
        "confidence": 0.85,
        "year": "2024"
      },
      "alternativeMatches": [
        {"brand": "alt_brand", "model": "alt_model", "confidence": 0.65}
      ],
      "visualDetails": {
        "position": {"x": 100, "y": 200, "width": 50, "height": 150},
        "shaft": "visible_shaft_brand",
        "grip": "visible_grip_type",
        "loft": "visible_loft_marking",
        "condition": "new|used|worn"
      },
      "searchKeywords": ["keyword1", "keyword2", "keyword3"],
      "requiresManualReview": false
    }
  ],
  "bagAnalysis": {
    "brand": "bag_brand",
    "model": "bag_model", 
    "confidence": 0.75
  },
  "analysisMetadata": {
    "totalItemsFound": 14,
    "overallConfidence": 0.78,
    "imageQuality": "good|fair|poor",
    "lightingConditions": "good|fair|poor",
    "recommendManualReview": false
  }
}

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, no extra text.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this golf bag image and identify all equipment visible. Be specific about brands and models when they're clearly visible, but indicate lower confidence when details are unclear."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.2,  // Lower temperature for more consistent results
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const analysis = extractJSON(content);
      
      // Validate required structure
      if (!analysis.identifiedEquipment || !Array.isArray(analysis.identifiedEquipment)) {
        throw new Error('Invalid response structure: missing identifiedEquipment array');
      }
      
      // Transform to existing format for backward compatibility
      return {
        clubs: analysis.identifiedEquipment.map((item: any) => ({
          type: normalizeClubType(item.type),
          brand: item.primaryIdentification?.brand || 'Unknown',
          model: item.primaryIdentification?.model,
          confidence: item.primaryIdentification?.confidence || 0.5,
          details: {
            shaft: item.visualDetails?.shaft,
            grip: item.visualDetails?.grip,
            loft: item.visualDetails?.loft,
            condition: item.visualDetails?.condition
          },
          position: item.visualDetails?.position,
          searchKeywords: item.searchKeywords,
          alternativeMatches: item.alternativeMatches,
          requiresManualReview: item.requiresManualReview
        })),
        bagInfo: analysis.bagAnalysis || {},
        accessories: [], // Can be extracted from identifiedEquipment if needed
        overallConfidence: analysis.analysisMetadata?.overallConfidence || 0.5,
        rawResponse: content,
        metadata: analysis.analysisMetadata
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Raw response:', content);
      
      // Return structured error response instead of empty
      return {
        clubs: [],
        overallConfidence: 0,
        rawResponse: content,
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
        requiresManualReview: true
      };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    if (error instanceof Error) {
      // Check for specific OpenAI errors
      if (error.message.includes('401')) {
        throw new Error('OpenAI API authentication failed. Please check API key configuration.');
      } else if (error.message.includes('429')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else if (error.message.includes('insufficient_quota')) {
        throw new Error('OpenAI API quota exceeded. Please contact support.');
      }
    }
    throw new Error('Failed to analyze image. Please try again.');
  }
}

/**
 * Normalize club types to our standard categories
 */
function normalizeClubType(type: string): string {
  const normalized = type.toLowerCase().trim();
  
  const typeMap: Record<string, string> = {
    'driver': 'driver',
    '1-wood': 'driver',
    'fairway': 'fairway',
    'fairway wood': 'fairway',
    '3-wood': 'fairway',
    '5-wood': 'fairway',
    'hybrid': 'hybrid',
    'rescue': 'hybrid',
    'iron': 'iron',
    'irons': 'iron',
    'wedge': 'wedge',
    'putter': 'putter',
    'ball': 'other',
    'bag': 'other',
    'accessory': 'other'
  };

  return typeMap[normalized] || 'other';
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(clubs: any[]): number {
  if (clubs.length === 0) return 0;
  
  const totalConfidence = clubs.reduce((sum: number, club: any) => 
    sum + (club.confidence || 0), 0
  );
  
  return totalConfidence / clubs.length;
}

/**
 * Validate and enhance equipment data with our database
 */
export async function validateEquipmentData(
  analysis: EquipmentAnalysisResult,
  supabase: any
): Promise<EquipmentAnalysisResult> {
  const enhancedClubs = await Promise.all(
    analysis.clubs.map(async (club) => {
      let matches = [];
      
      // Primary brand/model search
      if (club.brand && club.brand !== 'Unknown') {
        const { data: primaryMatches } = await supabase
          .from('equipment')
          .select('id, brand, model, category, specs, image_url, msrp')
          .ilike('brand', `%${club.brand}%`)
          .eq('category', club.type)
          .limit(10);
        
        if (primaryMatches) matches.push(...primaryMatches);
      }
      
      // Search using keywords if available
      if (club.searchKeywords && club.searchKeywords.length > 0) {
        for (const keyword of club.searchKeywords.slice(0, 3)) { // Limit to 3 keywords
          const { data: keywordMatches } = await supabase
            .from('equipment')
            .select('id, brand, model, category, specs, image_url, msrp')
            .or(`brand.ilike.%${keyword}%,model.ilike.%${keyword}%`)
            .eq('category', club.type)
            .limit(5);
          
          if (keywordMatches) matches.push(...keywordMatches);
        }
      }
      
      // Remove duplicates
      const uniqueMatches = matches.filter((match, index, self) => 
        index === self.findIndex(m => m.id === match.id)
      );
      
      if (uniqueMatches.length > 0) {
        // Score matches based on similarity
        const scoredMatches = uniqueMatches.map(match => {
          let score = 0;
          
          // Brand similarity
          if (club.brand && match.brand.toLowerCase().includes(club.brand.toLowerCase())) {
            score += 0.4;
          }
          
          // Model similarity
          if (club.model && match.model.toLowerCase().includes(club.model.toLowerCase())) {
            score += 0.6;
          }
          
          return { ...match, matchScore: score };
        }).sort((a, b) => b.matchScore - a.matchScore);
        
        const bestMatch = scoredMatches[0];
        
        return {
          ...club,
          matchedEquipmentId: bestMatch.id,
          verifiedBrand: bestMatch.brand,
          verifiedModel: bestMatch.model,
          specs: bestMatch.specs,
          databaseMatches: scoredMatches.slice(0, 5), // Top 5 matches for user selection
          matchConfidence: bestMatch.matchScore,
          requiresUserConfirmation: bestMatch.matchScore < 0.7 || club.confidence < 0.8
        };
      }
      
      return {
        ...club,
        requiresManualAddition: true,
        databaseMatches: []
      };
    })
  );

  return {
    ...analysis,
    clubs: enhancedClubs
  };
}