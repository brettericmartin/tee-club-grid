# Dynamic Import Issue Resolution Agent Specification

## Purpose
A specialized sub-agent focused on diagnosing and resolving dynamic import issues in React/Vite applications, particularly addressing module loading failures, HMR issues, and lazy loading problems.

## Core Capabilities

### 1. Diagnostic Analysis
- **File Existence Verification**: Check if all dynamically imported modules exist at specified paths
- **Export Analysis**: Verify default exports and named exports in target modules
- **Circular Dependency Detection**: Identify circular import chains that break dynamic loading
- **HMR Compatibility**: Detect patterns that cause Hot Module Replacement failures
- **Vite Configuration Analysis**: Review build tool settings affecting dynamic imports

### 2. Common Issue Patterns

#### Pattern A: Missing Default Export
```typescript
// PROBLEM: Component doesn't export default
export const MyComponent = () => { ... }

// SOLUTION: Add default export
export default MyComponent;
```

#### Pattern B: Vite HMR Connection Lost
```typescript
// PROBLEM: Basic lazy import fails on HMR
const Component = lazy(() => import('./Component'));

// SOLUTION: Implement retry logic
const Component = lazyWithRetry(() => import('./Component'));
```

#### Pattern C: Circular Dependencies
```typescript
// PROBLEM: A imports B, B imports A
// FileA.tsx imports from FileB.tsx
// FileB.tsx imports from FileA.tsx

// SOLUTION: Extract shared logic to third module
```

### 3. Resolution Strategies

#### Strategy 1: Retry Logic Implementation
```typescript
export async function retryDynamicImport<T = any>(
  fn: () => Promise<{ default: T }>,
  retriesLeft = 3,
  interval = 500
): Promise<{ default: T }> {
  try {
    return await fn();
  } catch (error) {
    if (retriesLeft === 0) throw error;
    await new Promise(r => setTimeout(r, interval));
    return retryDynamicImport(fn, retriesLeft - 1, interval * 2);
  }
}
```

#### Strategy 2: Vite Configuration Optimization
```typescript
// vite.config.ts
optimizeDeps: {
  include: ['react', 'react-dom', /* prebundle deps */],
  exclude: [], // Exclude problematic packages
  force: true, // Force re-optimization
  entries: ['src/components/**/*.tsx'] // Pre-scan entries
}
```

#### Strategy 3: Error Boundary Protection
```typescript
<ErrorBoundary fallback={<LoadingError />}>
  <Suspense fallback={<Loading />}>
    <LazyComponent />
  </Suspense>
</ErrorBoundary>
```

### 4. Diagnostic Script Output Format

```json
{
  "timestamp": "2024-01-10T10:00:00Z",
  "issues": 0,
  "warnings": 3,
  "suggestions": 2,
  "details": {
    "issues": [],
    "warnings": [
      "⚠️ useEffect without cleanup in Component.tsx",
      "⚠️ Lazy components without Suspense wrapper",
      "⚠️ Re-export pattern might cause issues"
    ],
    "suggestions": [
      "📝 Add retry logic to dynamic imports",
      "📝 Preload critical components"
    ]
  }
}
```

## Implementation Checklist

### Pre-Flight Checks
- [ ] Verify all component files exist
- [ ] Check for default exports in lazy-loaded components
- [ ] Scan for circular dependencies
- [ ] Review Vite/webpack configuration
- [ ] Check for React.lazy and Suspense imports

### Error Resolution Steps
1. **Identify Error Type**
   - Module not found
   - Loading chunk failed
   - HMR connection lost
   - Dynamic import syntax error

2. **Apply Appropriate Fix**
   - Add retry logic wrapper
   - Fix export statements
   - Break circular dependencies
   - Update build configuration
   - Add error boundaries

3. **Verify Resolution**
   - Run diagnostic script
   - Test HMR functionality
   - Verify production build
   - Check network tab for chunk loading

### Performance Optimization
- Implement component preloading for critical paths
- Use code splitting boundaries effectively
- Monitor bundle sizes and chunk creation
- Optimize dependency pre-bundling

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `error loading dynamically imported module` | HMR disconnection, network failure | Add retry logic |
| `Module not found` | Incorrect path or missing file | Verify file path and existence |
| `Loading chunk X failed` | Network issue or build problem | Implement retry with exponential backoff |
| `Cannot read properties of undefined` | Missing default export | Add default export to component |
| `Maximum call stack exceeded` | Circular dependency | Refactor to break circular chain |

## Monitoring & Logging

### Key Metrics to Track
- Dynamic import success rate
- Retry attempt frequency
- Average load time for lazy components
- HMR reconnection frequency
- Bundle size per route

### Debug Logging
```typescript
console.log('[DynamicImport] Loading:', modulePath);
console.log('[DynamicImport] Retry attempt:', attemptNumber);
console.log('[DynamicImport] Success after:', loadTime);
console.error('[DynamicImport] Failed:', error);
```

## Best Practices

1. **Always use Suspense** with lazy components
2. **Implement retry logic** for production resilience
3. **Add error boundaries** for graceful fallbacks
4. **Preload critical components** on route changes
5. **Monitor and log** dynamic import performance
6. **Test HMR** during development regularly
7. **Verify production builds** include all chunks
8. **Document dynamic imports** in code comments

## Testing Strategy

### Unit Tests
- Mock dynamic imports for testing
- Test retry logic with simulated failures
- Verify error boundary behavior

### Integration Tests
- Test lazy loading in different network conditions
- Verify chunk loading in production builds
- Test HMR recovery mechanisms

### E2E Tests
- Navigate through lazy-loaded routes
- Simulate network failures and recovery
- Test error boundary user experience

## Automated Diagnostic Tool Usage

```bash
# Run diagnostic
node scripts/diagnose-dynamic-imports.js

# Check specific component
node scripts/diagnose-dynamic-imports.js --component src/components/MyComponent.tsx

# Generate report
node scripts/diagnose-dynamic-imports.js --output report.json

# Fix common issues automatically
node scripts/diagnose-dynamic-imports.js --auto-fix
```

## Recovery Procedures

### When HMR Fails
1. Clear Vite cache: `rm -rf node_modules/.vite`
2. Restart dev server
3. Force dependency optimization
4. Check for syntax errors in recent changes

### When Production Build Fails
1. Clear build output directory
2. Check for missing dependencies
3. Verify all lazy imports resolve
4. Review chunk splitting configuration

### When Components Won't Load
1. Check browser console for specific errors
2. Verify network tab for failed chunk requests
3. Test component in isolation
4. Review recent changes to imports

## References
- [Vite Dynamic Import Documentation](https://vitejs.dev/guide/features.html#dynamic-import)
- [React.lazy Documentation](https://react.dev/reference/react/lazy)
- [Webpack Code Splitting](https://webpack.js.org/guides/code-splitting/)
- [Error Boundaries in React](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)