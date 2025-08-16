'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function TestLoginPage() {
  const [credentials, setCredentials] = useState({
    email: 'admin@radris.fr',
    password: 'admin123'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      console.log('🔐 Starting NextAuth signin...');
      
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });

      console.log('📡 NextAuth result:', result);

      if (result?.error) {
        setResult({
          success: false,
          error: result.error,
          details: 'NextAuth signin failed'
        });
      } else if (result?.ok) {
        // Get the session after successful login
        const session = await getSession();
        setResult({
          success: true,
          session: session,
          message: 'Login successful!'
        });
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setResult({
          success: false,
          error: 'Unknown error',
          details: 'No error or success status returned'
        });
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Exception during login process'
      });
    } finally {
      setLoading(false);
    }
  };

  const testBackendDirect = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      const data = await response.json();
      
      setResult({
        success: response.ok,
        backendTest: true,
        status: response.status,
        data: data
      });
    } catch (error) {
      setResult({
        success: false,
        backendTest: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'system-ui'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '500px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#0066CC', fontSize: '28px', marginBottom: '10px' }}>
            🏥 RADRIS
          </h1>
          <p style={{ color: '#666', margin: 0 }}>Test d'Authentification</p>
        </div>

        <form onSubmit={handleLogin} style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#333'
            }}>
              Email
            </label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0066CC'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#333'
            }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0066CC'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#ccc' : '#0066CC',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              marginBottom: '10px'
            }}
          >
            {loading ? '⏳ Connexion...' : '🔐 Se connecter avec NextAuth'}
          </button>

          <button
            type="button"
            onClick={testBackendDirect}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? '⏳ Test...' : '🧪 Test Backend Direct'}
          </button>
        </form>

        {/* Résultats */}
        {result && (
          <div style={{
            padding: '15px',
            borderRadius: '6px',
            background: result.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
            marginTop: '20px'
          }}>
            <div style={{ 
              color: result.success ? '#155724' : '#721c24',
              fontWeight: '600',
              marginBottom: '10px'
            }}>
              {result.success ? '✅ Succès' : '❌ Erreur'}
            </div>
            
            <pre style={{
              background: 'rgba(0,0,0,0.05)',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px',
              margin: 0,
              overflow: 'auto'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>

            {result.success && result.session && (
              <div style={{ marginTop: '10px', fontSize: '14px', color: '#155724' }}>
                🎉 Redirection vers le dashboard dans 2 secondes...
              </div>
            )}
          </div>
        )}

        {/* Info compte test */}
        <div style={{
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '6px',
          marginTop: '20px',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>🔑 Compte de test :</div>
          <div>Email: <code>admin@radris.fr</code></div>
          <div>Password: <code>admin123</code></div>
          <div>Role: <code>ADMIN</code></div>
        </div>
      </div>
    </div>
  );
}