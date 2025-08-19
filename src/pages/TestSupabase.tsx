import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const TestSupabase = () => {
  const [status, setStatus] = useState<string[]>([]);
  
  useEffect(() => {
    testConnection();
  }, []);
  
  const testConnection = async () => {
    const logs: string[] = [];
    
    // Test 1: Check if Supabase client exists
    logs.push(`Supabase client: ${supabase ? 'Initialized' : 'Not initialized'}`);
    logs.push(`Supabase URL: ${import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not set'}`);
    logs.push(`Supabase Key: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}`);
    setStatus([...logs]);
    
    // Test 2: Simple count query (without head: true to avoid hanging)
    try {
      logs.push('Testing count query (without head: true)...');
      setStatus([...logs]);
      
      const { data, count, error } = await supabase
        .from('equipment')
        .select('id', { count: 'exact' });
      
      if (error) {
        logs.push(`❌ Count query error: ${JSON.stringify(error)}`);
      } else {
        logs.push(`✅ Count query success! Total equipment: ${count}`);
      }
      setStatus([...logs]);
    } catch (err: any) {
      logs.push(`❌ Unexpected error: ${err.message}`);
      setStatus([...logs]);
    }
    
    // Test 3: Fetch some data
    try {
      logs.push('Testing data fetch...');
      setStatus([...logs]);
      
      const { data, error } = await supabase
        .from('equipment')
        .select('id, brand, model')
        .limit(3);
      
      if (error) {
        logs.push(`❌ Data fetch error: ${JSON.stringify(error)}`);
      } else {
        logs.push(`✅ Data fetch success! Got ${data?.length || 0} items`);
        if (data && data.length > 0) {
          logs.push(`Sample: ${data[0].brand} ${data[0].model}`);
        }
      }
      setStatus([...logs]);
    } catch (err: any) {
      logs.push(`❌ Unexpected error: ${err.message}`);
      setStatus([...logs]);
    }
    
    // Test 4: Check auth
    try {
      logs.push('Testing auth...');
      setStatus([...logs]);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logs.push(`❌ Auth error: ${JSON.stringify(error)}`);
      } else {
        logs.push(`✅ Auth check success! Session: ${session ? 'Active' : 'None'}`);
      }
      setStatus([...logs]);
    } catch (err: any) {
      logs.push(`❌ Unexpected auth error: ${err.message}`);
      setStatus([...logs]);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#111111] pt-20 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>
        <div className="bg-[#1a1a1a] rounded-lg p-6">
          {status.map((log, i) => (
            <div key={i} className="mb-2 font-mono text-sm">
              {log}
            </div>
          ))}
        </div>
        <button 
          onClick={testConnection}
          className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          Re-test Connection
        </button>
      </div>
    </div>
  );
};

export default TestSupabase;