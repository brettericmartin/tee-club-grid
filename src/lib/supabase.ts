import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.error('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set (hidden)' : 'Not set');
  console.error('All env vars:', import.meta.env);
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Enhanced Supabase client with proper auth settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'teed-club-auth',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-application-name': 'teed-club'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database types matching your existing Supabase schema
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name?: string;
          avatar_url?: string;
          handicap?: number;
          home_course?: string;
          years_playing?: number;
          location?: string;
          bio?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      equipment: {
        Row: {
          id: string;
          brand: string;
          model: string;
          category: string;
          image_url?: string;
          msrp?: number;
          specs?: Record<string, any>;
          popularity_score?: number;
          release_date?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['equipment']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['equipment']['Insert']>;
      };
      user_bags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description?: string;
          is_primary: boolean;
          is_public?: boolean;
          bag_type?: string;
          total_value?: number;
          likes_count?: number;
          views_count?: number;
          background_image?: string;
          layout_data?: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_bags']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_bags']['Insert']>;
      };
      bag_equipment: {
        Row: {
          id: string;
          bag_id: string;
          equipment_id: string;
          is_featured: boolean;
          purchase_date?: string;
          purchase_price?: number;
          notes?: string;
          custom_specs?: Record<string, any>;
          custom_photo_url?: string;
          shaft_id?: string;
          grip_id?: string;
          loft_option_id?: string;
          condition?: string;
          photo_crop_data?: Record<string, any>;
          position?: number;
          position_data?: Record<string, any>;
          added_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bag_equipment']['Row'], 'id' | 'added_at'>;
        Update: Partial<Database['public']['Tables']['bag_equipment']['Insert']>;
      };
      bag_likes: {
        Row: {
          id: string;
          user_id: string;
          bag_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bag_likes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['bag_likes']['Insert']>;
      };
      equipment_reviews: {
        Row: {
          id: string;
          user_id: string;
          equipment_id: string;
          rating: number;
          title?: string;
          content?: string;
          pros?: string[];
          cons?: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['equipment_reviews']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['equipment_reviews']['Insert']>;
      };
      equipment_saves: {
        Row: {
          id: string;
          user_id: string;
          equipment_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['equipment_saves']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['equipment_saves']['Insert']>;
      };
      equipment_wishlist: {
        Row: {
          id: string;
          user_id: string;
          equipment_id: string;
          priority?: 'high' | 'medium' | 'low';
          notes?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['equipment_wishlist']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['equipment_wishlist']['Insert']>;
      };
      equipment_photos: {
        Row: {
          id: string;
          user_id: string;
          equipment_id: string;
          photo_url: string;
          caption?: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['equipment_photos']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['equipment_photos']['Insert']>;
      };
      equipment_prices: {
        Row: {
          id: string;
          equipment_id: string;
          retailer: string;
          price: number;
          sale_price?: number;
          url?: string;
          in_stock: boolean;
          last_updated: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['equipment_prices']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['equipment_prices']['Insert']>;
      };
      equipment_discussions: {
        Row: {
          id: string;
          equipment_id: string;
          user_id: string;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['equipment_discussions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['equipment_discussions']['Insert']>;
      };
      discussion_comments: {
        Row: {
          id: string;
          discussion_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['discussion_comments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['discussion_comments']['Insert']>;
      };
      user_follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_follows']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_follows']['Insert']>;
      };
      photo_likes: {
        Row: {
          id: string;
          user_id: string;
          photo_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['photo_likes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['photo_likes']['Insert']>;
      };
      user_onboarding: {
        Row: {
          id: string;
          user_id: string;
          step: string;
          completed: boolean;
          data?: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_onboarding']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_onboarding']['Insert']>;
      };
      forum_posts: {
        Row: {
          id: string;
          thread_id: string;
          user_id: string;
          content: string;
          parent_post_id?: string | null;
          is_edited: boolean;
          edited_at?: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['forum_posts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['forum_posts']['Insert']>;
      };
      forum_threads: {
        Row: {
          id: string;
          category_id: string;
          user_id: string;
          title: string;
          slug: string;
          view_count: number;
          reply_count: number;
          last_post_at?: string | null;
          last_post_by?: string | null;
          is_pinned: boolean;
          is_locked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['forum_threads']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['forum_threads']['Insert']>;
      };
      forum_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description?: string | null;
          icon?: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['forum_categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['forum_categories']['Insert']>;
      };
      feed_posts: {
        Row: {
          id: string;
          user_id: string;
          content?: string;
          equipment_id?: string;
          bag_id?: string;
          photo_ids?: string[];
          post_type?: string;
          visibility?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['feed_posts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['feed_posts']['Insert']>;
      };
      feed_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['feed_likes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['feed_likes']['Insert']>;
      };
      feed_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['feed_comments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['feed_comments']['Insert']>;
      };
    };
  };
}