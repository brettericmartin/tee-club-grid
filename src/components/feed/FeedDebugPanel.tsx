import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/contexts/FeedContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FeedDebugPanel() {
  const { user } = useAuth();
  const { userPosts } = useFeed();
  const [directQueryResult, setDirectQueryResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function debugQuery() {
      if (!user?.id) return;
      
      console.log('[FeedDebugPanel] Running debug query for user:', user.id);
      
      try {
        // Direct query to feed_posts
        const { data, error, count } = await supabase
          .from('feed_posts')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        setDirectQueryResult({
          error,
          data,
          count,
          userId: user.id
        });
        
        console.log('[FeedDebugPanel] Direct query result:', { error, dataLength: data?.length, count });
      } catch (e) {
        console.error('[FeedDebugPanel] Query error:', e);
      } finally {
        setLoading(false);
      }
    }
    
    debugQuery();
  }, [user?.id]);

  if (!user) {
    return (
      <Card className="bg-red-900/20 border-red-500/50 mb-4">
        <CardHeader>
          <CardTitle className="text-red-400">Debug: No User</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/70">User not loaded yet</p>
        </CardContent>
      </Card>
    );
  }

  const contextPosts = userPosts.get(user.id) || [];

  return (
    <Card className="bg-yellow-900/20 border-yellow-500/50 mb-4">
      <CardHeader>
        <CardTitle className="text-yellow-400">Feed Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-white/70">Current User ID:</p>
          <p className="text-white font-mono">{user.id}</p>
        </div>
        
        <div>
          <p className="text-white/70">Posts in Context (from useFeed):</p>
          <p className="text-white font-mono">{contextPosts.length} posts</p>
        </div>
        
        <div>
          <p className="text-white/70">Direct Database Query:</p>
          {loading ? (
            <p className="text-white/50">Loading...</p>
          ) : directQueryResult?.error ? (
            <p className="text-red-400">Error: {directQueryResult.error.message}</p>
          ) : (
            <>
              <p className="text-white font-mono">{directQueryResult?.count || 0} total posts</p>
              <p className="text-white font-mono">{directQueryResult?.data?.length || 0} posts returned</p>
              {directQueryResult?.data && directQueryResult.data.length > 0 && (
                <div className="mt-2">
                  <p className="text-white/70">Recent post types:</p>
                  {directQueryResult.data.map((post: any, i: number) => (
                    <p key={i} className="text-white/50 text-xs">
                      - {post.type} ({new Date(post.created_at).toLocaleDateString()})
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="pt-2 border-t border-white/10">
          <p className="text-yellow-400 text-xs">
            Check browser console for detailed logs
          </p>
        </div>
      </CardContent>
    </Card>
  );
}