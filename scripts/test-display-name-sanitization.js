/**
 * Test script for display name sanitization
 */

// Replicate the sanitization functions for testing
function sanitizeDisplayName(name, maxLength = 40) {
  if (!name) return '';
  
  // Remove control characters and zero-width characters
  let sanitized = name
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2028\u2029]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  
  // Remove HTML/script tags
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');
  
  // Truncate to max length
  if (sanitized.length > maxLength) {
    let truncated = sanitized.substring(0, maxLength);
    const lastChar = truncated.charCodeAt(truncated.length - 1);
    if (lastChar >= 0xD800 && lastChar <= 0xDBFF) {
      truncated = truncated.substring(0, truncated.length - 1);
    }
    sanitized = truncated.trim();
  }
  
  return sanitized;
}

function sanitizeEmailForDisplay(email, maxLength = 20) {
  if (!email) return '';
  const localPart = email.split('@')[0] || '';
  let sanitized = localPart
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .substring(0, maxLength);
  return sanitized;
}

function validateDisplayName(name) {
  if (!name || name.trim().length === 0) {
    return 'Display name is required';
  }
  
  const sanitized = sanitizeDisplayName(name);
  
  if (sanitized.length === 0) {
    return 'Display name contains only invalid characters';
  }
  
  if (sanitized.length < 2) {
    return 'Display name must be at least 2 characters';
  }
  
  if (sanitized.length > 40) {
    return 'Display name must be 40 characters or less';
  }
  
  const offensivePatterns = [
    /admin/i,
    /moderator/i,
    /official/i,
    /support/i,
    /teed\.club/i,
    /teedclub/i
  ];
  
  for (const pattern of offensivePatterns) {
    if (pattern.test(sanitized)) {
      return 'Display name contains restricted terms';
    }
  }
  
  return null;
}

function getDisplayName(profile) {
  if (!profile) return 'Unknown';
  
  if (profile.display_name && profile.display_name.trim()) {
    return profile.display_name;
  }
  
  if (profile.username && profile.username.trim()) {
    return profile.username;
  }
  
  if (profile.email) {
    const localPart = sanitizeEmailForDisplay(profile.email);
    if (localPart) return localPart;
  }
  
  return 'Unknown';
}

function getDisplayInitials(profile) {
  const name = getDisplayName(profile);
  
  if (name === 'Unknown') return '?';
  
  const parts = name.trim().split(/\s+/);
  
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts[0].length >= 2) {
    return parts[0].substring(0, 2).toUpperCase();
  } else {
    return parts[0][0].toUpperCase();
  }
}

console.log('🧪 Testing Display Name Sanitization\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

function test(name, actual, expected) {
  if (actual === expected) {
    console.log(`✅ ${name}`);
    console.log(`   Result: "${actual}"`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Got:      "${actual}"`);
    failed++;
  }
}

function testValidation(name, input, shouldBeValid) {
  const error = validateDisplayName(input);
  const isValid = error === null;
  
  if (isValid === shouldBeValid) {
    console.log(`✅ ${name}`);
    if (error) console.log(`   Error: ${error}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    console.log(`   Expected: ${shouldBeValid ? 'valid' : 'invalid'}`);
    console.log(`   Got: ${isValid ? 'valid' : 'invalid'} (${error || 'no error'})`);
    failed++;
  }
}

// Test 1: Basic Sanitization
console.log('\n📝 Basic Sanitization Tests');
console.log('-'.repeat(40));

test('Trim whitespace', 
  sanitizeDisplayName('  John Doe  '), 
  'John Doe'
);

test('Collapse multiple spaces', 
  sanitizeDisplayName('John    Doe'), 
  'John Doe'
);

test('Remove control characters', 
  sanitizeDisplayName('John\u0000Doe\u0001'), 
  'JohnDoe'
);

test('Remove zero-width characters', 
  sanitizeDisplayName('John\u200BDoe'), 
  'JohnDoe'
);

// Test 2: Emoji Handling
console.log('\n😊 Emoji Handling Tests');
console.log('-'.repeat(40));

test('Preserve single emoji', 
  sanitizeDisplayName('John 👨‍💻 Doe'), 
  'John 👨‍💻 Doe'
);

test('Preserve multiple emoji', 
  sanitizeDisplayName('🏌️ Golf Pro ⛳'), 
  '🏌️ Golf Pro ⛳'
);

test('Emoji at boundaries', 
  sanitizeDisplayName('👋 Hello World 🌍'), 
  '👋 Hello World 🌍'
);

// Test 3: Length Truncation
console.log('\n📏 Length Truncation Tests');
console.log('-'.repeat(40));

const longName = 'This is a very long display name that exceeds the maximum allowed length';
test('Truncate long string', 
  sanitizeDisplayName(longName, 40).length <= 40, 
  true
);

test('Truncate at 40 chars by default', 
  sanitizeDisplayName(longName), 
  'This is a very long display name that e'
);

test('Custom max length', 
  sanitizeDisplayName('Hello World', 5), 
  'Hello'
);

// Test 4: XSS Prevention
console.log('\n🛡️ XSS Prevention Tests');
console.log('-'.repeat(40));

test('Remove script tags', 
  sanitizeDisplayName('<script>alert("xss")</script>John'), 
  'John'
);

test('Remove HTML tags', 
  sanitizeDisplayName('<b>John</b> <i>Doe</i>'), 
  'John Doe'
);

test('Handle complex HTML', 
  sanitizeDisplayName('<div onclick="alert()">John</div>'), 
  'John'
);

// Test 5: International Characters
console.log('\n🌍 International Character Tests');
console.log('-'.repeat(40));

test('Spanish characters', 
  sanitizeDisplayName('José María'), 
  'José María'
);

test('Japanese characters', 
  sanitizeDisplayName('田中太郎'), 
  '田中太郎'
);

test('Arabic characters', 
  sanitizeDisplayName('محمد أحمد'), 
  'محمد أحمد'
);

test('Mixed scripts', 
  sanitizeDisplayName('John 田中 José'), 
  'John 田中 José'
);

// Test 6: Email Sanitization
console.log('\n📧 Email Display Tests');
console.log('-'.repeat(40));

test('Extract email local part', 
  sanitizeEmailForDisplay('john.doe@example.com'), 
  'john.doe'
);

test('Remove special chars from email', 
  sanitizeEmailForDisplay('john+tag@example.com'), 
  'johntag'
);

test('Truncate long email local part', 
  sanitizeEmailForDisplay('verylongemailaddress123456789@example.com', 10), 
  'verylongem'
);

// Test 7: Display Name Validation
console.log('\n✅ Validation Tests');
console.log('-'.repeat(40));

testValidation('Valid name', 'John Doe', true);
testValidation('Too short', 'J', false);
testValidation('Empty string', '', false);
testValidation('Only spaces', '   ', false);
testValidation('Reserved word - admin', 'Admin User', false);
testValidation('Reserved word - moderator', 'Site Moderator', false);
testValidation('Reserved word - official', 'Official Account', false);
testValidation('Valid with emoji', 'John 🏌️', true);
testValidation('Valid international', 'José María', true);

// Test 8: Display Name Utilities
console.log('\n🔧 Display Name Utility Tests');
console.log('-'.repeat(40));

const profile1 = {
  display_name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com'
};

test('Get display name - has display_name', 
  getDisplayName(profile1), 
  'John Doe'
);

test('Get display name - fallback to username', 
  getDisplayName({ username: 'johndoe', email: 'john@example.com' }), 
  'johndoe'
);

test('Get display name - fallback to email', 
  getDisplayName({ email: 'john@example.com' }), 
  'john'
);

test('Get display name - null profile', 
  getDisplayName(null), 
  'Unknown'
);

test('Get initials - two words', 
  getDisplayInitials({ display_name: 'John Doe' }), 
  'JD'
);

test('Get initials - single word', 
  getDisplayInitials({ display_name: 'John' }), 
  'JO'
);

test('Get initials - emoji name', 
  getDisplayInitials({ display_name: '🏌️ Golfer' }), 
  '🏌️G'
);

// Test 9: Edge Cases
console.log('\n🔄 Edge Case Tests');
console.log('-'.repeat(40));

test('Handle null input', 
  sanitizeDisplayName(null), 
  ''
);

test('Handle undefined input', 
  sanitizeDisplayName(undefined), 
  ''
);

test('Only control characters', 
  sanitizeDisplayName('\u0000\u0001\u0002'), 
  ''
);

test('Mixed newlines and tabs', 
  sanitizeDisplayName('John\n\t\r\nDoe'), 
  'John Doe'
);

// Test 10: Real-World Examples
console.log('\n🌟 Real-World Example Tests');
console.log('-'.repeat(40));

test('Discord-style username', 
  sanitizeDisplayName('JohnDoe#1234'), 
  'JohnDoe#1234'
);

test('Twitter handle', 
  sanitizeDisplayName('@johndoe'), 
  '@johndoe'
);

test('Gaming tag', 
  sanitizeDisplayName('[CLAN] xX_John_Xx'), 
  '[CLAN] xX_John_Xx'
);

test('Professional name', 
  sanitizeDisplayName('Dr. John Doe, Ph.D.'), 
  'Dr. John Doe, Ph.D.'
);

test('Company name', 
  sanitizeDisplayName('John @ ACME Corp.'), 
  'John @ ACME Corp.'
);

// Summary
console.log('\n' + '=' .repeat(60));
console.log('\n📊 Test Results:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Display name sanitization is working correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}

// Demonstrate real usage
console.log('\n📝 Real Usage Examples:');
console.log('=' .repeat(60));

const examples = [
  '  John Doe  ',
  '<script>alert()</script>Bobby',
  'Super Long Name That Goes On Forever And Ever And Ever',
  'José María 🏌️‍♂️',
  'admin@teed.club',
  '\u0000Evil\u0001User\u0002',
  '    Multiple    Spaces    Here    '
];

console.log('\nInput → Sanitized Output:');
examples.forEach(input => {
  const output = sanitizeDisplayName(input);
  const validation = validateDisplayName(output);
  console.log(`"${input}"`);
  console.log(`  → "${output}" ${validation ? `(Invalid: ${validation})` : '(Valid)'}`);
});