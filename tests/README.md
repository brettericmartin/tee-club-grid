# Waitlist & Beta Access Test Suite

## Overview

This test suite provides comprehensive coverage for the waitlist and beta access system, including E2E tests, integration tests, and unit tests.

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests using Puppeteer
│   └── waitlist-beta-flow.test.js
├── integration/            # API integration tests
│   └── waitlist-api.test.js
├── unit/                   # Component unit tests
│   └── BetaGuard.test.jsx
├── utils/                  # Test utilities
│   ├── test-helpers.js    # Helper functions for tests
│   └── mock-data.js       # Mock data for testing
├── setup.js               # Test environment setup
└── README.md              # This file
```

## Running Tests

### Install Dependencies

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest jest puppeteer
```

### Run All Tests

```bash
# Unit and integration tests with Vitest
npm run test

# E2E tests with Jest and Puppeteer
npm run test:e2e

# With coverage
npm run test:coverage
```

### Run Specific Test Types

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Watch mode for development
npm run test:watch
```

## Test Configuration

### Environment Variables

Create a `.env.test` file:

```env
# Test environment
TEST_URL=http://localhost:3333
API_URL=http://localhost:3333/api

# Supabase test instance
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_KEY=your-test-service-key

# Test authentication tokens
TEST_USER_TOKEN=your-test-user-jwt
TEST_ADMIN_TOKEN=your-test-admin-jwt

# Test data
TEST_INVITE_CODE=TEST-CODE
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

# Test mode
HEADLESS=true
SLOW_MO=0
```

### Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:e2e": "jest tests/e2e",
    "test:integration": "jest tests/integration",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

## Test Coverage

### E2E Tests (waitlist-beta-flow.test.js)

- ✅ Anonymous user → pending state flow
- ✅ High score user → auto-approval flow
- ✅ Beta at capacity → at_capacity state
- ✅ Invite code redemption flow
- ✅ BetaGuard route protection
- ✅ Analytics event tracking
- ✅ Form validation errors
- ✅ Mobile responsiveness
- ✅ Performance metrics

### Integration Tests (waitlist-api.test.js)

- ✅ POST /api/waitlist/submit validation
- ✅ Score calculation for different roles
- ✅ Duplicate submission handling
- ✅ GET /api/beta/summary
- ✅ POST /api/waitlist/approve (auth required)
- ✅ POST /api/waitlist/redeem
- ✅ Rate limiting
- ✅ Error handling

### Unit Tests (BetaGuard.test.jsx)

- ✅ Public beta flag bypass
- ✅ Beta access user allowed
- ✅ Non-beta user redirect
- ✅ Unauthenticated redirect
- ✅ Loading state
- ✅ Error handling
- ✅ Feature flag changes

## Test Utilities

### test-helpers.js

- `generateTestUser()` - Create test user data
- `generateWaitlistApplication()` - Create application data
- `generateHighScoreApplication()` - Create auto-approval candidate
- `cleanupTestData()` - Clean up after tests
- `TestAnalyticsTracker` - Track analytics events in tests
- `PerformanceMonitor` - Measure performance metrics

### mock-data.js

- Mock feature flags configurations
- Mock user profiles (beta, regular, admin)
- Mock waitlist applications
- Mock invite codes
- Mock API responses
- Test scenarios

## Debugging Tests

### Visual Debugging

E2E tests save screenshots to `test-screenshots/`:

- `waitlist-pending.png` - Pending state UI
- `waitlist-high-score.png` - Auto-approval flow
- `waitlist-at-capacity.png` - Capacity limit UI
- `waitlist-invite-code.png` - Invite redemption
- `beta-guard-redirect.png` - Route protection

### Running Tests in Headed Mode

```bash
HEADLESS=false npm run test:e2e
```

### Slow Motion Mode

```bash
SLOW_MO=250 npm run test:e2e
```

### Debug Single Test

```bash
npm run test -- --grep "should show pending state"
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:coverage
        
      - name: Run E2E tests
        run: |
          npm run build
          npm run preview &
          sleep 5
          npm run test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Troubleshooting

### Common Issues

1. **Puppeteer installation fails**
   ```bash
   # Install with specific Chromium
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install puppeteer
   ```

2. **Tests timeout**
   - Increase timeout in jest.config.js or vitest.config.js
   - Check if dev server is running for E2E tests

3. **Supabase connection errors**
   - Ensure Supabase local instance is running
   - Check environment variables

4. **Rate limiting in tests**
   - Add delays between API calls
   - Use mock responses for rapid testing

## Best Practices

1. **Test Isolation**
   - Each test should be independent
   - Clean up test data after each test
   - Use unique identifiers (timestamps)

2. **Mock External Services**
   - Mock Supabase for unit tests
   - Mock analytics for faster tests
   - Use test database for integration tests

3. **Performance**
   - Run E2E tests in parallel when possible
   - Use headless mode in CI
   - Cache dependencies in CI

4. **Maintenance**
   - Keep mock data up-to-date
   - Update tests when features change
   - Document test assumptions

## Contributing

When adding new features:

1. Write unit tests for components
2. Add integration tests for APIs
3. Create E2E tests for user flows
4. Update mock data if needed
5. Ensure all tests pass
6. Update this README

## License

Same as main project