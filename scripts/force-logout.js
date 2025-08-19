#!/usr/bin/env node

// Force logout script to clear all auth tokens
console.log('🔄 Force clearing all auth tokens...');

// This script needs to be run in the browser console
const script = `
// Clear all Supabase auth tokens
localStorage.removeItem('supabase.auth.token');
localStorage.removeItem('sb-mllmpnivhowbqoeddjir-auth-token');

// Clear all localStorage items that might contain auth
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
    console.log('Removing:', key);
    localStorage.removeItem(key);
  }
});

// Clear session storage
sessionStorage.clear();

// Clear cookies that might be related
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log('✅ All auth tokens cleared!');
console.log('🔄 Refreshing page...');
setTimeout(() => window.location.reload(), 500);
`;

console.log('\n📋 Copy and paste this into your browser console:\n');
console.log('=====================================');
console.log(script);
console.log('=====================================\n');
console.log('Or run this in the terminal:');
console.log('node scripts/force-logout.js | tail -n +5 | head -n -3 | pbcopy');
console.log('Then paste in browser console');