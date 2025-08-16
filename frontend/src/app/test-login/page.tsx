'use client';

import { useState } from 'react';

export default function TestLogin() {
  const [result, setResult] = useState<any>(null);

  const testDirectLogin = async () => {
    try {
      // Test direct backend login
      const backendResponse = await fetch('/api/auth/test-backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@radris.fr',
          password: 'admin123'
        })
      });

      const backendData = await backendResponse.json();
      setResult({
        backendTest: { status: backendResponse.status, data: backendData }
      });

    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#0066CC', marginBottom: '30px' }}>
        🔐 Test Authentification RADRIS
      </h1>
      
      <div style={{ background: '#f0f8ff', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h2>👤 Compte de test disponible</h2>
        <div style={{ display: 'grid', gap: '8px', fontFamily: 'monospace' }}>
          <div><strong>Email:</strong> admin@radris.fr</div>
          <div><strong>Password:</strong> admin123</div>
          <div><strong>Role:</strong> ADMIN</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <a 
          href="/auth/login"
          style={{
            padding: '12px 24px',
            background: '#0066CC',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: '500'
          }}
        >
          🔐 Aller à la page de Login
        </a>
        
        <button 
          onClick={testDirectLogin}
          style={{
            padding: '12px 24px',
            background: '#00AA44',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          🧪 Test Backend Direct
        </button>
      </div>

      {result && (
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
          <h3>Résultat du test :</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ background: '#fff8dc', padding: '20px', borderRadius: '8px', marginTop: '30px' }}>
        <h3>📋 Instructions :</h3>
        <ol>
          <li>Cliquer sur "Aller à la page de Login"</li>
          <li>Utiliser les identifiants ci-dessus</li>
          <li>Se connecter au système RADRIS</li>
        </ol>
      </div>
    </div>
  );
}