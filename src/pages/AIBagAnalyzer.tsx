import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Equipment } from '../types/equipment';
import { Link } from 'react-router-dom';

interface AnalysisResult {
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

export default function AIBagAnalyzer() {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const analyzeImage = async (base64Image: string, mimeType: string) => {
    if (!user) {
      setError('You must be logged in to use this feature');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

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

      if (!response.ok) {
        throw new Error(data.message || 'Failed to analyze image');
      }

      setAnalysisResult(data.analysis);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Camera className="w-8 h-8 text-green-500" />
            AI Bag Analyzer
          </h1>
          <p className="text-gray-400">
            Upload a photo of your golf bag and our AI will identify your equipment
          </p>
        </div>

        {/* Upload Area */}
        {!analysisResult && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-gray-500'
            } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-green-500" />
                <p className="text-lg">Analyzing your golf bag...</p>
                <p className="text-sm text-gray-400">This may take a few seconds</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Upload className="w-12 h-12 text-gray-400" />
                <p className="text-lg">
                  {isDragActive ? 'Drop the image here' : 'Drag & drop your golf bag photo here'}
                </p>
                <p className="text-sm text-gray-400">or click to select a file</p>
                <p className="text-xs text-gray-500 mt-2">Supported formats: JPG, PNG, WebP (max 10MB)</p>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-500">Analysis Failed</p>
              <p className="text-sm text-gray-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div className="mt-8 space-y-6">
            {/* Preview Image */}
            {previewImage && (
              <div className="relative rounded-lg overflow-hidden bg-gray-800 p-2">
                <img src={previewImage} alt="Analyzed golf bag" className="w-full h-auto rounded" />
              </div>
            )}

            {/* Overall Confidence */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Analysis Complete
              </h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">Overall Confidence:</span>
                <span className={`font-medium ${getConfidenceColor(analysisResult.overallConfidence)}`}>
                  {getConfidenceLabel(analysisResult.overallConfidence)} ({Math.round(analysisResult.overallConfidence * 100)}%)
                </span>
              </div>
            </div>

            {/* Detected Clubs */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Detected Equipment ({analysisResult.clubs.length})</h3>
              <div className="space-y-3">
                {analysisResult.clubs.map((club, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs px-2 py-1 bg-gray-600 rounded capitalize">
                            {club.type}
                          </span>
                          <h4 className="font-medium">
                            {club.verifiedBrand || club.brand} {club.verifiedModel || club.model || ''}
                          </h4>
                        </div>
                        {club.details && (
                          <div className="text-sm text-gray-400 space-y-1">
                            {club.details.shaft && <p>Shaft: {club.details.shaft}</p>}
                            {club.details.grip && <p>Grip: {club.details.grip}</p>}
                            {club.details.loft && <p>Loft: {club.details.loft}</p>}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`text-sm ${getConfidenceColor(club.confidence)}`}>
                          {Math.round(club.confidence * 100)}%
                        </span>
                        {club.matchedEquipmentId && (
                          <Link
                            to={`/equipment/${club.matchedEquipmentId}`}
                            className="block mt-2 text-xs text-green-500 hover:underline"
                          >
                            View Details →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bag Info */}
            {analysisResult.bagInfo && (analysisResult.bagInfo.brand || analysisResult.bagInfo.model) && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3">Golf Bag</h3>
                <div className="text-sm space-y-1">
                  {analysisResult.bagInfo.brand && <p>Brand: {analysisResult.bagInfo.brand}</p>}
                  {analysisResult.bagInfo.model && <p>Model: {analysisResult.bagInfo.model}</p>}
                  {analysisResult.bagInfo.color && <p>Color: {analysisResult.bagInfo.color}</p>}
                </div>
              </div>
            )}

            {/* Accessories */}
            {analysisResult.accessories && analysisResult.accessories.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3">Accessories</h3>
                <div className="space-y-2">
                  {analysisResult.accessories.map((accessory, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-gray-600 rounded capitalize">
                        {accessory.type}
                      </span>
                      <span className="text-sm">{accessory.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setAnalysisResult(null);
                  setPreviewImage(null);
                  setError(null);
                }}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Analyze Another Photo
              </button>
              {user && (
                <button
                  onClick={() => {
                    // TODO: Implement adding detected clubs to user's bag
                    alert('This feature is coming soon!');
                  }}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
                >
                  Add to My Bag
                </button>
              )}
            </div>
          </div>
        )}

        {/* Login Prompt */}
        {!user && (
          <div className="mt-8 p-6 bg-gray-800 rounded-lg text-center">
            <p className="text-gray-400 mb-4">Sign in to analyze your golf bag and save your equipment</p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}