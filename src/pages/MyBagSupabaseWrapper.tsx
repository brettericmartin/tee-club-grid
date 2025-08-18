import ErrorBoundary from '@/components/ErrorBoundary';
import MyBagSupabase from './MyBagSupabase';

const MyBagSupabaseWrapper = () => {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10 flex items-center justify-center">
          <div className="glass-card p-8 max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">Error in MyBagSupabase</h2>
            <p className="text-white/70 mb-4">
              A Symbol conversion error occurred. This might be due to:
            </p>
            <ul className="text-white/70 list-disc list-inside space-y-1">
              <li>React DevTools extension</li>
              <li>Objects with Symbol properties</li>
              <li>Circular references in objects</li>
            </ul>
            <p className="text-white/70 mt-4">
              Try disabling browser extensions or refreshing the page.
            </p>
          </div>
        </div>
      }
    >
      <MyBagSupabase />
    </ErrorBoundary>
  );
};

export default MyBagSupabaseWrapper;
