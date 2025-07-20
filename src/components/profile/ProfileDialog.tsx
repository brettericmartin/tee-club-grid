import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile, createProfile } from '@/services/profileService';
import { AvatarUpload } from './AvatarUpload';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { golfTitles } from '@/lib/golf-titles';
import { cn } from '@/lib/utils';

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDialog({ isOpen, onClose }: ProfileDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [handicap, setHandicap] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [titleOpen, setTitleOpen] = useState(false);
  
  // Original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    displayName: '',
    handicap: '',
    avatarUrl: null as string | null,
    title: ''
  });

  useEffect(() => {
    if (isOpen && user) {
      loadProfile();
    }
  }, [isOpen, user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const profile = await getProfile(user.id);
      if (profile) {
        console.log('[ProfileDialog] Loaded profile:', {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url
        });
        setDisplayName(profile.display_name || '');
        setHandicap(profile.handicap?.toString() || '');
        setAvatarUrl(profile.avatar_url);
        setTitle(profile.title || 'Golfer');
        
        setOriginalValues({
          displayName: profile.display_name || '',
          handicap: profile.handicap?.toString() || '',
          avatarUrl: profile.avatar_url,
          title: profile.title || 'Golfer'
        });
      } else {
        // Profile doesn't exist yet - this is okay for new users
        console.log('No profile found for user, will create on save');
        // Use metadata as defaults
        setDisplayName(user.user_metadata?.display_name || user.user_metadata?.username || '');
        setAvatarUrl(user.user_metadata?.avatar_url || null);
        setTitle('Golfer'); // Default title for new users
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Don't show error toast for missing profile
      if (error instanceof Error && !error.message.includes('No rows')) {
        toast.error('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // First check if profile exists
      let profileExists = false;
      try {
        const existingProfile = await getProfile(user.id);
        profileExists = !!existingProfile;
      } catch (error) {
        // Profile doesn't exist
        profileExists = false;
      }

      if (!profileExists) {
        // Create profile first
        console.log('Creating profile for user:', user.id);
        try {
          // Generate a unique username using part of the user ID to avoid conflicts
          const baseUsername = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
          const uniqueSuffix = user.id.substring(0, 8);
          const uniqueUsername = `${baseUsername}_${uniqueSuffix}`;
          
          await createProfile(user.id, uniqueUsername);
          profileExists = true;
        } catch (error: any) {
          console.error('Error creating profile:', error);
          
          // Provide more specific error messages
          if (error.code === '23505') {
            toast.error('Username already taken. Please try a different username.');
          } else if (error.code === '42501') {
            toast.error('Permission denied. Please check your authentication.');
          } else {
            toast.error(`Failed to create profile: ${error.message || 'Unknown error'}`);
          }
          setSaving(false);
          return;
        }
      }

      const updates: any = {};
      
      // Only include changed fields
      if (displayName !== originalValues.displayName) {
        updates.display_name = displayName;
      }
      
      if (handicap !== originalValues.handicap) {
        const handicapValue = handicap ? parseFloat(handicap) : null;
        if (handicapValue !== null && (handicapValue < 0 || handicapValue > 54)) {
          toast.error('Handicap must be between 0 and 54');
          setSaving(false);
          return;
        }
        updates.handicap = handicapValue;
      }
      
      if (avatarUrl !== originalValues.avatarUrl) {
        updates.avatar_url = avatarUrl;
        console.log('[ProfileDialog] Avatar URL changed:', avatarUrl);
      }
      
      if (title !== originalValues.title) {
        updates.title = title;
      }
      
      console.log('[ProfileDialog] Updates to save:', updates);
      
      if (Object.keys(updates).length > 0 || !profileExists) {
        const result = await updateProfile(user.id, updates);
        console.log('[ProfileDialog] Profile updated result:', result);
        
        // Update auth metadata for immediate UI updates
        const { error: authError } = await supabase.auth.updateUser({
          data: { 
            display_name: displayName || user.user_metadata.display_name,
            avatar_url: avatarUrl || user.user_metadata.avatar_url
          }
        });
        
        if (authError) {
          console.error('Error updating auth metadata:', authError);
        }
        
        toast.success(profileExists ? 'Profile updated successfully' : 'Profile created successfully');
        
        // Refresh the auth session to get updated user metadata
        const { data: { user: refreshedUser } } = await supabase.auth.getUser();
        if (refreshedUser) {
          console.log('Refreshed user metadata:', refreshedUser.user_metadata);
        }
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      
      // Provide specific error messages based on error codes
      if (error.code === '23505') {
        toast.error('This username is already taken. Please choose another.');
      } else if (error.code === '42501') {
        toast.error('Permission denied. Please refresh and try again.');
      } else if (error.code === 'PGRST301') {
        toast.error('Database connection error. Please try again.');
      } else if (error.message?.includes('Failed to fetch')) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(`Failed to save profile: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setDisplayName(originalValues.displayName);
    setHandicap(originalValues.handicap);
    setAvatarUrl(originalValues.avatarUrl);
    setTitle(originalValues.title);
    onClose();
  };

  const hasChanges = 
    displayName !== originalValues.displayName ||
    handicap !== originalValues.handicap ||
    avatarUrl !== originalValues.avatarUrl ||
    title !== originalValues.title;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Edit Profile</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 text-center text-white/60">Loading profile...</div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Avatar Upload */}
            <div className="flex justify-center">
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                username={user?.user_metadata?.username}
                onAvatarChange={(newUrl) => {
                  console.log('Avatar changed in ProfileDialog:', newUrl);
                  setAvatarUrl(newUrl);
                }}
              />
            </div>
            
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-white">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <p className="text-xs text-white/60">This is how your name appears across Teed.club</p>
            </div>
            
            {/* Handicap */}
            <div className="space-y-2">
              <Label htmlFor="handicap" className="text-white">Handicap</Label>
              <Input
                id="handicap"
                type="number"
                step="0.1"
                min="0"
                max="54"
                value={handicap}
                onChange={(e) => setHandicap(e.target.value)}
                placeholder="0.0"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <p className="text-xs text-white/60">Your official golf handicap (0-54)</p>
            </div>
            
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white">Title</Label>
              <Popover open={titleOpen} onOpenChange={setTitleOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={titleOpen}
                    className="w-full justify-between bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    {title || "Select a title..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-gray-900 border-gray-700">
                  <Command className="bg-gray-900">
                    <CommandInput 
                      placeholder="Search titles or type your own..." 
                      className="text-white"
                      value={title}
                      onValueChange={setTitle}
                    />
                    <CommandList>
                      <CommandEmpty className="text-white/60 p-4 text-center">
                        <p>No title found.</p>
                        <p className="text-sm mt-1">Press enter to use "{title}" as a custom title.</p>
                      </CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {golfTitles.map((golfTitle) => (
                          <CommandItem
                            key={golfTitle}
                            value={golfTitle}
                            onSelect={(currentValue) => {
                              setTitle(currentValue);
                              setTitleOpen(false);
                            }}
                            className="text-white hover:bg-white/10 cursor-pointer"
                          >
                            {golfTitle}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-white/60">How you want to be known in the golf community</p>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="bg-primary hover:bg-primary/90"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}