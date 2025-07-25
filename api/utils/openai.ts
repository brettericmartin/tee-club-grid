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
    };
    position?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
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
}

/**
 * Extract JSON from various OpenAI response formats
 * Handles markdown code blocks, mixed text responses, and partial JSON
 */
function extractJSON(content: string): any {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid content: expected non-empty string');
  }

  // Attempt 1: Try direct JSON parse (fastest path)
  try {
    return JSON.parse(content.trim());
  } catch (e) {
    // Continue to other extraction methods
  }

  // Attempt 2: Remove markdown code blocks
  // Handles ```json ... ``` and ``` ... ```
  const markdownPatterns = [
    /```json\s*\n?([\s\S]*?)\n?```/i,
    /```\s*\n?([\s\S]*?)\n?```/
  ];

  for (const pattern of markdownPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  // Attempt 3: Extract JSON object or array from mixed text
  // Looks for {...} or [...] patterns
  const jsonPatterns = [
    // Match JSON object
    /\{[\s\S]*\}/,
    // Match JSON array
    /\[[\s\S]*\]/
  ];

  for (const pattern of jsonPatterns) {
    const match = content.match(pattern);
    if (match && match[0]) {
      try {
        const parsed = JSON.parse(match[0]);
        // Validate it has expected structure (clubs array)
        if (parsed.clubs || Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  // Attempt 4: Handle responses with explanatory text
  // Look for common patterns like "Here is the analysis:" followed by JSON
  const textPatterns = [
    /(?:here is|this is|the analysis|the equipment|detected equipment)[::\s]*(\{[\s\S]*\})/i,
    /(?:json|result|response|output)[::\s]*(\{[\s\S]*\})/i
  ];

  for (const pattern of textPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  // Attempt 5: Try to extract the largest valid JSON structure
  // This handles cases where JSON might be truncated or have extra characters
  const jsonStart = content.indexOf('{');
  const jsonArrayStart = content.indexOf('[');
  
  if (jsonStart !== -1 || jsonArrayStart !== -1) {
    const startIndex = jsonStart !== -1 && (jsonArrayStart === -1 || jsonStart < jsonArrayStart) 
      ? jsonStart 
      : jsonArrayStart;
    
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (!escapeNext) {
        if (char === '"' && !inString) {
          inString = true;
        } else if (char === '"' && inString) {
          inString = false;
        } else if (!inString) {
          if (char === '{' || char === '[') {
            depth++;
          } else if (char === '}' || char === ']') {
            depth--;
            if (depth === 0) {
              // Found complete JSON structure
              try {
                const jsonStr = content.substring(startIndex, i + 1);
                return JSON.parse(jsonStr);
              } catch (e) {
                // Invalid JSON, continue searching
              }
            }
          }
        }
        
        if (char === '\\') {
          escapeNext = true;
        }
      } else {
        escapeNext = false;
      }
    }
  }

  // If all extraction attempts fail, throw descriptive error
  const preview = content.substring(0, 100);
  throw new Error(`Failed to extract valid JSON from response. Content preview: "${preview}..."`);
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
          content: `You are an expert golf equipment identifier. Analyze golf bag images and identify all visible clubs and equipment.
          
          For each club, provide:
          - Type (driver, fairway wood, hybrid, iron, wedge, putter)
          - Brand (if visible)
          - Model (if visible)
          - Confidence score (0-1)
          - Any visible details (shaft brand, grip type, loft markings)
          - Approximate position in the image
          
          Also identify:
          - The golf bag brand/model
          - Any visible accessories (balls, tees, towels, rangefinders, etc.)
          
          Return your analysis in JSON format.`
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
      // Use robust JSON extraction
      console.log('OpenAI response received, attempting to extract JSON...');
      const analysis = extractJSON(content);
      console.log('Successfully extracted JSON from OpenAI response');
      
      // Normalize and validate the response
      return {
        clubs: (analysis.clubs || []).map((club: any) => ({
          type: normalizeClubType(club.type),
          brand: club.brand || 'Unknown',
          model: club.model,
          confidence: club.confidence || 0.5,
          details: club.details,
          position: club.position
        })),
        bagInfo: analysis.bagInfo || {},
        accessories: analysis.accessories || [],
        overallConfidence: calculateOverallConfidence(analysis.clubs || []),
        rawResponse: content
      };
    } catch (parseError) {
      console.error('Failed to extract/parse OpenAI response:', parseError);
      console.error('Raw response:', content);
      console.error('Response length:', content.length);
      
      // Log specific extraction failure details
      if (parseError instanceof Error) {
        console.error('Extraction error details:', parseError.message);
      }
      
      // Return a structured error response with more context
      return {
        clubs: [],
        overallConfidence: 0,
        rawResponse: content,
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
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
  // For each identified club, try to match with our equipment database
  const enhancedClubs = await Promise.all(
    analysis.clubs.map(async (club) => {
      if (club.brand && club.brand !== 'Unknown') {
        // Search for matching equipment in database
        const { data: matches } = await supabase
          .from('equipment')
          .select('id, brand, model, category, specs')
          .ilike('brand', `%${club.brand}%`)
          .eq('category', club.type)
          .limit(5);
        
        if (matches && matches.length > 0) {
          // Find best match based on model similarity
          const bestMatch = matches.find(m => 
            club.model && m.model.toLowerCase().includes(club.model.toLowerCase())
          ) || matches[0];
          
          return {
            ...club,
            matchedEquipmentId: bestMatch.id,
            verifiedBrand: bestMatch.brand,
            verifiedModel: bestMatch.model,
            specs: bestMatch.specs
          };
        }
      }
      return club;
    })
  );

  return {
    ...analysis,
    clubs: enhancedClubs
  };
}