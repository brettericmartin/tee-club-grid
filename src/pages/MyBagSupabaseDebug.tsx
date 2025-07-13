import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const MyBagSupabaseDebug = () => {
  console.log('[DEBUG] Component rendering started');
  
  let authContext;
  try {
    authContext = useAuth();
    console.log('[DEBUG] Auth context loaded successfully');
  } catch (error) {
    console.error('[DEBUG] Auth context error:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Error loading authentication</h2>
          <p className="text-white/70">Please try refreshing the page</p>
        </div>
      </div>
    );
  }
  
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  
  // Extract values after all hooks
  if (!authContext) {
    console.log('[DEBUG] No auth context, redirecting');
    return <Navigate to="/" replace />;
  }
  
  const user = authContext.user || null;
  const authLoading = authContext.loading || false;
  
  console.log('[DEBUG] User:', user);
  console.log('[DEBUG] User type:', typeof user);
  console.log('[DEBUG] Auth loading:', authLoading);

  useEffect(() => {
    console.log('[DEBUG] useEffect running, user:', user);
    
    if (user) {
      // Test basic operations
      try {
        console.log('[DEBUG] Testing String conversion on user.id');
        const userId = String(user.id);
        console.log('[DEBUG] User ID as string:', userId);
        
        // Test template literal
        console.log('[DEBUG] Testing template literal');
        const testStr = `User ID: ${user.id}`;
        console.log('[DEBUG] Template literal result:', testStr);
        
        // Test database query
        console.log('[DEBUG] Testing database query');
        supabase
          .from('user_bags')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .then(({ data, error }) => {
            console.log('[DEBUG] Database query result:', { data, error });
            if (data && data.length > 0) {
              console.log('[DEBUG] First bag:', data[0]);
              setTestData(data[0]);
            }
            setLoading(false);
          })
          .catch(err => {
            console.error('[DEBUG] Database error:', err);
            setLoading(false);
          });
          
      } catch (error) {
        console.error('[DEBUG] Error in useEffect:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10">
        <Navigation />
        <div className="container mx-auto px-4 pt-32">
          <div className="max-w-md mx-auto text-center">
            <div className="glass-card p-8">
              <h1 className="text-3xl font-bold text-white mb-4">Sign In Required</h1>
              <p className="text-white/70">Please sign in to view this page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10">
        <Navigation />
        <div className="container mx-auto px-4 pt-32">
          <div className="text-white text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10">
      <Navigation />
      <div className="container mx-auto px-4 pt-20 pb-8">
        <h1 className="text-3xl font-bold text-white mb-8">Debug Page</h1>
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Debug Information</h2>
          <pre className="text-white text-sm overflow-auto">
            {JSON.stringify({
              userId: user?.id,
              userEmail: user?.email,
              hasTestData: !!testData,
              testDataId: testData?.id
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default MyBagSupabaseDebug;