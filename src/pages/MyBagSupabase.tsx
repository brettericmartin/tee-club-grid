import { useState, useEffect } from "react";
import { Plus, Edit3, Save, X, Eye, Settings, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import BackgroundLayer from "@/components/BackgroundLayer";
import BackgroundPicker from "@/components/BackgroundPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/Navigation";
import { BagSelectorDialog } from "@/components/bag/BagSelectorDialog";
import { CreateBagDialog } from "@/components/bag/CreateBagDialog";
import { EquipmentSelectorImproved } from "@/components/equipment/EquipmentSelectorImproved";
import { EquipmentEditor } from "@/components/bag/EquipmentEditor";
import { BagPreview } from "@/components/bag/BagPreview";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase";
import { smartCreateBagPost, smartCreateBagUpdatePost, smartCreateEquipmentPost } from "@/services/feedSmartUpdate";

type BagEquipmentItem = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Database['public']['Tables']['equipment']['Row'];
  shaft?: Database['public']['Tables']['shafts']['Row'];
  grip?: Database['public']['Tables']['grips']['Row'];
  loft_option?: Database['public']['Tables']['loft_options']['Row'];
};

type Bag = Database['public']['Tables']['user_bags']['Row'] & {
  profile?: Database['public']['Tables']['profiles']['Row'];
};

const MyBagSupabase = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [bags, setBags] = useState<Bag[]>([]);
  const [currentBag, setCurrentBag] = useState<Bag | null>(null);
  const [bagName, setBagName] = useState("");
  const [bagDescription, setBagDescription] = useState("");
  const [bagItems, setBagItems] = useState<BagEquipmentItem[]>([]);
  const [selectedBackground, setSelectedBackground] = useState('midwest-lush');
  
  // Modal states
  const [showBagSelector, setShowBagSelector] = useState(false);
  const [showCreateBag, setShowCreateBag] = useState(false);
  const [equipmentSelectorOpen, setEquipmentSelectorOpen] = useState(false);
  const [equipmentEditorOpen, setEquipmentEditorOpen] = useState(false);
  const [selectedBagEquipment, setSelectedBagEquipment] = useState<BagEquipmentItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Show sign-in prompt if not logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10">
        <Navigation />
        <div className="container mx-auto px-4 pt-32">
          <div className="max-w-md mx-auto text-center">
            <div className="glass-card p-8">
              <h1 className="text-3xl font-bold text-white mb-4">Sign In to View Your Bag</h1>
              <p className="text-white/70 mb-6">
                Create an account to build and showcase your golf bag collection.
              </p>
              <Button 
                onClick={() => window.location.href = '/?signin=true'} 
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (user) {
      loadBags();
    }
  }, [user]);

  const loadBags = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load user's bags
      const { data: userBags, error } = await supabase
        .from('user_bags')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase error loading bags:', error);
        throw error;
      }

      console.log('Loaded bags:', userBags);

      // Create a bag if user doesn't have one
      if (!userBags || userBags.length === 0) {
        const { data: newBag, error: createError } = await supabase
          .from('user_bags')
          .insert({
            user_id: user.id,
            name: 'My Bag',
            bag_type: 'real'
          })
          .select('*, profile:profiles(*)')
          .single();

        if (createError) throw createError;
        
        setBags([newBag]);
        setCurrentBag(newBag);
        await loadBagEquipment(newBag.id);
      } else {
        setBags(userBags);
        
        if (userBags.length === 1) {
          // Auto-select the only bag
          const bag = userBags[0];
          setCurrentBag(bag);
          setBagName(bag.name);
          setBagDescription(bag.description || '');
          setSelectedBackground(bag.background_image || 'midwest-lush');
          await loadBagEquipment(bag.id);
        } else {
          // Show bag selector for multiple bags
          setShowBagSelector(true);
        }
      }
    } catch (error) {
      console.error('Error loading bags:', error);
      toast.error('Failed to load your bags');
    } finally {
      setLoading(false);
    }
  };

  const loadBagEquipment = async (bagId: string) => {
    console.log('Loading equipment for bag:', bagId);
    try {
      // First try with all joins (if tables exist)
      let { data, error } = await supabase
        .from('bag_equipment')
        .select(`
          *,
          equipment(*),
          shaft:shafts(*),
          grip:grips(*),
          loft_option:loft_options(*)
        `)
        .eq('bag_id', bagId)
        .order('added_at');

      // If that fails, try without the optional joins
      if (error) {
        console.log('First query failed:', error.message);
        console.log('Trying basic equipment query...');
        
        const result = await supabase
          .from('bag_equipment')
          .select(`
            *,
            equipment(*)
          `)
          .eq('bag_id', bagId)
          .order('added_at');
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error loading equipment:', error);
        throw error;
      }

      console.log('Loaded equipment:', data);
      setBagItems(data || []);
    } catch (error) {
      console.error('Error loading bag equipment:', error);
      // Don't show error toast for empty bags, just set empty array
      setBagItems([]);
      // Only show error if it's not a "no rows" error
      if (error.message && !error.message.includes('No rows')) {
        toast.error('Failed to load equipment');
      }
    }
  };

  const handleSelectBag = async (bagId: string) => {
    const bag = bags.find(b => b.id === bagId);
    if (bag) {
      setCurrentBag(bag);
      setBagName(bag.name);
      setBagDescription(bag.description || '');
      setSelectedBackground(bag.background_image || 'midwest-lush');
      await loadBagEquipment(bag.id);
    }
  };

  const handleCreateBag = async (name: string, type: string) => {
    if (!user) return;

    try {
      const { data: newBag, error } = await supabase
        .from('user_bags')
        .insert({
          user_id: user.id,
          name,
          bag_type: type
        })
        .select('*, profile:profiles(*)')
        .single();

      if (error) throw error;

      setBags([...bags, newBag]);
      setCurrentBag(newBag);
      setBagName(newBag.name);
      setBagDescription('');
      setSelectedBackground('midwest-lush');
      setBagItems([]);
      
      // Create feed post for bag creation
      await smartCreateBagPost(user.id, newBag.id, newBag.name);
    } catch (error) {
      console.error('Error creating bag:', error);
      toast.error('Failed to create bag');
      throw error;
    }
  };

  const handleDeleteBag = async (bagId: string) => {
    try {
      const { error } = await supabase
        .from('user_bags')
        .delete()
        .eq('id', bagId);

      if (error) throw error;

      const remainingBags = bags.filter(b => b.id !== bagId);
      setBags(remainingBags);
      
      if (currentBag?.id === bagId && remainingBags.length > 0) {
        await handleSelectBag(remainingBags[0].id);
      }
    } catch (error) {
      console.error('Error deleting bag:', error);
      toast.error('Failed to delete bag');
      throw error;
    }
  };


  const handleSave = async () => {
    if (!currentBag) return;
    
    try {
      const { error } = await supabase
        .from('user_bags')
        .update({
          name: bagName,
          description: bagDescription,
          background_image: selectedBackground,
          bag_type: currentBag.bag_type || 'main',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentBag.id);

      if (error) throw error;
      
      setIsEditing(false);
      toast.success("Bag saved successfully!");
      
      // Track changes for feed post
      const changes = [];
      if (currentBag.name !== bagName) changes.push(`Renamed bag to "${bagName}"`);
      if (currentBag.description !== bagDescription) changes.push('Updated description');
      if (currentBag.background_image !== selectedBackground) changes.push('Changed background');
      
      // Create feed post if there were changes
      if (changes.length > 0) {
        await smartCreateBagUpdatePost(user.id, currentBag.id, bagName, changes);
      }
      
      // Update local state
      setBags(bags.map(b => 
        b.id === currentBag.id 
          ? { ...b, name: bagName, description: bagDescription, background_image: selectedBackground }
          : b
      ));
      setCurrentBag({ ...currentBag, name: bagName, description: bagDescription, background_image: selectedBackground });
    } catch (error) {
      console.error('Error saving bag:', error);
      toast.error('Failed to save bag');
    }
  };

  const addEquipment = async (selection: {
    equipment_id: string;
    shaft_id?: string;
    grip_id?: string;
    loft_option_id?: string;
  }) => {
    if (!currentBag) return;
    
    try {
      console.log('Adding equipment with selection:', selection);
      console.log('Current bag ID:', currentBag.id);
      
      // First, let's try a minimal insert to see what works
      const insertData = {
        bag_id: currentBag.id,
        equipment_id: selection.equipment_id,
        condition: 'new'
      };
      
      console.log('Insert data:', insertData);
      
      const { data: newItem, error } = await supabase
        .from('bag_equipment')
        .insert(insertData)
        .select(`
          *,
          equipment(*)
        `)
        .single();

      if (error) {
        console.error('Supabase error adding equipment:', error);
        throw error;
      }
      
      console.log('Equipment added successfully:', newItem);
      
      // Now update with the customization options if the item was created
      if (newItem && (selection.shaft_id || selection.grip_id || selection.loft_option_id)) {
        const { data: updatedItem, error: updateError } = await supabase
          .from('bag_equipment')
          .update({
            shaft_id: selection.shaft_id || null,
            grip_id: selection.grip_id || null,
            loft_option_id: selection.loft_option_id || null
          })
          .eq('id', newItem.id)
          .select(`
            *,
            equipment(*),
            shaft:shafts(*),
            grip:grips(*),
            loft_option:loft_options(*)
          `)
          .single();
          
        if (updateError) {
          console.error('Error updating equipment options:', updateError);
          // Don't fail the whole operation, just use the basic item
        } else if (updatedItem) {
          setBagItems(prev => [...prev, updatedItem]);
          setEquipmentSelectorOpen(false);
          toast.success(`Equipment added to your bag!`);
          return;
        }
      }
      
      setBagItems(prev => [...prev, newItem]);
      setEquipmentSelectorOpen(false);
      toast.success(`Equipment added to your bag!`);
      
      // Create feed post for equipment addition
      const equipmentName = `${newItem.equipment.brand} ${newItem.equipment.model}`;
      await smartCreateEquipmentPost(
        user.id, 
        currentBag.id, 
        currentBag.name,
        equipmentName,
        newItem.equipment.id
      );
    } catch (error: any) {
      console.error('Error adding equipment:', error);
      toast.error(`Failed to add equipment: ${error.message || 'Unknown error'}`);
    }
  };

  const removeItem = async (bagEquipmentId: string) => {
    try {
      const { error } = await supabase
        .from('bag_equipment')
        .delete()
        .eq('id', bagEquipmentId);

      if (error) throw error;

      setBagItems(prev => prev.filter(item => item.id !== bagEquipmentId));
      toast.success("Equipment removed from bag");
    } catch (error) {
      console.error('Error removing equipment:', error);
      toast.error('Failed to remove equipment');
    }
  };

  const toggleFeatured = async (bagEquipmentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bag_equipment')
        .update({ is_featured: !currentStatus })
        .eq('id', bagEquipmentId);

      if (error) throw error;
      
      setBagItems(prev =>
        prev.map(item =>
          item.id === bagEquipmentId
            ? { ...item, is_featured: !currentStatus }
            : item
        )
      );
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast.error('Failed to update equipment');
    }
  };


  const handleEditEquipment = (item: BagEquipmentItem) => {
    setSelectedBagEquipment(item);
    setEquipmentEditorOpen(true);
  };

  const totalValue = bagItems.reduce((sum, item) => 
    sum + (item.purchase_price || item.equipment.msrp || 0), 0
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10">
        <Navigation />
        <div className="container mx-auto px-4 pt-20">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const EmptyState = () => (
    <div className="text-center py-16 space-y-6">
      <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto">
        <Plus className="w-12 h-12 text-gray-400" />
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2 text-white">Start Building Your Bag</h3>
        <p className="text-gray-300">Add equipment to showcase your setup</p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={() => setEquipmentSelectorOpen(true)} variant="default">
          <Plus className="w-4 h-4 mr-2" />
          Add Equipment
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10">
      <BackgroundLayer backgroundId={selectedBackground} />
      <Navigation />
      
      <div className="container mx-auto px-4 pt-20 pb-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {isEditing ? (
              <Input
                value={bagName}
                onChange={(e) => setBagName(e.target.value)}
                className="text-3xl font-bold bg-transparent border-b border-white/20 text-white"
                placeholder="Bag Name"
              />
            ) : (
              <h1 className="text-3xl font-bold text-white">{bagName}</h1>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {!isEditing && (
              <>
                {bags.length > 1 && (
                  <Button onClick={() => setShowBagSelector(true)} variant="outline">
                    Switch Bag
                  </Button>
                )}
                <Button onClick={() => setPreviewOpen(true)} variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </>
            )}
            {isEditing ? (
              <>
                <Button onClick={handleSave} variant="default">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button onClick={() => {
                  setIsEditing(false);
                  if (currentBag) {
                    setBagName(currentBag.name);
                    setBagDescription(currentBag.description || '');
                    setSelectedBackground(currentBag.background_image || 'midwest-lush');
                  }
                }} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Bag
              </Button>
            )}
          </div>
        </div>

        {/* Background Picker in Edit Mode */}
        {isEditing && (
          <div className="mb-6">
            <label className="text-sm text-white/80 mb-2 block">Bag Background</label>
            <BackgroundPicker
              currentBackground={selectedBackground}
              onBackgroundChange={setSelectedBackground}
            />
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-200">Total Value</p>
              <p className="text-2xl font-bold text-white">${totalValue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-200">Equipment</p>
              <p className="text-2xl font-bold text-white">{bagItems.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-200">Featured</p>
              <p className="text-2xl font-bold text-white">
                {bagItems.filter(item => item.is_featured).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Equipment Display */}
        {bagItems.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {bagItems.map((item) => (
              <Card key={item.id} className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 cursor-pointer"
                      onClick={() => handleEditEquipment(item)}
                    >
                      <img
                        src={item.custom_photo_url || item.equipment.image_url || '/placeholder.svg'}
                        alt={`${item.equipment.brand} ${item.equipment.model}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 cursor-pointer" onClick={() => handleEditEquipment(item)}>
                      <h3 className="font-semibold text-white hover:text-primary transition-colors">
                        {item.equipment.brand} {item.equipment.model}
                      </h3>
                      <p className="text-sm text-gray-300">
                        {item.shaft && `${item.shaft.brand} ${item.shaft.model} - ${item.shaft.flex}`}
                        {item.grip && ` • ${item.grip.brand} ${item.grip.model}`}
                        {item.loft_option && ` • ${item.loft_option.display_name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing && (
                        <>
                          <Button
                            size="sm"
                            variant={item.is_featured ? "default" : "outline"}
                            onClick={() => toggleFeatured(item.id, item.is_featured)}
                          >
                            {item.is_featured ? "Featured" : "Feature"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditEquipment(item)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {!isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Use the same editor as the gear button
                            handleEditEquipment(item);
                          }}
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Equipment Button */}
        {isEditing && (
          <div className="mt-8 text-center">
            <Button onClick={() => setEquipmentSelectorOpen(true)} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Add Equipment
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <BagSelectorDialog
        isOpen={showBagSelector}
        onClose={() => setShowBagSelector(false)}
        bags={bags}
        onSelectBag={handleSelectBag}
        onCreateNew={() => {
          setShowBagSelector(false);
          setShowCreateBag(true);
        }}
      />

      <CreateBagDialog
        isOpen={showCreateBag}
        onClose={() => setShowCreateBag(false)}
        onCreateBag={handleCreateBag}
      />

      <EquipmentSelectorImproved
        isOpen={equipmentSelectorOpen}
        onClose={() => setEquipmentSelectorOpen(false)}
        onSelectEquipment={addEquipment}
      />

      {selectedBagEquipment && (
        <EquipmentEditor
          isOpen={equipmentEditorOpen}
          onClose={() => {
            setEquipmentEditorOpen(false);
            setSelectedBagEquipment(null);
          }}
          equipment={selectedBagEquipment}
          onUpdate={() => loadBagEquipment(currentBag?.id || '')}
        />
      )}

      {currentBag && (
        <BagPreview
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          bag={currentBag}
          equipment={bagItems}
        />
      )}

    </div>
  );
};

export default MyBagSupabase;