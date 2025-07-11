const Debug = () => {
  return (
    <div style={{ 
      backgroundColor: '#000', 
      color: '#fff', 
      padding: '20px',
      minHeight: '100vh' 
    }}>
      <h1>Debug Page</h1>
      <p>If you can see this white text on a black background, the app is working!</p>
      <div style={{ marginTop: '20px' }}>
        <h2>Environment Check:</h2>
        <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Configured' : '❌ Missing'}</p>
        <p>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Missing'}</p>
      </div>
      <div style={{ marginTop: '20px' }}>
        <h2>Glassmorphism Test:</h2>
        <div className="glass-card" style={{ padding: '20px', marginTop: '10px' }}>
          <p>This should have a glass effect with backdrop blur</p>
        </div>
      </div>
    </div>
  );
};

export default Debug;