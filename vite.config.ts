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
          manualChunks(id) {
            // Vendor chunks - group by functionality
            if (id.includes('node_modules')) {
              // UI Components
              if (id.includes('@radix-ui')) {
                return 'vendor-ui';
              }
              // Forms and validation
              if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
                return 'vendor-forms';
              }
              // Database and API
              if (id.includes('@supabase')) {
                return 'vendor-db';
              }
              // Routing
              if (id.includes('react-router')) {
                return 'vendor-routing';
              }
              // State management
              if (id.includes('@tanstack/react-query')) {
                return 'vendor-query';
              }
              // Animation libraries
              if (id.includes('framer-motion') || id.includes('@dnd-kit')) {
                return 'vendor-animation';
              }
              // Date and time utilities
              if (id.includes('date-fns')) {
                return 'vendor-date';
              }
              // Other utilities
              if (id.includes('clsx') || id.includes('tailwind-merge') || 
                  id.includes('uuid') || id.includes('sonner') || id.includes('lucide-react')) {
                return 'vendor-utils';
              }
              // All other vendor code
              return 'vendor-misc';
            }

            // Application chunks - avoid circular dependencies
            if (id.includes('src/')) {
              // Shared components and utilities (loaded first)
              if (id.includes('src/components/ui/') || 
                  id.includes('src/lib/') || 
                  id.includes('src/utils/')) {
                return 'app-core';
              }
              
              // Services and hooks
              if (id.includes('src/services/') || 
                  id.includes('src/hooks/') || 
                  id.includes('src/contexts/')) {
                return 'app-services';
              }

              // Feature-specific components
              if (id.includes('src/components/equipment/')) {
                return 'components-equipment';
              }
              if (id.includes('src/components/bag/')) {
                return 'components-bag';
              }
              if (id.includes('src/components/forum/')) {
                return 'components-forum';
              }
              if (id.includes('src/components/badges/')) {
                return 'components-badges';
              }
              
              // Shared components
              if (id.includes('src/components/')) {
                return 'components-shared';
              }

              // Pages are handled by dynamic imports, don't chunk them
              if (id.includes('src/pages/')) {
                return undefined;
              }
            }
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
        'lucide-react',
        'date-fns',
        'sonner',
      ],
      // Force pre-bundling of dynamic imports in development
      force: mode === 'development',
    },
  };
});
