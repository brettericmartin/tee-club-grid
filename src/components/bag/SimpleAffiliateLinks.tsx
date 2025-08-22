import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { 
  listLinksForBagEquipment, 
  upsertAffiliateLink, 
  deleteAffiliateLink 
} from '@/services/userEquipmentLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SimpleAffiliateLinksProps {
  bagEquipmentId: string;
  bagId: string;
  equipmentId?: string;
  className?: string;
  canEdit?: boolean;
}

export function SimpleAffiliateLinks({ 
  bagEquipmentId, 
  bagId, 
  equipmentId,
  className,
  canEdit = true
}: SimpleAffiliateLinksProps) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch existing links
  const { data: response, isLoading } = useQuery({
    queryKey: ['links', bagEquipmentId],
    queryFn: () => listLinksForBagEquipment(bagEquipmentId)
  });

  const links = response?.data || [];

  // Create/update mutation
  const createMutation = useMutation({
    mutationFn: upsertAffiliateLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', bagEquipmentId] });
      setLabel('');
      setUrl('');
      setShowAddForm(false);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAffiliateLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', bagEquipmentId] });
    }
  });

  const handleAddLink = () => {
    if (!label.trim() || !url.trim()) return;

    createMutation.mutate({
      bag_id: bagId,
      bag_equipment_id: bagEquipmentId,
      equipment_id: equipmentId,
      label: label.trim(),
      url: url.trim(),
      is_primary: links.length === 0 // First link is primary by default
    });
  };

  const handleMakePrimary = (link: any) => {
    createMutation.mutate({ 
      ...link, 
      is_primary: true 
    });
  };

  const getTrackableUrl = (linkId: string) => {
    // Use the redirect API endpoint for tracking
    return `/api/links/redirect?id=${linkId}`;
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-4", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Existing Links */}
      {links.length > 0 ? (
        <ul className="space-y-2">
          {links.map((link: any) => (
            <li 
              key={link.id} 
              className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {link.label}
                  </span>
                  {link.is_primary && (
                    <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
                      Primary
                    </span>
                  )}
                </div>
                <a 
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mt-1" 
                  href={getTrackableUrl(link.id)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="truncate max-w-[200px]">{link.url}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
              
              {canEdit && (
                <div className="flex items-center gap-1 ml-2">
                  {!link.is_primary && links.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      onClick={() => handleMakePrimary(link)}
                      disabled={createMutation.isPending}
                    >
                      Make Primary
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => deleteMutation.mutate(link.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No affiliate links added yet
        </div>
      )}

      {/* Add Link Form */}
      {canEdit && (
        <>
          {showAddForm ? (
            <div className="space-y-2 border rounded-xl p-3 bg-gray-50 dark:bg-gray-800/50">
              <Input
                className="text-sm"
                placeholder="Label (e.g., Buy on Amazon)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLink()}
              />
              <Input
                className="text-sm"
                placeholder="https://..."
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLink()}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAddLink}
                  disabled={!label.trim() || !url.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Link'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setLabel('');
                    setUrl('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setShowAddForm(true)}
            >
              Add Affiliate Link
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export default SimpleAffiliateLinks;