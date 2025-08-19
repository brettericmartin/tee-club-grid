// Debug script to understand what's blocking the browser
// Run this in browser console to see what's happening

console.log('=== DEBUGGING SUPABASE CLIENT ===');

// Check if supabase is available
if (typeof window !== 'undefined' && window.supabase) {
  console.log('Supabase client found in window');
} else {
  console.log('Supabase client NOT in window');
}

// Check localStorage for session data
console.log('\n=== LOCALSTORAGE CHECK ===');
const storageKeys = Object.keys(localStorage).filter(key => 
  key.includes('supabase') || key.includes('auth')
);
console.log('Auth-related localStorage keys:', storageKeys);

storageKeys.forEach(key => {
  const value = localStorage.getItem(key);
  console.log(`${key}:`, value ? value.substring(0, 100) + '...' : 'empty');
});

// Check sessionStorage
console.log('\n=== SESSIONSTORAGE CHECK ===');
const sessionKeys = Object.keys(sessionStorage).filter(key => 
  key.includes('supabase') || key.includes('auth')
);
console.log('Auth-related sessionStorage keys:', sessionKeys);

// Try a direct query (paste this in console after loading the page)
console.log('\n=== DIRECT QUERY TEST ===');
console.log('To test a direct query, run this in console:');
console.log(`
// Get the Supabase client from React DevTools or window
const testQuery = async () => {
  // If you have React DevTools, you can get supabase from a component
  // Or check if it's exposed on window
  
  // Try to find it in the app
  const root = document.getElementById('root');
  const reactRoot = root?._reactRootContainer || root?._reactRoot;
  console.log('React root:', reactRoot);
  
  // Alternative: Check network tab for requests to Supabase
  console.log('Check Network tab for requests to:', 'kgleorvvtrqlgolzdbbw.supabase.co');
};
testQuery();
`);

console.log('\n=== POSSIBLE ISSUES ===');
console.log('1. Check if there are stale auth tokens in localStorage');
console.log('2. Check Network tab for 401/403 errors to Supabase');
console.log('3. Look for CORS errors in console');
console.log('4. Check if cookies are blocking requests');

console.log('\n=== CLEAR CACHE COMMANDS ===');
console.log('To clear Supabase cache, run:');
console.log(`
// Clear all Supabase-related storage
Object.keys(localStorage).filter(k => k.includes('supabase')).forEach(k => localStorage.removeItem(k));
Object.keys(sessionStorage).filter(k => k.includes('supabase')).forEach(k => sessionStorage.removeItem(k));
console.log('Cleared Supabase cache - refresh the page');
`);