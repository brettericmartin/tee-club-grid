#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Revert the broken files to their previous state using git
const brokenFiles = [
  'src/App.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/FeedErrorBoundary.tsx',
  'src/components/auth/SignInModal.tsx',
  'src/components/badges/BadgeNotificationToast.tsx',
  'src/components/badges/BadgeProgress.tsx',
  'src/components/bag/BagEquipmentGallery.tsx',
  'src/components/bag/BagGalleryDndKit.tsx',
  'src/components/bag/BagSelectorDialog.tsx',
  'src/components/bags/BagCard.tsx',
  'src/components/comments/CommentCard.tsx',
  'src/components/comments/CommentInput.tsx',
  'src/components/comments/CommentThread.tsx',
  'src/components/equipment/AIEquipmentAnalyzer.tsx',
  'src/components/equipment/EquipmentSelectorSimple.tsx',
  'src/components/equipment/ReviewForm.tsx',
  'src/components/equipment/ReviewList.tsx',
  'src/components/equipment-detail/SpecsOverview.tsx',
  'src/components/equipment-detail/TechnicalSpecsGrid.tsx',
  'src/components/equipment-detail/TourUsageSection.tsx',
  'src/components/feed/CreatePostModal.tsx',
  'src/components/feed/EditPostDialog.tsx',
  'src/components/feed/EditableFeedItemCard.tsx',
  'src/components/feed/MultiEquipmentPhotoUpload.tsx',
  'src/components/feed/SinglePhotoUpload.tsx',
  'src/components/feed/UserFeedView.tsx',
  'src/components/forum/CreateThread.tsx',
  'src/components/forum/EquipmentTagger.tsx',
  'src/components/forum/ForumErrorBoundary.tsx',
  'src/components/forum/ForumSearch.tsx',
  'src/components/forum/ForumThreadPreview.tsx',
  'src/components/forum/PostCard.tsx',
  'src/components/forum/PostEditor.tsx',
  'src/components/forum/PostThread.tsx',
  'src/components/forum/ThreadCard.tsx',
  'src/components/landing/BagShowcaseLarge.tsx',
  'src/components/landing/GearGrid.tsx',
  'src/components/landing/Hero.tsx',
  'src/components/landing/StickyCta.tsx',
  'src/components/profile/AvatarUpload.tsx',
  'src/components/profile/ProfileDialog.tsx',
  'src/components/shared/DataLoader.tsx',
  'src/components/shared/ImageCropDialog.tsx',
  'src/components/shared/UnifiedPhotoUploadDialog.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/card.tsx',
  'src/components/ui/command.tsx',
  'src/components/ui/dialog.tsx',
  'src/components/ui/drawer.tsx',
  'src/components/ui/sheet.tsx',
  'src/pages/BadgePreview.tsx',
  'src/pages/BagDisplayStyled.tsx',
  'src/pages/DebugFeed.tsx',
  'src/pages/Feed.tsx',
  'src/pages/Forum.tsx',
  'src/pages/Landing.tsx',
  'src/pages/MyBagSupabase.tsx',
  'src/pages/PatchNotes.tsx'
];

console.log('🔧 Reverting broken files to fix syntax errors...\n');

let revertedCount = 0;
let failedCount = 0;

for (const file of brokenFiles) {
  const fullPath = path.join(process.cwd(), file);
  
  try {
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${file}`);
      continue;
    }
    
    // Revert the file using git
    execSync(`git checkout HEAD -- ${file}`, { cwd: process.cwd() });
    console.log(`✅ Reverted: ${file}`);
    revertedCount++;
  } catch (error) {
    console.log(`❌ Failed to revert: ${file}`);
    console.log(`   Error: ${error.message}`);
    failedCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ Successfully reverted: ${revertedCount} files`);
if (failedCount > 0) {
  console.log(`❌ Failed to revert: ${failedCount} files`);
}
console.log('='.repeat(60));

console.log('\n🎯 Next steps:');
console.log('1. The problematic glassmorphism removal has been reverted');
console.log('2. We will now apply a more careful approach to remove glassmorphism');
console.log('3. This will preserve proper JSX formatting and avoid syntax errors');