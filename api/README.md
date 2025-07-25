# Teed.club API Documentation

This directory contains Vercel Edge Functions that power the backend API for Teed.club.

## Endpoints

### POST /api/equipment/analyze-image
Analyzes a golf bag image using OpenAI Vision API to identify clubs and equipment.

**Authentication**: Required (Bearer token)

**Rate Limit**: 3 requests per 5 minutes per user

**Request Body**:
```json
{
  "image": "base64_encoded_image_string",
  "mimeType": "image/jpeg" // optional, defaults to image/jpeg
}
```

**Response**:
```json
{
  "success": true,
  "analysis": {
    "clubs": [
      {
        "type": "driver",
        "brand": "TaylorMade",
        "model": "Stealth 2",
        "confidence": 0.95,
        "details": {
          "shaft": "Fujikura Ventus",
          "grip": "Golf Pride Tour Velvet",
          "loft": "10.5°"
        },
        "matchedEquipmentId": "uuid", // if found in database
        "verifiedBrand": "TaylorMade",
        "verifiedModel": "Stealth 2 Driver"
      }
    ],
    "bagInfo": {
      "brand": "Titleist",
      "model": "Players 4",
      "color": "Black/White"
    },
    "accessories": [
      {
        "type": "rangefinder",
        "description": "Bushnell Pro X3"
      }
    ],
    "overallConfidence": 0.87
  },
  "usage": {
    "requestsRemaining": 2,
    "resetTime": 1234567890
  }
}
```

**Error Responses**:
- 400: Bad Request (missing image, invalid format, file too large)
- 401: Unauthorized (missing or invalid token)
- 429: Too Many Requests (rate limit exceeded)
- 503: Service Unavailable (OpenAI API error)
- 500: Internal Server Error

## Environment Variables

Required environment variables for Vercel deployment:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key for server-side operations
- `OPENAI_API_KEY`: OpenAI API key for Vision API access

## Development

To test locally with Vercel CLI:
```bash
npm i -g vercel
vercel dev
```

## Deployment

The API functions are automatically deployed with the main application to Vercel.

Add environment variables in Vercel Dashboard:
1. Go to Project Settings
2. Navigate to Environment Variables
3. Add the required variables listed above