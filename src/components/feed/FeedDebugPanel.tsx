import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';

export function FeedDebugPanel() {
  const [feedCount, setFeedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkFeedPosts();
  }, []);

  const checkFeedPosts = async () => {
    try {
      const { count, error } = await supabase
        .from('feed_posts')
        .select('*', { count: 'exact', head: true });

      if (error) {
        setError(error.message);
      } else {
        setFeedCount(count || 0);
      }
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <Card className="glass-card p-3 mb-4">
      <div className="text-xs text-white/60">
        <div>Feed Debug:</div>
        {error ? (
          <div className="text-red-500">Error: {error}</div>
        ) : (
          <div>Total feed posts in DB: {feedCount}</div>
        )}
        <a href="/debug-feed" className="text-primary hover:underline">
          View detailed debug →
        </a>
      </div>
    </Card>
  );
}