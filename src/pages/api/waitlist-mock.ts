// Mock endpoint for local development of waitlist
// This is used when the Vercel serverless functions aren't available

export async function handleWaitlistSubmit(data: any) {
  // For local development, just return a mock response
  console.log('[Mock Waitlist] Received submission:', data);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return a mock successful response
  return {
    status: 'pending',
    score: 75,
    spotsRemaining: 50,
    message: 'Thank you for your interest! (This is a mock response in development)'
  };
}