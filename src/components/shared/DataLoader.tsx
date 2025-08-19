import React from 'react';
import { Loader2, AlertCircle, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataLoaderProps {
  loading?: boolean;
  error?: Error | null;
  empty?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  loadingMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function DataLoader({
  loading = false,
  error = null,
  empty = false,
  emptyMessage = "No data found",
  emptyIcon,
  loadingMessage = "Loading...",
  errorMessage,
  onRetry,
  children,
  className = ""
}: DataLoaderProps) {
  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center py-20 ${className}`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white/70">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center py-20 ${className}`}>
        <div className="text-center max-w-md">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
            <p className="text-white/70 mb-4">
              {errorMessage || error.message || "Failed to load data. Please try again."}
            </p>
            {onRetry && (
              <Button onClick={onRetry} className="bg-primary hover:bg-primary/90">
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (empty) {
    return (
      <div className={`flex items-center justify-center py-20 ${className}`}>
        <div className="text-center">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-12 max-w-md mx-auto">
            {emptyIcon || <Database className="w-16 h-16 text-white/30 mx-auto mb-4" />}
            <p className="text-white/70">{emptyMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // Data loaded successfully
  return <>{children}</>;
}

// Loading skeleton component for grid layouts
export function LoadingSkeleton({ 
  count = 6, 
  type = 'card' 
}: { 
  count?: number; 
  type?: 'card' | 'list' | 'grid' 
}) {
  if (type === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-48 bg-[#2a2a2a] rounded-xl animate-pulse" />
            <div className="h-4 bg-[#2a2a2a] rounded animate-pulse w-3/4" />
            <div className="h-4 bg-[#2a2a2a] rounded animate-pulse w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-4">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-[#2a2a2a] rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#2a2a2a] rounded animate-pulse w-1/3" />
                <div className="h-3 bg-[#2a2a2a] rounded animate-pulse w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-64 bg-[#2a2a2a] rounded-xl animate-pulse" />
          <div className="h-4 bg-[#2a2a2a] rounded animate-pulse w-3/4" />
          <div className="h-4 bg-[#2a2a2a] rounded animate-pulse w-1/2" />
        </div>
      ))}
    </div>
  );
}