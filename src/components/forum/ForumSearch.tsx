import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, MessageSquare, User, Calendar, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { debounce } from 'lodash';

interface ForumSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  threads: any[];
  posts: any[];
}

export default function ForumSearch({ open, onOpenChange }: ForumSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ threads: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('id, name, slug, icon')
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults({ threads: [], posts: [] });
        return;
      }

      setLoading(true);
      try {
        // Search threads
        let threadsQuery = supabase
          .from('forum_threads')
          .select(`
            *,
            category:forum_categories(id, name, slug, icon),
            user:profiles(username, avatar_url)
          `)
          .ilike('title', `%${searchQuery}%`)
          .limit(10);

        if (selectedCategory) {
          threadsQuery = threadsQuery.eq('category_id', selectedCategory);
        }

        const { data: threads, error: threadsError } = await threadsQuery;

        // Search posts
        let postsQuery = supabase
          .from('forum_posts')
          .select(`
            *,
            thread:forum_threads!inner(
              id, title, slug,
              category:forum_categories(id, name, slug, icon)
            ),
            user:profiles(username, avatar_url)
          `)
          .ilike('content', `%${searchQuery}%`)
          .limit(10);

        if (selectedCategory) {
          postsQuery = postsQuery.eq('thread.category_id', selectedCategory);
        }

        const { data: posts, error: postsError } = await postsQuery;

        if (threadsError) throw threadsError;
        if (postsError) throw postsError;

        setResults({
          threads: threads || [],
          posts: posts || []
        });
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [selectedCategory]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const handleThreadClick = (thread: any) => {
    navigate(`/forum/${thread.category.slug}/${thread.id}`);
    onOpenChange(false);
    setQuery('');
  };

  const handlePostClick = (post: any) => {
    navigate(`/forum/${post.thread.category.slug}/${post.thread.id}#post-${post.id}`);
    onOpenChange(false);
    setQuery('');
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query || !text) return text || '';
    
    try {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? 
          <mark key={i} className="bg-yellow-500/30 text-yellow-200">{part}</mark> : 
          part
      );
    } catch (error) {
      console.error('Error highlighting text:', error);
      return text;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Forum</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search threads and posts..."
              className="pl-10 bg-white/5 border-white/10"
              autoFocus
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-400">Filter by category:</span>
            <Button
              variant={!selectedCategory ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory('')}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.icon} {category.name}
              </Button>
            ))}
          </div>

          {/* Results */}
          {query && (
            <Tabs defaultValue="threads" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5">
                <TabsTrigger value="threads">
                  Threads ({results.threads.length})
                </TabsTrigger>
                <TabsTrigger value="posts">
                  Posts ({results.posts.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="threads" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {loading ? (
                    <div className="text-center py-8 text-gray-400">
                      Searching...
                    </div>
                  ) : results.threads.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No threads found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {results.threads.map((thread) => (
                        <div
                          key={thread.id}
                          className="p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                          onClick={() => handleThreadClick(thread)}
                        >
                          <h4 className="font-medium mb-2">
                            {highlightMatch(thread.title, query)}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              {thread.category.icon} {thread.category.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {thread.user.username}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="posts" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {loading ? (
                    <div className="text-center py-8 text-gray-400">
                      Searching...
                    </div>
                  ) : results.posts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No posts found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {results.posts.map((post) => (
                        <div
                          key={post.id}
                          className="p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                          onClick={() => handlePostClick(post)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-400">
                              In thread: {post.thread.title}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2 mb-2">
                            {highlightMatch(post.content, query)}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              {post.thread.category.icon} {post.thread.category.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {post.user.username}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}