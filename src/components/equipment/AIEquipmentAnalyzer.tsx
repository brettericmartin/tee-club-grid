import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, AlertCircle, Camera, X } from 'lucide-react';
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

      const data = await response.json();
      
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
        }
        throw new Error(data.message || 'Failed to analyze image');
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
          {!isAnalyzing && !previewImage && (
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

          {/* Preview Image */}
          {previewImage && !isAnalyzing && (
            <div className="relative rounded-lg overflow-hidden bg-[#2a2a2a] p-2">
              <img 
                src={previewImage} 
                alt="Golf bag preview" 
                className="w-full h-auto rounded max-h-[400px] object-contain"
              />
              <button
                onClick={() => {
                  setPreviewImage(null);
                  setError(null);
                }}
                className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {/* Analysis Progress */}
          {isAnalyzing && (
            <div className="space-y-6">
              {previewImage && (
                <div className="relative rounded-lg overflow-hidden bg-[#2a2a2a] p-2 opacity-50">
                  <img 
                    src={previewImage} 
                    alt="Analyzing..." 
                    className="w-full h-auto rounded max-h-[200px] object-contain blur-sm"
                  />
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-green-500" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 bg-green-500 rounded-full animate-ping" />
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-lg font-medium text-white">
                    {getStepText()}
                  </p>
                  <p className="text-sm text-gray-400">
                    {getStepDescription()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Step {analysisStep === 'uploading' ? 1 : analysisStep === 'analyzing' ? 2 : 3} of 3</span>
                    <span>{uploadProgress}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-500">Analysis Failed</p>
                <p className="text-sm text-gray-300 mt-1">{error}</p>
                {error.includes('Rate limit') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 text-white"
                    onClick={() => {
                      setError(null);
                      setPreviewImage(null);
                    }}
                  >
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Tips */}
          {!isAnalyzing && !error && !previewImage && (
            <div className="mt-6 p-4 bg-[#2a2a2a] rounded-lg">
              <p className="text-sm font-medium text-white mb-2">Tips for best results:</p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Take photo in good lighting</li>
                <li>• Show all clubs clearly</li>
                <li>• Include headcovers for easier identification</li>
                <li>• Avoid extreme angles</li>
              </ul>
            </div>
          )}
        </div>

        {!isAnalyzing && (
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            {previewImage && !error && (
              <Button
                onClick={() => {
                  const base64Data = previewImage.split(',')[1];
                  analyzeImage(base64Data, 'image/jpeg');
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Analyze Photo
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}