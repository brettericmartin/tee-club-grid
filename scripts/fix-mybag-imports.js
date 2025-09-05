import fs from 'fs';
import path from 'path';

const filePath = '/home/brettm/development/tee-club-grid/src/pages/MyBagSupabase.tsx';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Remove Suspense from imports
content = content.replace(
  'import { useState, useEffect, Suspense } from "react";',
  'import { useState, useEffect } from "react";'
);

// Remove lazy import
content = content.replace(
  'import { lazyWithRetry } from "@/utils/dynamicImport";',
  ''
);

// Replace lazy loaded components with direct imports
content = content.replace(
  '// Lazy load heavy components with retry logic for Vite HMR stability\nconst BagGalleryDndKit = lazyWithRetry(() => import("@/components/bag/BagGalleryDndKit"));\n// EquipmentEditor removed - using BagEquipmentModal instead\nconst AIEquipmentAnalyzer = lazyWithRetry(() => import("@/components/equipment/AIEquipmentAnalyzer"));\nconst BagVideosTab = lazyWithRetry(() => import("@/components/bag/BagVideosTab"));\n\n// Import these directly to avoid dynamic import issues\nimport EquipmentSelectorImproved from "@/components/equipment/EquipmentSelectorImproved";\nimport AddEquipmentMethodDialog from "@/components/equipment/AddEquipmentMethodDialog";\nimport BagEquipmentModal from "@/components/bag/BagEquipmentModal";\nconst AIAnalysisResultsDialog = lazyWithRetry(() => import("@/components/equipment/AIAnalysisResultsDialog"));',
  '// Import all components directly to avoid dynamic import issues\nimport BagGalleryDndKit from "@/components/bag/BagGalleryDndKit";\nimport AIEquipmentAnalyzer from "@/components/equipment/AIEquipmentAnalyzer";\nimport BagVideosTab from "@/components/bag/BagVideosTab";\nimport EquipmentSelectorImproved from "@/components/equipment/EquipmentSelectorImproved";\nimport AddEquipmentMethodDialog from "@/components/equipment/AddEquipmentMethodDialog";\nimport BagEquipmentModal from "@/components/bag/BagEquipmentModal";\nimport AIAnalysisResultsDialog from "@/components/equipment/AIAnalysisResultsDialog";'
);

// Remove all Suspense wrappers (simple pattern)
content = content.replace(/<Suspense[^>]*>/g, '');
content = content.replace(/<\/Suspense>/g, '');

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Fixed MyBagSupabase.tsx - removed all lazy loading and Suspense');