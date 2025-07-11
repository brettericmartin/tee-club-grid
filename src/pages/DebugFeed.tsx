import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const DebugFeed = () => {
  const { user } = useAuth();
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkFeedSystem();
  }, []);

  const checkFeedSystem = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test 1: Check if we can query feed_posts
      const { data, error: queryError } = await supabase
        .from('feed_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (queryError) {
        setError(`Error querying feed_posts: ${queryError.message}`);
        console.error('Feed query error:', queryError);
      } else {
        setFeedPosts(data || []);
        console.log('Feed posts found:', data);
      }
    } catch (err) {
      setError(`Unexpected error: ${err}`);
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTestPost = async () => {
    if (!user) {
      toast.error('You must be logged in to create test posts');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('feed_posts')
        .insert({
          user_id: user.id,
          type: 'milestone',
          content: {
            caption: 'Test feed post created from debug page',
            test: true
          }
        })
        .select()
        .single();

      if (error) {
        toast.error(`Error creating test post: ${error.message}`);
        console.error('Create post error:', error);
      } else {
        toast.success('Test post created successfully!');
        console.log('Test post created:', data);
        checkFeedSystem(); // Refresh the list
      }
    } catch (err) {
      toast.error(`Unexpected error: ${err}`);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('feed_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        toast.error(`Error deleting post: ${error.message}`);
      } else {
        toast.success('Post deleted');
        checkFeedSystem();
      }
    } catch (err) {
      toast.error(`Error: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 pt-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Feed System Debug</h1>
        
        {/* Status */}
        <Card className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          {loading && <p>Checking feed system...</p>}
          {error && (
            <div className="text-red-500 bg-red-500/10 p-3 rounded">
              {error}
            </div>
          )}
          {!loading && !error && (
            <div className="text-green-500 bg-green-500/10 p-3 rounded">
              ✓ Feed system is accessible
            </div>
          )}
        </Card>

        {/* Actions */}
        <Card className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-2">
            <Button onClick={checkFeedSystem} variant="outline">
              Refresh Feed
            </Button>
            <Button onClick={createTestPost} disabled={!user}>
              Create Test Post
            </Button>
          </div>
          {!user && (
            <p className="text-sm text-white/60 mt-2">
              Login required to create test posts
            </p>
          )}
        </Card>

        {/* Feed Posts */}
        <Card className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">
            Feed Posts ({feedPosts.length})
          </h2>
          {feedPosts.length === 0 ? (
            <p className="text-white/60">No feed posts found</p>
          ) : (
            <div className="space-y-3">
              {feedPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 bg-white/5 rounded-lg space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">Type: {post.type}</p>
                      <p className="text-sm text-white/60">
                        User ID: {post.user_id}
                      </p>
                      <p className="text-sm text-white/60">
                        Created: {new Date(post.created_at).toLocaleString()}
                      </p>
                    </div>
                    {user?.id === post.user_id && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deletePost(post.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                  <div className="text-sm">
                    <p className="text-white/80">Content:</p>
                    <pre className="bg-black/30 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(post.content, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DebugFeed;