/**
 * Image optimization utilities for multi-equipment photo uploads
 * Follows CLAUDE.md performance requirements
 */

interface CompressionOptions {
  maxSize: number; // in bytes
  format: 'webp' | 'jpeg';
  fallback?: 'jpeg';
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Calculate dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number = 1200
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  let width = originalWidth;
  let height = originalHeight;
  
  if (originalWidth > maxDimension || originalHeight > maxDimension) {
    if (aspectRatio > 1) {
      // Landscape
      width = maxDimension;
      height = Math.round(maxDimension / aspectRatio);
    } else {
      // Portrait or square
      height = maxDimension;
      width = Math.round(maxDimension * aspectRatio);
    }
  }
  
  return { width, height };
}

/**
 * Compress image to meet size requirements
 * Per CLAUDE.md: Max 100KB for equipment photos
 */
export async function compressImage(
  file: File,
  options: CompressionOptions
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    img.onload = async () => {
      try {
        // Calculate optimal dimensions
        const { width, height } = calculateDimensions(
          img.width,
          img.height,
          options.maxWidth || 1200
        );
        
        canvas.width = width;
        canvas.height = height;
        
        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try WebP first (better compression)
        let blob = await canvasToBlob(canvas, 'image/webp', options.quality || 0.85);
        
        // If WebP is too large or not supported, fall back to JPEG
        if (!blob || blob.size > options.maxSize) {
          // Reduce quality progressively
          let quality = options.quality || 0.85;
          
          while (quality > 0.3) {
            blob = await canvasToBlob(canvas, 'image/jpeg', quality);
            
            if (blob && blob.size <= options.maxSize) {
              break;
            }
            
            quality -= 0.1;
          }
          
          // If still too large, reduce dimensions
          if (blob && blob.size > options.maxSize) {
            const scaleFactor = Math.sqrt(options.maxSize / blob.size);
            const newWidth = Math.round(width * scaleFactor);
            const newHeight = Math.round(height * scaleFactor);
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            blob = await canvasToBlob(canvas, 'image/jpeg', 0.7);
          }
        }
        
        if (!blob) {
          throw new Error('Failed to compress image');
        }
        
        // Create new file with compressed data
        const fileExtension = blob.type === 'image/webp' ? '.webp' : '.jpg';
        const fileName = file.name.replace(/\.[^/.]+$/, fileExtension);
        
        const compressedFile = new File([blob], fileName, {
          type: blob.type,
          lastModified: Date.now()
        });
        
        // Clean up
        URL.revokeObjectURL(img.src);
        
        resolve(compressedFile);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Helper to convert canvas to blob with promise
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

/**
 * Generate srcset for responsive images
 * Per CLAUDE.md: Provide srcset for 1x, 2x displays
 */
export async function generateSrcSet(
  file: File,
  sizes: number[] = [400, 800, 1200]
): Promise<{ [key: string]: string }> {
  const srcset: { [key: string]: string } = {};
  const img = new Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  return new Promise((resolve, reject) => {
    img.onload = async () => {
      try {
        for (const size of sizes) {
          const { width, height } = calculateDimensions(img.width, img.height, size);
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          const blob = await canvasToBlob(canvas, 'image/webp', 0.85);
          if (blob) {
            srcset[`${size}w`] = URL.createObjectURL(blob);
          }
        }
        
        URL.revokeObjectURL(img.src);
        resolve(srcset);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }
  
  // Check file size (max 10MB before compression)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be less than 10MB' };
  }
  
  // Check supported formats
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!supportedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported image format' };
  }
  
  return { valid: true };
}

/**
 * Create a preview URL for immediate display (optimistic UI)
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Clean up preview URLs to prevent memory leaks
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}