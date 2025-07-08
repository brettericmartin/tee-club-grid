import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'];

export function useEquipment(category?: string) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchEquipment() {
      try {
        setLoading(true);
        let query = supabase.from('equipment').select('*');
        
        if (category && category !== 'all') {
          query = query.eq('category', category);
        }
        
        const { data, error } = await query.order('brand').order('model');
        
        if (error) throw error;
        setEquipment(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchEquipment();
  }, [category]);

  return { equipment, loading, error };
}

export function useEquipmentById(id: string) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchEquipment() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('equipment')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        setEquipment(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchEquipment();
    }
  }, [id]);

  return { equipment, loading, error };
}