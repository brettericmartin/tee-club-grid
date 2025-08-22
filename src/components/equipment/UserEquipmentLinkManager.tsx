import React, { useState, useEffect } from 'react';
import { X, Plus, ExternalLink, Edit2, Trash2, Star, Link2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import {
  getBagItemLinks,
  createEquipmentLink,
  updateEquipmentLink,
  deleteEquipmentLink,
  validateAffiliateUrl,
  parseAffiliateLinkMetadata
} from '@/services/userEquipmentLinks';
import type { UserEquipmentLink } from '@/types/affiliateVideos';
import { cn } from '@/lib/utils';

interface UserEquipmentLinkManagerProps {
  bagId: string;
  bagEquipmentId: string;
  equipmentName: string;
  isOpen: boolean;
  onClose: () => void;
  onLinksUpdated?: () => void;
}

export const UserEquipmentLinkManager: React.FC<UserEquipmentLinkManagerProps> = ({
  bagId,
  bagEquipmentId,
  equipmentName,
  isOpen,
  onClose,
  onLinksUpdated
}) => {
  const { user } = useAuth();
  const [links, setLinks] = useState<UserEquipmentLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingLink, setEditingLink] = useState<UserEquipmentLink | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // Form state
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    if (isOpen && bagEquipmentId) {
      loadLinks();
    }
  }, [isOpen, bagEquipmentId]);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const fetchedLinks = await getBagItemLinks(bagEquipmentId);
      setLinks(fetchedLinks);
    } catch (error) {
      console.error('Error loading links:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLabel('');
    setUrl('');
    setIsPrimary(false);
    setUrlError('');
    setEditingLink(null);
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    resetForm();
    setIsAddingNew(true);
  };

  const handleEdit = (link: UserEquipmentLink) => {
    setEditingLink(link);
    setLabel(link.label);
    setUrl(link.url);
    setIsPrimary(link.is_primary);
    setIsAddingNew(true);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate URL
    const validation = validateAffiliateUrl(url);
    if (!validation.valid) {
      setUrlError(validation.error || 'Invalid URL');
      return;
    }

    setSaving(true);
    try {
      if (editingLink) {
        // Update existing link
        const success = await updateEquipmentLink(
          editingLink.id,
          user.id,
          {
            label,
            url: validation.enhanced_url || url,
            is_primary: isPrimary
          }
        );
        
        if (success) {
          await loadLinks();
          resetForm();
          onLinksUpdated?.();
        }
      } else {
        // Create new link
        const newLink = await createEquipmentLink(
          user.id,
          bagId,
          {
            bag_equipment_id: bagEquipmentId,
            label,
            url: validation.enhanced_url || url,
            is_primary: isPrimary
          }
        );
        
        if (newLink) {
          await loadLinks();
          resetForm();
          onLinksUpdated?.();
        }
      }
    } catch (error) {
      console.error('Error saving link:', error);
      setUrlError('Failed to save link');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!user || !confirm('Are you sure you want to delete this link?')) return;

    try {
      const success = await deleteEquipmentLink(linkId, user.id);
      if (success) {
        await loadLinks();
        onLinksUpdated?.();
      }
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setUrlError('');
    
    // Auto-detect retailer and suggest label
    if (value && !label) {
      const metadata = parseAffiliateLinkMetadata(value);
      if (metadata.retailer) {
        setLabel(`Buy on ${metadata.retailer}`);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Manage Links for {equipmentName}
          </DialogTitle>
          <DialogDescription>
            Add affiliate links, purchase links, or custom links for this equipment.
            You'll earn commissions when others use your affiliate links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add/Edit Form */}
          {isAddingNew ? (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="label">Link Label</Label>
                <Input
                  id="label"
                  placeholder="e.g., Buy on Amazon, My eBay Listing"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className={cn(urlError && "border-red-500")}
                />
                {urlError && (
                  <p className="text-sm text-red-500">{urlError}</p>
                )}
                {url && validateAffiliateUrl(url).metadata?.is_affiliate && (
                  <Alert className="bg-green-500/10 border-green-500/20">
                    <AlertCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-300">
                      Affiliate link detected! You'll earn commissions on purchases.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="primary"
                    checked={isPrimary}
                    onCheckedChange={setIsPrimary}
                  />
                  <Label htmlFor="primary" className="cursor-pointer">
                    Set as primary link (shown as main button)
                  </Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!label || !url || saving}
                  className="flex-1"
                >
                  {saving ? 'Saving...' : editingLink ? 'Update Link' : 'Add Link'}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleAddNew}
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Link
            </Button>
          )}

          {/* Links List */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading links...
            </div>
          ) : links.length === 0 && !isAddingNew ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No links added yet</p>
              <p className="text-sm mt-2">
                Add affiliate links to earn commissions when others purchase through your links
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {link.is_primary && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                      <span className="font-medium truncate">{link.label}</span>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                    >
                      <span className="truncate">{link.url}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(link)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(link.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserEquipmentLinkManager;