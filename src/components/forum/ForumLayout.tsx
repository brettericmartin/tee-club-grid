import { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, Plus, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import CreateThread from './CreateThread';
import ForumSearch from './ForumSearch';
import { ForumErrorBoundary } from './ForumErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import Forum from '@/pages/Forum';
import ForumCategory from '@/pages/ForumCategory';
import ForumThread from '@/pages/ForumThread';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  thread_count?: number;
}

export default function ForumLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Extract current category and thread from URL
  const pathParts = location.pathname.split('/');
  const currentCategorySlug = pathParts[2];
  const currentThreadId = pathParts[3];
  const isInThread = Boolean(currentThreadId && currentThreadId !== 'new');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Fetch thread counts for each category
      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (category) => {
          const { count } = await supabase
            .from('forum_threads')
            .select('*', { count: 'exact' })
            .eq('category_id', category.id);

          return { ...category, thread_count: count || 0 };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const CategoryList = () => (
    <>
      <div className="mb-6">
        <Button
          onClick={() => navigate('/forum')}
          variant={!currentCategorySlug ? 'secondary' : 'ghost'}
          className="w-full justify-start"
        >
          <span className="mr-2">🏠</span>
          All Categories
        </Button>
      </div>

      <div className="space-y-1">
        {categories.map((category) => (
          <Button
            key={category.id}
            onClick={() => {
              navigate(`/forum/${category.slug}`);
              setMobileMenuOpen(false);
            }}
            variant={currentCategorySlug === category.slug ? 'secondary' : 'ghost'}
            className="w-full justify-start"
          >
            <span className="mr-2">{category.icon}</span>
            <span className="flex-1 text-left">{category.name}</span>
            {category.thread_count !== undefined && (
              <span className="text-xs text-muted-foreground">
                {category.thread_count}
              </span>
            )}
          </Button>
        ))}
      </div>
    </>
  );

  // Breadcrumb navigation
  const getBreadcrumbs = () => {
    const breadcrumbs = [{ name: 'Forum', path: '/forum' }];
    
    if (currentCategorySlug) {
      const category = categories.find(c => c.slug === currentCategorySlug);
      if (category) {
        breadcrumbs.push({ name: category.name, path: `/forum/${category.slug}` });
      }
    }

    // Add thread title if on thread page
    const threadId = pathParts[3];
    if (threadId && threadId !== 'new') {
      breadcrumbs.push({ name: 'Thread', path: location.pathname });
    }

    return breadcrumbs;
  };

  return (
    <div className="min-h-screen bg-[#111111]">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-16 z-40 bg-[#1a1a1a] border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-[#1a1a1a] border-white/10">
              <ScrollArea className="h-full py-6">
                <h2 className="text-lg font-semibold mb-4 px-4">Categories</h2>
                <div className="px-4">
                  <CategoryList />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
            {user && (
              <Button
                size="sm"
                className="bg-[#10B981] hover:bg-[#0ea674]"
                onClick={() => {
                  if (isInThread) {
                    // Scroll to reply editor at bottom of thread
                    const replyEditor = document.querySelector('[data-reply-editor]');
                    if (replyEditor) {
                      replyEditor.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Focus the textarea after scrolling
                      setTimeout(() => {
                        const textarea = replyEditor.querySelector('textarea');
                        if (textarea) textarea.focus();
                      }, 500);
                    }
                  } else {
                    setShowCreateThread(true);
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {isInThread ? 'Reply' : 'New'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Desktop Breadcrumbs */}
        <div className="hidden lg:flex items-center gap-2 text-sm text-gray-400 mb-6">
          {getBreadcrumbs().map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-4 w-4" />}
              <button
                onClick={() => navigate(crumb.path)}
                className="hover:text-white transition-colors"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <div className="bg-[#1a1a1a] rounded-lg p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Categories</h2>
                  {user && (
                    <Button
                      size="sm"
                      className="bg-[#10B981] hover:bg-[#0ea674]"
                      onClick={() => {
                        if (isInThread) {
                          // Scroll to reply editor at bottom of thread
                          const replyEditor = document.querySelector('[data-reply-editor]');
                          if (replyEditor) {
                            replyEditor.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // Focus the textarea after scrolling
                            setTimeout(() => {
                              const textarea = replyEditor.querySelector('textarea');
                              if (textarea) textarea.focus();
                            }, 500);
                          }
                        } else {
                          setShowCreateThread(true);
                        }
                      }}
                      title={isInThread ? 'Reply to thread' : 'Create new thread'}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CategoryList />

                <div className="mt-6 pt-6 border-t border-white/10">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setShowSearch(true)}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search Forum
                  </Button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <ForumErrorBoundary>
              <Suspense fallback={
                <div className="space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              }>
                <Routes>
                  <Route index element={<Forum />} />
                  <Route path=":category" element={<ForumCategory />} />
                  <Route path=":category/:thread" element={<ForumThread />} />
                </Routes>
              </Suspense>
            </ForumErrorBoundary>
          </main>
        </div>
      </div>

      {/* Modals */}
      <CreateThread
        open={showCreateThread}
        onOpenChange={setShowCreateThread}
        defaultCategory={currentCategorySlug}
        categories={categories}
      />

      <ForumSearch
        open={showSearch}
        onOpenChange={setShowSearch}
      />
    </div>
  );
}