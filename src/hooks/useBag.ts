import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/supabase';

type UserBag = Database['public']['Tables']['user_bags']['Row'];
type BagEquipment = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Database['public']['Tables']['equipment']['Row'];
};

export function useUserBag() {
  const { user } = useAuth();
  const [bag, setBag] = useState<UserBag | null>(null);
  const [bagEquipment, setBagEquipment] = useState<BagEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setBag(null);
      setBagEquipment([]);
      setLoading(false);
      return;
    }

    async function fetchBag() {
      try {
        setLoading(true);
        
        // Get user's active bag
        const { data: bagData, error: bagError } = await supabase
          .from('user_bags')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (bagError && bagError.code !== 'PGRST116') throw bagError;
        
        if (bagData) {
          setBag(bagData);
          
          // Get bag equipment with details
          const { data: equipmentData, error: equipmentError } = await supabase
            .from('bag_equipment')
            .select(`
              *,
              equipment:equipment_id (*)
            `)
            .eq('bag_id', bagData.id)
            .order('position');
          
          if (equipmentError) throw equipmentError;
          setBagEquipment(equipmentData || []);
        } else {
          // Create default bag for new user
          const { data: newBag, error: createError } = await supabase
            .from('user_bags')
            .insert({
              user_id: user.id,
              name: 'My Bag',
              is_active: true
            })
            .select()
            .single();
          
          if (createError) throw createError;
          setBag(newBag);
          setBagEquipment([]);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchBag();
  }, [user]);

  const addEquipment = async (equipmentId: string) => {
    if (!bag || !user) return;

    try {
      const { data, error } = await supabase
        .from('bag_equipment')
        .insert({
          bag_id: bag.id,
          equipment_id: equipmentId,
          position: bagEquipment.length
        })
        .select(`
          *,
          equipment:equipment_id (*)
        `)
        .single();

      if (error) throw error;
      setBagEquipment([...bagEquipment, data]);
    } catch (err) {
      throw err;
    }
  };

  const removeEquipment = async (bagEquipmentId: string) => {
    try {
      const { error } = await supabase
        .from('bag_equipment')
        .delete()
        .eq('id', bagEquipmentId);

      if (error) throw error;
      setBagEquipment(bagEquipment.filter(item => item.id !== bagEquipmentId));
    } catch (err) {
      throw err;
    }
  };

  const updateBagName = async (name: string) => {
    if (!bag) return;

    try {
      const { data, error } = await supabase
        .from('user_bags')
        .update({ name })
        .eq('id', bag.id)
        .select()
        .single();

      if (error) throw error;
      setBag(data);
    } catch (err) {
      throw err;
    }
  };

  return {
    bag,
    bagEquipment,
    loading,
    error,
    addEquipment,
    removeEquipment,
    updateBagName
  };
}