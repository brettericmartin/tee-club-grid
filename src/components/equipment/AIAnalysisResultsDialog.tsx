import React, { useState, lazy, Suspense } from 'react';
import { CheckCircle2, AlertTriangle, Plus, ChevronRight, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { AnalysisResult } from './AIEquipmentAnalyzer';
import { aiFlowMetrics } from '@/utils/performanceMonitor';

// Lazy load the equipment submission modal
const SubmitEquipmentModal = lazy(() => import('@/components/SubmitEquipmentModal'));

interface AIAnalysisResultsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: AnalysisResult;
  onAddEquipment: (equipment: {
    equipment_id: string;
    shaft_id?: string;
    grip_id?: string;
    loft_option_id?: string;
  }) => Promise<void>;
}

export default function AIAnalysisResultsDialog({
  isOpen,
  onClose,
  analysisResult,
  onAddEquipment
}: AIAnalysisResultsDialogProps) {
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [isAddingToBag, setIsAddingToBag] = useState(false);
  const [showNewEquipmentModal, setShowNewEquipmentModal] = useState(false);
  const [currentNewEquipment, setCurrentNewEquipment] = useState<any>(null);
  const [newEquipmentQueue, setNewEquipmentQueue] = useState<any[]>([]);
  const [step, setStep] = useState<'matched' | 'new'>('matched');

  // Separate matched and unmatched equipment
  const matchedEquipment = analysisResult.clubs.filter(club => club.matchedEquipmentId);
  const unmatchedEquipment = analysisResult.clubs.filter(club => !club.matchedEquipmentId);

  const handleToggleMatch = (equipmentId: string) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(equipmentId)) {
      newSelected.delete(equipmentId);
    } else {
      newSelected.add(equipmentId);
    }
    setSelectedMatches(newSelected);
  };

  const handleAddSelectedToBag = async () => {
    if (selectedMatches.size === 0) {
      toast.error('Please select at least one item to add');
      return;
    }

    setIsAddingToBag(true);
    console.log('[AI-Results] Adding equipment to bag:', { count: selectedMatches.size });

    try {
      for (const equipmentId of selectedMatches) {
        const club = matchedEquipment.find(c => c.matchedEquipmentId === equipmentId);
        if (club?.matchedEquipmentId) {
          await onAddEquipment({
            equipment_id: club.matchedEquipmentId
          });
        }
      }

      toast.success(`Added ${selectedMatches.size} items to your bag!`);
      aiFlowMetrics.trackEquipmentAdded(selectedMatches.size, 'ai');
      
      // Move to new equipment step if any exist
      if (unmatchedEquipment.length > 0) {
        setStep('new');
        setSelectedMatches(new Set());
      } else {
        onClose();
      }
    } catch (error) {
      console.error('[AI-Results] Error adding equipment:', error);
      toast.error('Failed to add some equipment. Please try again.');
    } finally {
      setIsAddingToBag(false);
    }
  };

  const handleReviewNewEquipment = () => {
    if (unmatchedEquipment.length === 0) return;

    // Queue all unmatched equipment
    setNewEquipmentQueue(unmatchedEquipment);
    
    // Start with the first item
    const firstItem = unmatchedEquipment[0];
    setCurrentNewEquipment({
      brand: firstItem.brand,
      model: firstItem.model || '',
      category: firstItem.type,
      price: 0,
      details: {
        ...firstItem.details,
        detectedByAI: true,
        confidence: firstItem.confidence
      }
    });
    setShowNewEquipmentModal(true);
  };

  const handleNewEquipmentSubmitted = () => {
    // Remove the current item from queue
    const remainingQueue = newEquipmentQueue.slice(1);
    setNewEquipmentQueue(remainingQueue);

    if (remainingQueue.length > 0) {
      // Process next item
      const nextItem = remainingQueue[0];
      setCurrentNewEquipment({
        brand: nextItem.brand,
        model: nextItem.model || '',
        category: nextItem.type,
        price: 0,
        details: {
          ...nextItem.details,
          detectedByAI: true,
          confidence: nextItem.confidence
        }
      });
    } else {
      // All done
      setShowNewEquipmentModal(false);
      toast.success('All new equipment has been added!');
      onClose();
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl bg-[#1f1f1f] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {step === 'matched' ? 'Equipment Found in Database' : 'New Equipment Detected'}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-6">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                step === 'matched' ? 'bg-green-500/20' : 'bg-gray-700'
              }`}>
                <CheckCircle2 className={`w-4 h-4 ${
                  step === 'matched' ? 'text-green-500' : 'text-gray-400'
                }`} />
                <span className={`text-sm font-medium ${
                  step === 'matched' ? 'text-green-500' : 'text-gray-400'
                }`}>
                  Found Items
                </span>
              </div>
              {unmatchedEquipment.length > 0 && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-500 mx-2" />
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                    step === 'new' ? 'bg-yellow-500/20' : 'bg-gray-700'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${
                      step === 'new' ? 'text-yellow-500' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      step === 'new' ? 'text-yellow-500' : 'text-gray-400'
                    }`}>
                      New Items
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Matched Equipment List */}
            {step === 'matched' && matchedEquipment.length > 0 && (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-400">
                    Select the equipment you want to add to your bag:
                  </p>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {matchedEquipment.map((club, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-4 bg-[#2a2a2a] rounded-lg hover:bg-[#3a3a3a] transition-colors"
                      >
                        <Checkbox
                          checked={selectedMatches.has(club.matchedEquipmentId!)}
                          onCheckedChange={() => handleToggleMatch(club.matchedEquipmentId!)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-white">
                                {club.verifiedBrand || club.brand} {club.verifiedModel || club.model}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {club.type}
                                </Badge>
                                <span className={`text-xs ${getConfidenceColor(club.confidence)}`}>
                                  {Math.round(club.confidence * 100)}% match
                                </span>
                              </div>
                              {club.details && (
                                <div className="text-xs text-gray-400 mt-2 space-y-0.5">
                                  {club.details.shaft && <p>Shaft: {club.details.shaft}</p>}
                                  {club.details.grip && <p>Grip: {club.details.grip}</p>}
                                  {club.details.loft && <p>Loft: {club.details.loft}</p>}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-between items-center mt-6">
                  <p className="text-sm text-gray-400">
                    {selectedMatches.size} of {matchedEquipment.length} selected
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={onClose}
                      className="text-gray-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddSelectedToBag}
                      disabled={selectedMatches.size === 0 || isAddingToBag}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isAddingToBag ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Bag
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* No Matched Equipment */}
            {step === 'matched' && matchedEquipment.length === 0 && (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-white mb-2">
                  No equipment found in our database
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  All detected equipment is new and needs to be added
                </p>
                <Button
                  onClick={() => setStep('new')}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Review New Equipment
                </Button>
              </div>
            )}

            {/* New Equipment List */}
            {step === 'new' && unmatchedEquipment.length > 0 && (
              <>
                <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-500">
                        Help grow our database!
                      </p>
                      <p className="text-xs text-gray-300 mt-1">
                        These items aren't in our database yet. Review the details and add them to help other golfers.
                      </p>
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-3">
                    {unmatchedEquipment.map((club, index) => (
                      <div
                        key={index}
                        className="p-4 bg-[#2a2a2a] rounded-lg border border-yellow-500/20"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-white">
                              {club.brand} {club.model || 'Unknown Model'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {club.type}
                              </Badge>
                              <span className={`text-xs ${getConfidenceColor(club.confidence)}`}>
                                {Math.round(club.confidence * 100)}% confidence
                              </span>
                            </div>
                            {club.details && (
                              <div className="text-xs text-gray-400 mt-2 space-y-0.5">
                                {club.details.shaft && <p>Shaft: {club.details.shaft}</p>}
                                {club.details.grip && <p>Grip: {club.details.grip}</p>}
                                {club.details.loft && <p>Loft: {club.details.loft}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    className="text-gray-400 hover:text-white"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleReviewNewEquipment}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Review & Add ({unmatchedEquipment.length} items)
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Equipment Modal */}
      <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><Skeleton className="h-96 w-96" /></div>}>
        {showNewEquipmentModal && currentNewEquipment && (
          <SubmitEquipmentModal
            isOpen={showNewEquipmentModal}
            onClose={() => {
              setShowNewEquipmentModal(false);
              setNewEquipmentQueue([]);
              onClose();
            }}
            onSubmit={handleNewEquipmentSubmitted}
            prefilledData={currentNewEquipment}
            remainingCount={newEquipmentQueue.length - 1}
          />
        )}
      </Suspense>
    </>
  );
}