import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: true,
      port: 3333,
      strictPort: false,
      open: true,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor libraries
            'vendor-ui': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-avatar',
              '@radix-ui/react-accordion',
              '@radix-ui/react-progress',
              '@radix-ui/react-select',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-label',
            ],
            'vendor-forms': [
              'react-hook-form',
              '@hookform/resolvers',
              'zod',
            ],
            'vendor-db': [
              '@supabase/supabase-js',
            ],
            'vendor-routing': [
              'react-router-dom',
            ],
            'vendor-query': [
              '@tanstack/react-query',
            ],
            'vendor-utils': [
              'clsx',
              'tailwind-merge',
              'date-fns',
              'uuid',
              'sonner',
            ],
            'vendor-animation': [
              'framer-motion',
              '@dnd-kit/core',
              '@dnd-kit/sortable',
              '@dnd-kit/utilities',
            ],
            // Feature chunks - simplified to avoid circular dependencies
            'feature-equipment': [
              './src/pages/Equipment',
              './src/pages/EquipmentDetail',
            ],
            'feature-bags': [
              './src/pages/BagsBrowser',
              './src/pages/MyBagSupabase',
              './src/pages/BagDisplayStyled',
            ],
            'feature-feed': [
              './src/pages/Feed',
            ],
            'feature-admin': [
              './src/pages/admin/SeedEquipment',
              './src/pages/admin/EquipmentMigration',
              './src/pages/Debug',
              './src/pages/DebugFeed',
            ],
            'feature-forum': [
              './src/pages/Forum',
              './src/pages/ForumIndex',
              './src/pages/ForumCategory',
              './src/pages/ForumThread',
            ],
          },
        },
      },
      // Increase chunk size warning limit since we're splitting intentionally
      chunkSizeWarningLimit: 600,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query',
      ],
    },
  };
});
