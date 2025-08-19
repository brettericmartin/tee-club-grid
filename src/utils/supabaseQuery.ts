import { PostgrestError } from '@supabase/supabase-js';

/**
 * Retry a Supabase query with exponential backoff
 * @param queryFn Function that returns a Supabase query promise
 * @param maxRetries Maximum number of retry attempts (default: 2)
 * @returns Query result data or null on failure
 */
export async function retryQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  maxRetries = 2
): Promise<T | null> {
  let lastError: PostgrestError | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await queryFn();
      
      if (!error) {
        return data;
      }
      
      lastError = error;
      
      // Don't retry on certain errors
      if (error.code === 'PGRST116') { // No rows found
        return null;
      }
      
      if (error.code === '23505') { // Duplicate key
        throw error;
      }
      
      if (error.code === '42501') { // Insufficient privileges (RLS)
        throw error;
      }
      
      // If we have retries left, wait before trying again
      if (attempt < maxRetries) {
        const delay = Math.min(100 * Math.pow(2, attempt), 1000); // Max 1 second
        console.log(`[RetryQuery] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      // Network errors or other unexpected errors
      console.error('[RetryQuery] Unexpected error:', error);
      
      if (attempt < maxRetries) {
        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  console.error('[RetryQuery] All attempts failed:', lastError);
  return null;
}

/**
 * Execute multiple queries in parallel with retry logic
 * @param queries Array of query functions
 * @returns Array of results in the same order as queries
 */
export async function parallelQueries<T extends any[]>(
  queries: { [K in keyof T]: () => Promise<{ data: T[K] | null; error: PostgrestError | null }> }
): Promise<T> {
  const results = await Promise.all(
    queries.map(queryFn => retryQuery(queryFn))
  );
  
  return results as T;
}

/**
 * Helper to add timeout to a query
 * @param queryFn Query function to wrap
 * @param timeoutMs Timeout in milliseconds (default: 10000)
 */
export async function queryWithTimeout<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  timeoutMs = 10000
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const timeoutPromise = new Promise<{ data: null; error: PostgrestError }>((_, reject) => {
    setTimeout(() => {
      reject({
        data: null,
        error: {
          message: 'Query timeout',
          details: `Query exceeded ${timeoutMs}ms timeout`,
          hint: 'Try simplifying the query or increasing the timeout',
          code: 'TIMEOUT'
        } as PostgrestError
      });
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([queryFn(), timeoutPromise]);
  } catch (error) {
    if (error && typeof error === 'object' && 'error' in error) {
      return error as { data: null; error: PostgrestError };
    }
    throw error;
  }
}