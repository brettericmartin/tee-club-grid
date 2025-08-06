import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PostEditor from './PostEditor';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import EquipmentTagger from './EquipmentTagger';
import { tagEquipmentInPost } from '@/services/forum';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'];

interface CreateThreadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: string;
  categories?: Category[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface ThreadFormProps {
  title: string;
  setTitle: (value: string) => void;
  content: string;
  setContent: (value: string) => void;
  categoryId: string;
  setCategoryId: (value: string) => void;
  categories: Category[];
  selectedEquipment: Equipment[];
  setSelectedEquipment: (equipment: Equipment[]) => void;
  errors: { title?: string; content?: string; category?: string };
  isSubmitting: boolean;
  loadingCategories?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

// Separate component to prevent re-mounting on state changes
const ThreadForm = ({
  title,
  setTitle,
  content,
  setContent,
  categoryId,
  setCategoryId,
  categories,
  selectedEquipment,
  setSelectedEquipment,
  errors,
  isSubmitting,
  loadingCategories = false,
  onSubmit,
  onCancel
}: ThreadFormProps) => {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={categoryId} onValueChange={setCategoryId} disabled={loadingCategories || categories.length === 0}>
          <SelectTrigger 
            id="category"
            className={cn(
              "bg-white/5 border-white/10",
              errors.category && "border-red-500"
            )}
          >
            <SelectValue placeholder={
              loadingCategories ? "Loading categories..." : 
              categories.length === 0 ? "No categories available" : 
              "Select a category"
            } />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10">
            {categories.length > 0 ? (
              categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span className="flex items-center gap-2">
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                  </span>
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {loadingCategories ? "Loading..." : "No categories found"}
              </div>
            )}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-red-500">{errors.category}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Thread Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's your question or topic?"
          className={cn(
            "bg-white/5 border-white/10",
            errors.title && "border-red-500"
          )}
          autoComplete="off"
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">First Post</Label>
        <PostEditor
          value={content}
          onChange={setContent}
          placeholder="Provide details, context, or start the discussion..."
          minHeight="200px"
        />
        {errors.content && (
          <p className="text-sm text-red-500">{errors.content}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Tag Related Equipment (optional)</Label>
        <p className="text-sm text-gray-400">Tag equipment mentioned in your discussion</p>
        <EquipmentTagger
          selectedEquipment={selectedEquipment}
          onEquipmentChange={setSelectedEquipment}
          maxSelections={5}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          className="bg-[#10B981] hover:bg-[#0ea674]"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Thread'}
        </Button>
      </div>
    </div>
  );
};

export default function CreateThread({ open, onOpenChange, defaultCategory, categories: propCategories }: CreateThreadProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>(propCategories || []);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; content?: string; category?: string }>({});
  const [loadingCategories, setLoadingCategories] = useState(false);
  const isMobile = useMediaQuery('(max-width: 640px)');

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setTitle('');
      setContent('');
      setCategoryId('');
      setErrors({});
      
      if (propCategories) {
        setCategories(propCategories);
      } else {
        fetchCategories();
      }
    }
  }, [open, propCategories]);

  useEffect(() => {
    if (defaultCategory && categories.length > 0) {
      const category = categories.find(c => c.slug === defaultCategory);
      if (category) {
        setCategoryId(category.id);
      }
    }
  }, [defaultCategory, categories]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setErrors(prev => ({ ...prev, category: 'Failed to load categories. Please try again.' }));
    } finally {
      setLoadingCategories(false);
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (!content.trim()) {
      newErrors.content = 'Content is required';
    } else if (content.length < 10) {
      newErrors.content = 'Content must be at least 10 characters';
    }

    if (!categoryId) {
      newErrors.category = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!user || !validateForm()) return;

    setIsSubmitting(true);
    try {
      // Create thread
      const { data: thread, error: threadError } = await supabase
        .from('forum_threads')
        .insert({
          title: title.trim(),
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          category_id: categoryId,
          user_id: user.id
        })
        .select()
        .single();

      if (threadError) throw threadError;

      // Create first post
      const { data: post, error: postError } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: thread.id,
          user_id: user.id,
          content: content.trim()
        })
        .select()
        .single();

      if (postError) throw postError;

      // Tag equipment if any selected
      if (selectedEquipment.length > 0 && post) {
        const equipmentIds = selectedEquipment.map(e => e.id);
        await tagEquipmentInPost(post.id, equipmentIds);
      }

      // Get category slug for navigation
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        navigate(`/forum/${category.slug}/${thread.id}`);
        onOpenChange(false);
        // Reset form
        setTitle('');
        setContent('');
        setCategoryId('');
        setSelectedEquipment([]);
        setErrors({});
      }
    } catch (error) {
      console.error('Error creating thread:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mobile: Use Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent 
          className="bg-[#1a1a1a] border-white/10"
          onOpenAutoFocus={(e) => {
            // Prevent auto-focus which causes text selection
            e.preventDefault();
          }}
        >
          <DrawerHeader>
            <DrawerTitle>New Thread</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-[80vh] overflow-y-auto">
            <ThreadForm
              title={title}
              setTitle={setTitle}
              content={content}
              setContent={setContent}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              categories={categories}
              selectedEquipment={selectedEquipment}
              setSelectedEquipment={setSelectedEquipment}
              errors={errors}
              isSubmitting={isSubmitting}
              loadingCategories={loadingCategories}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-[#1a1a1a] border-white/10 sm:max-w-2xl"
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus which causes text selection
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Create New Thread</DialogTitle>
        </DialogHeader>
        <ThreadForm
          title={title}
          setTitle={setTitle}
          content={content}
          setContent={setContent}
          categoryId={categoryId}
          setCategoryId={setCategoryId}
          categories={categories}
          selectedEquipment={selectedEquipment}
          setSelectedEquipment={setSelectedEquipment}
          errors={errors}
          isSubmitting={isSubmitting}
          loadingCategories={loadingCategories}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}