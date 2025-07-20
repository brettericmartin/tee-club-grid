import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ForumErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Forum error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ForumErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

function ForumErrorFallback({ error }: { error?: Error }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center p-4">
      <Card className="bg-[#1a1a1a] border-white/10 p-8 max-w-md w-full text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Forum Error</h2>
        <p className="text-gray-400 mb-6">
          Something went wrong while loading the forum. Please try again.
        </p>
        {error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">
              Error details
            </summary>
            <pre className="mt-2 text-xs bg-black/50 p-2 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Button>
          <Button
            onClick={() => window.location.reload()}
            className="gap-2 bg-[#10B981] hover:bg-[#0ea674]"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </Card>
    </div>
  );
}