import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const EquipmentDebug = () => {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      console.log('Starting equipment fetch...');
      
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .limit(10);
      
      console.log('Fetch result:', { data, error });
      
      if (error) {
        setError(error.message);
      } else {
        setEquipment(data || []);
      }
    } catch (err) {
      console.error('Catch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error loading equipment:</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Equipment Debug ({equipment.length} items)</h1>
      
      <div className="grid gap-4">
        {equipment.map(item => (
          <div key={item.id} className="p-4 border rounded">
            <h3 className="font-bold">{item.brand} {item.model}</h3>
            <p>Category: {item.category}</p>
            <p>Price: ${item.msrp}</p>
            <p>ID: {item.id}</p>
          </div>
        ))}
      </div>
      
      <pre className="mt-8 p-4 bg-gray-100 rounded overflow-auto text-xs">
        {JSON.stringify(equipment[0], null, 2)}
      </pre>
    </div>
  );
};

export default EquipmentDebug;