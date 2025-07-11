import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const BagDisplaySimple = () => {
  const { bagId } = useParams();
  const [loading, setLoading] = useState(true);
  const [bagData, setBagData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('BagDisplaySimple mounted with bagId:', bagId);
    loadBag();
  }, [bagId]);

  const loadBag = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('user_bags')
        .select(`
          *,
          profiles (*),
          bag_equipment (
            *,
            equipment (*)
          )
        `)
        .eq('id', bagId)
        .single();

      console.log('Fetch result:', { data, error: fetchError });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setBagData(data);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Error Loading Bag</h2>
          <p className="text-red-500">{error}</p>
          <p className="text-sm mt-4">Bag ID: {bagId}</p>
        </div>
      </div>
    );
  }

  if (!bagData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">No bag found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{bagData.name}</h1>
        
        <div className="mb-8">
          <h2 className="text-xl mb-2">Owner</h2>
          <p>{bagData.profiles?.username || 'Unknown'}</p>
          <p>Handicap: {bagData.profiles?.handicap || 'N/A'}</p>
        </div>

        <div>
          <h2 className="text-xl mb-4">Equipment ({bagData.bag_equipment?.length || 0} items)</h2>
          <div className="space-y-4">
            {bagData.bag_equipment?.map((item: any) => (
              <div key={item.id} className="bg-white/10 p-4 rounded">
                <h3 className="font-bold">
                  {item.equipment?.brand} {item.equipment?.model}
                </h3>
                <p className="text-sm text-gray-400">
                  Category: {item.equipment?.category}
                </p>
                <p className="text-sm text-gray-400">
                  Price: ${item.equipment?.msrp || 0}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BagDisplaySimple;