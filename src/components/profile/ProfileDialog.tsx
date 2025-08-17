import { useState, useEffect } from 'react';
import { X, ChevronDown, Lock, Eye, EyeOff } from 'lucide-react';
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
  const [username, setUsername] = useState('');
  const [handicap, setHandicap] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [titleOpen, setTitleOpen] = useState(false);
  
  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    displayName: '',
    username: '',
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
          avatar_url: profile.avatar_url,
          username: profile.username
        });
        // Ensure display_name is never empty - fallback to username
        const displayNameValue = profile.display_name || profile.username || '';
        setDisplayName(displayNameValue);
        setUsername(profile.username || '');
        setHandicap(profile.handicap?.toString() || '');
        setAvatarUrl(profile.avatar_url || '/teed-icon.svg');
        setTitle(profile.title || 'Golfer');
        
        setOriginalValues({
          displayName: displayNameValue,
          username: profile.username || '',
          handicap: profile.handicap?.toString() || '',
          avatarUrl: profile.avatar_url || '/teed-icon.svg',
          title: profile.title || 'Golfer'
        });
      } else {
        // Profile doesn't exist yet - this is okay for new users
        console.log('No profile found for user, will create on save');
        // Use metadata as defaults
        setDisplayName(user.user_metadata?.display_name || user.user_metadata?.username || '');
        setUsername(user.user_metadata?.username || user.email?.split('@')[0] || '');
        setAvatarUrl(user.user_metadata?.avatar_url || '/teed-icon.svg');
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
      
      // Always include display_name if it's empty in the original or has changed
      if (displayName !== originalValues.displayName || !originalValues.displayName) {
        // Ensure display_name is never null or empty
        updates.display_name = displayName || user.email?.split('@')[0] || 'User';
      }
      
      if (username !== originalValues.username) {
        updates.username = username;
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

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setSaving(true);
    try {
      // For Google OAuth users, they might not have a password set, so we don't require current password
      const isOAuthUser = user?.app_metadata?.provider === 'google';
      
      if (!isOAuthUser && currentPassword) {
        // Verify current password first by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: currentPassword
        });
        
        if (signInError) {
          toast.error('Current password is incorrect');
          setSaving(false);
          return;
        }
      }
      
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        toast.error(`Failed to update password: ${error.message}`);
      } else {
        toast.success('Password updated successfully');
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
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
    // Reset password fields
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordSection(false);
    onClose();
  };

  const hasChanges = 
    displayName !== originalValues.displayName ||
    username !== originalValues.username ||
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
            
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="Enter your username"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <p className="text-xs text-white/60">Your unique username (letters, numbers, underscore only)</p>
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
            
            {/* Password Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-white flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Account Security
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="text-primary hover:text-primary/90"
                >
                  {showPasswordSection ? 'Cancel' : 'Change Password'}
                </Button>
              </div>
              
              {showPasswordSection && (
                <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
                  {/* Current Password - only for non-OAuth users */}
                  {user?.app_metadata?.provider !== 'google' && (
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-white">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-white">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-white/60">Must be at least 8 characters</p>
                  </div>
                  
                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  {/* Update Password Button */}
                  <Button
                    onClick={handlePasswordChange}
                    disabled={saving || !newPassword || !confirmPassword}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {saving ? 'Updating...' : 'Update Password'}
                  </Button>
                  
                  {user?.app_metadata?.provider === 'google' && (
                    <p className="text-xs text-white/60 text-center">
                      As a Google sign-in user, you're setting a password for the first time
                    </p>
                  )}
                </div>
              )}
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