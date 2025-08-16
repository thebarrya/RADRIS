'use client';

import { useState } from 'react';

export default function TestAuth() {
  const [email, setEmail] = useState('admin@radris.fr');
  const [password, setPassword] = useState('admin123');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signin/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email,
          password,
          csrfToken: 'test',
          callbackUrl: '/dashboard',
          json: 'true'
        }),
      });
      
      const data = await response.text();
      setResult({ status: response.status, data });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testBackendDirect = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      setResult({ status: response.status, data });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>🔐 Test Authentification RADRIS</h1>
      
      <div style={{ maxWidth: '500px', margin: '20px 0' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={testBackendDirect}
            disabled={loading}
            style={{ padding: '10px 20px', background: '#0066CC', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Test Backend Direct
          </button>
          
          <button 
            onClick={testLogin}
            disabled={loading}
            style={{ padding: '10px 20px', background: '#00AA44', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Test NextAuth
          </button>
        </div>

        {loading && <div>Loading...</div>}

        {result && (
          <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px', fontSize: '12px' }}>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>

      <div style={{ background: '#fff8dc', padding: '15px', borderRadius: '4px', marginTop: '20px' }}>
        <h3>🔑 Compte de test :</h3>
        <div>Email: <strong>admin@radris.fr</strong></div>
        <div>Password: <strong>admin123</strong></div>
        <div>Role: <strong>ADMIN</strong></div>
      </div>
    </div>
  );
}