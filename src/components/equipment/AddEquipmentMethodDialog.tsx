import React from 'react';
import { Camera, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AddEquipmentMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: 'ai' | 'manual') => void;
}

export default function AddEquipmentMethodDialog({
  isOpen,
  onClose,
  onSelectMethod
}: AddEquipmentMethodDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#1f1f1f] border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white text-center">
            How would you like to add equipment?
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* AI Scanner Option */}
          <button
            onClick={() => onSelectMethod('ai')}
            className="group relative overflow-hidden rounded-lg bg-[#2a2a2a] p-6 transition-all hover:bg-[#3a3a3a] hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500 transition-colors group-hover:bg-green-500/20">
                <Camera className="h-8 w-8" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white">Scan Your Bag</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Take a photo and let AI identify your equipment
                </p>
              </div>
              <div className="absolute -right-1 -top-1 rounded-bl-lg bg-green-500 px-2 py-1 text-xs font-medium text-black">
                NEW
              </div>
            </div>
          </button>

          {/* Manual Search Option */}
          <button
            onClick={() => onSelectMethod('manual')}
            className="group overflow-hidden rounded-lg bg-[#2a2a2a] p-6 transition-all hover:bg-[#3a3a3a] hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-600/20 text-gray-300 transition-colors group-hover:bg-gray-600/30">
                <Search className="h-8 w-8" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white">Browse Equipment</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Search and select from our equipment database
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}