import { useState } from 'react';
import { X, Camera, Image, Trophy, Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SinglePhotoUpload } from './SinglePhotoUpload';
import { MultiEquipmentPhotoUpload } from './MultiEquipmentPhotoUpload';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultType?: 'photo' | 'multi_photo' | 'milestone' | 'playing';
}

export function CreatePostModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  defaultType 
}: CreatePostModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string | null>(defaultType || null);

  if (!user) {
    return null;
  }

  const postTypes = [
    {
      id: 'single_photo',
      icon: Camera,
      title: 'Share Equipment Photo',
      description: 'Show off a single piece of equipment',
      color: 'bg-blue-500',
      action: () => {
        setSelectedType('single_photo');
      }
    },
    {
      id: 'multi_photo',
      icon: Image,
      title: 'Share Multiple Photos',
      description: 'Upload 2-10 photos of different equipment',
      color: 'bg-purple-500',
      action: () => {
        setSelectedType('multi_photo');
      }
    },
    {
      id: 'milestone',
      icon: Trophy,
      title: 'Share Milestone',
      description: 'Celebrate an achievement or personal best',
      color: 'bg-yellow-500',
      action: () => {
        toast.info('Milestone posts coming soon!');
      }
    },
    {
      id: 'playing',
      icon: Target,
      title: "I'm Playing",
      description: 'Let others know you\'re on the course',
      color: 'bg-green-500',
      action: () => {
        toast.info('Playing posts coming soon!');
      }
    }
  ];

  const handleTypeSelect = (type: typeof postTypes[0]) => {
    type.action();
  };

  // If single photo is selected, show the single photo upload modal
  if (selectedType === 'single_photo') {
    return (
      <SinglePhotoUpload
        isOpen={true}
        onClose={() => {
          setSelectedType(null);
          onClose();
        }}
        onSuccess={() => {
          setSelectedType(null);
          onSuccess?.();
        }}
      />
    );
  }

  // If multi photo is selected, show the multi-photo upload modal
  if (selectedType === 'multi_photo') {
    return (
      <MultiEquipmentPhotoUpload
        isOpen={true}
        onClose={() => {
          setSelectedType(null);
          onClose();
        }}
        onSuccess={() => {
          setSelectedType(null);
          onSuccess?.();
        }}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create Post</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-6">
          {postTypes.map((type) => {
            const Icon = type.icon;
            const isComingSoon = type.id === 'milestone' || type.id === 'playing';
            
            return (
              <button
                key={type.id}
                onClick={() => !isComingSoon && handleTypeSelect(type)}
                disabled={isComingSoon}
                className={`relative group p-6 rounded-xl border transition-all ${
                  isComingSoon 
                    ? 'bg-white/2 border-white/5 opacity-50 cursor-not-allowed' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/50'
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`${type.color} p-3 rounded-full bg-opacity-20 ${
                    !isComingSoon && 'group-hover:bg-opacity-30'
                  } transition-colors`}>
                    <Icon className={`h-6 w-6 ${isComingSoon ? 'text-white/40' : 'text-white'}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold mb-1 ${isComingSoon ? 'text-white/50' : 'text-white'}`}>
                      {type.title}
                    </h3>
                    <p className={`text-xs ${isComingSoon ? 'text-white/30' : 'text-white/60'}`}>
                      {type.description}
                    </p>
                    {isComingSoon && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-white/10 text-white/60 rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-white/5 rounded-lg">
          <p className="text-sm text-white/60 text-center">
            Share your golf journey with the community. All posts appear in your profile and the main feed.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}