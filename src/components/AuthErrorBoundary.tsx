import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { refreshSession } from '@/lib/authHelpers';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isAuthError: boolean;
  errorMessage: string;
  isRefreshing: boolean;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      isAuthError: false,
      errorMessage: '',
      isRefreshing: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is an auth-related error
    const errorMessage = error.message?.toLowerCase() || '';
    const isAuthError = 
      errorMessage.includes('jwt') ||
      errorMessage.includes('token') ||
      errorMessage.includes('expired') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('session') ||
      errorMessage.includes('401') ||
      errorMessage.includes('pgrst301');

    return {
      hasError: true,
      isAuthError,
      errorMessage: error.message
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Auth Error Boundary caught:', error, errorInfo);
  }

  handleRefreshSession = async () => {
    this.setState({ isRefreshing: true });
    
    try {
      const session = await refreshSession();
      
      if (session) {
        // Session refreshed successfully, reload the page
        window.location.reload();
      } else {
        // Session couldn't be refreshed, redirect to login
        this.handleSignIn();
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      this.setState({ 
        errorMessage: 'Failed to refresh session. Please sign in again.',
        isRefreshing: false 
      });
    }
  };

  handleSignIn = () => {
    // Redirect to sign in page
    window.location.href = '/signin';
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      isAuthError: false, 
      errorMessage: '',
      isRefreshing: false 
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isAuthError) {
        // Auth-specific error UI
        return (
          <div className="min-h-[400px] flex items-center justify-center p-8">
            <div className="max-w-md w-full space-y-6 text-center">
              <div className="flex justify-center">
                <div className="p-4 bg-orange-500/10 rounded-full">
                  <AlertCircle className="h-12 w-12 text-orange-500" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Session Expired</h2>
                <p className="text-gray-400">
                  Your session has expired. Please refresh or sign in again to continue.
                </p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={this.handleRefreshSession}
                  disabled={this.state.isRefreshing}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {this.state.isRefreshing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing Session...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Session
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={this.handleSignIn}
                  variant="outline"
                  className="w-full"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In Again
                </Button>
              </div>
              
              {this.state.errorMessage && (
                <div className="text-sm text-gray-500 mt-4 p-3 bg-gray-900 rounded-lg">
                  <code className="text-xs">{this.state.errorMessage}</code>
                </div>
              )}
            </div>
          </div>
        );
      }
      
      // Generic error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="p-4 bg-red-500/10 rounded-full">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
              <p className="text-gray-400">
                An unexpected error occurred. Please try again.
              </p>
            </div>
            
            <Button 
              onClick={this.handleRetry}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            
            {this.state.errorMessage && (
              <div className="text-sm text-gray-500 mt-4 p-3 bg-gray-900 rounded-lg">
                <code className="text-xs">{this.state.errorMessage}</code>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}