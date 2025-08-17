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
      // Add HMR configuration for better stability
      hmr: {
        overlay: true,
        timeout: 5000,
      },
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
      chunkSizeWarningLimit: 600,
      sourcemap: mode === 'development', // Enable sourcemaps in development
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
        '@dnd-kit/sortable',
        '@dnd-kit/core',
        '@dnd-kit/utilities',
        'clsx',
        '@radix-ui/react-slot',
        '@radix-ui/react-dialog',
      ],
      exclude: [],
      // Don't force in development to avoid constant re-optimization
      force: false,
      // Entries to optimize even if not directly imported
      entries: [
        'src/components/equipment/*.tsx',
        'src/components/bag/*.tsx',
      ],
    },
  };
});
