import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAdmin } from "@/hooks/useAdminAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AdminGuardProps {
  children: React.ReactNode;
  fallbackPath?: string; // Where to redirect non-admins (default: "/")
}

export function AdminGuard({ children, fallbackPath = "/" }: AdminGuardProps) {
  const { user } = useAuth();
  const { isAuthorized, isLoading, error } = useRequireAdmin();
  const location = useLocation();
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  useEffect(() => {
    // Once we know the admin status, show access denied if not authorized
    if (!isLoading && user && !isAuthorized) {
      setShowAccessDenied(true);
      // Auto-redirect after 3 seconds
      const timer = setTimeout(() => {
        setShowAccessDenied(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, user, isAuthorized]);

  // Show loading skeleton while checking auth and admin status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-48 mx-auto bg-white/10" />
          <Skeleton className="h-64 w-full bg-white/10" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full bg-white/10" />
            <Skeleton className="h-4 w-3/4 bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated at all, redirect to home
  if (!user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // If authenticated but not admin, show access denied then redirect
  if (!isAuthorized) {
    if (showAccessDenied) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-[#1a1a1a] border-red-500/20">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-red-500" />
              </div>
              <CardTitle className="text-white">Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-white/60">
                {error 
                  ? `Admin verification failed: ${error}`
                  : 'You don\'t have permission to access this page. Admin privileges are required.'
                }
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => setShowAccessDenied(false)}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Go Back
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // User is admin, render children
  return <>{children}</>;
}