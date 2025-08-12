import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, AlertCircle, Camera, X, Clock, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { aiFlowMetrics } from '@/utils/performanceMonitor';

interface AIEquipmentAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (results: AnalysisResult) => void;
}

export interface AnalysisResult {
  clubs: Array<{
    type: string;
    brand: string;
    model?: string;
    confidence: number;
    details?: {
      shaft?: string;
      grip?: string;
      loft?: string;
    };
    matchedEquipmentId?: string;
    verifiedBrand?: string;
    verifiedModel?: string;
  }>;
  bagInfo?: {
    brand?: string;
    model?: string;
    color?: string;
  };
  accessories?: Array<{
    type: string;
    description: string;
  }>;
  overallConfidence: number;
}

export default function AIEquipmentAnalyzer({
  isOpen,
  onClose,
  onAnalysisComplete
}: AIEquipmentAnalyzerProps) {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState<'idle' | 'uploading' | 'analyzing' | 'processing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const analyzeImage = async (base64Image: string, mimeType: string) => {
    if (!user) {
      setError('You must be logged in to use this feature');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisStep('uploading');
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      setAnalysisStep('analyzing');
      setUploadProgress(100);
      aiFlowMetrics.trackUploadComplete();
      aiFlowMetrics.trackAnalysisStart();

      console.log('[AI-Analyzer] Starting analysis:', { 
        fileSize: base64Image.length,
        mimeType,
        timestamp: new Date().toISOString()
      });

      const response = await fetch('/api/equipment/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          image: base64Image,
          mimeType
        })
      });

      // Check Content-Type before parsing JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Try to get text content for debugging
        const text = await response.text();
        console.error('[AI-Analyzer] Non-JSON response:', { 
          contentType,
          statusCode: response.status,
          responseText: text.substring(0, 500) // First 500 chars for debugging
        });
        throw new Error(`Received non-JSON response from server (${response.status})`);
      }
      
      console.log('[AI-Analyzer] API response:', { 
        statusCode: response.status,
        success: data.success,
        clubsDetected: data.analysis?.clubs?.length || 0,
        confidence: data.analysis?.overallConfidence
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = data.retryAfter || 60;
          throw new Error(`Rate limit reached. Please try again in ${retryAfter} seconds.`);
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 503) {
          throw new Error('AI service is temporarily unavailable. Please try again later.');
        } else if (response.status === 500) {
          throw new Error('Server error occurred. Please try again or contact support.');
        }
        throw new Error(data.message || `Failed to analyze image (${response.status})`);
      }

      setAnalysisStep('processing');
      
      // Small delay to show processing step
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onAnalysisComplete(data.analysis);
      onClose();
    } catch (err) {
      console.error('[AI-Analyzer] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze image';
      setError(errorMessage);
      aiFlowMetrics.trackError(errorMessage, 'analyze_image');
    } finally {
      clearInterval(progressInterval);
      setIsAnalyzing(false);
      setAnalysisStep('idle');
      setUploadProgress(0);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      setPreviewImage(base64);
      aiFlowMetrics.trackImageUpload(file.size);
      await analyzeImage(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    disabled: isAnalyzing
  });

  const getStepText = () => {
    switch (analysisStep) {
      case 'uploading':
        return 'Uploading image...';
      case 'analyzing':
        return 'AI is analyzing your equipment...';
      case 'processing':
        return 'Processing results...';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (analysisStep) {
      case 'uploading':
        return 'Securely uploading your image';
      case 'analyzing':
        return 'Identifying clubs and equipment in your bag';
      case 'processing':
        return 'Matching with our equipment database';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-[#1f1f1f] border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Camera className="w-6 h-6 text-green-500" />
            AI Equipment Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {/* Coming Soon Message */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl p-8 border border-emerald-500/20">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-emerald-500" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Coming Soon!</h3>
                <p className="text-lg text-emerald-400 font-medium">AI Equipment Scanner</p>
              </div>
              
              <div className="max-w-md space-y-3">
                <p className="text-white/80">
                  Our AI-powered equipment scanner will automatically identify and catalog all the clubs in your bag from a single photo.
                </p>
                <p className="text-white/60 text-sm">
                  We're fine-tuning the AI to recognize thousands of golf equipment models with high accuracy. Check back soon!
                </p>
              </div>
              
              <div className="pt-4">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>In Development</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Features Preview */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#2a2a2a] rounded-lg p-4 border border-white/10">
              <Camera className="w-8 h-8 text-emerald-500 mb-2" />
              <h4 className="font-semibold text-white mb-1">Instant Recognition</h4>
              <p className="text-xs text-white/60">Snap a photo and let AI identify your equipment</p>
            </div>
            <div className="bg-[#2a2a2a] rounded-lg p-4 border border-white/10">
              <Upload className="w-8 h-8 text-emerald-500 mb-2" />
              <h4 className="font-semibold text-white mb-1">Bulk Import</h4>
              <p className="text-xs text-white/60">Add your entire bag in seconds</p>
            </div>
            <div className="bg-[#2a2a2a] rounded-lg p-4 border border-white/10">
              <Sparkles className="w-8 h-8 text-emerald-500 mb-2" />
              <h4 className="font-semibold text-white mb-1">Smart Matching</h4>
              <p className="text-xs text-white/60">Automatically matches to our equipment database</p>
            </div>
          </div>
          
          {/* Original upload interface - hidden for now */}
          {false && !isAnalyzing && !previewImage && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-gray-500 bg-[#2a2a2a]'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <p className="text-lg font-medium text-white">
                    {isDragActive ? 'Drop your photo here' : 'Upload a photo of your golf bag'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Drag & drop or click to select
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Supported: JPG, PNG, WebP (max 10MB)
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="flex justify-center mt-6">
          <Button
            onClick={onClose}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
          >
            Got it, I'll Check Back Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}