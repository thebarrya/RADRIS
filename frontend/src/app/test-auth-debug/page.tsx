'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TestAuthDebug() {
  const [email, setEmail] = useState('admin@radris.fr');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testDirectAuth = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Test 1: Direct backend call
      console.log('🔍 Testing direct backend auth...');
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const loginUrl = `${backendUrl}/auth/login`;
      
      console.log('📡 Calling:', loginUrl);
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Backend auth success:', { 
        hasToken: !!data.token, 
        userRole: data.user?.role,
        userEmail: data.user?.email 
      });

      setResult({
        type: 'direct_backend',
        success: true,
        data: {
          token: data.token ? `${data.token.substring(0, 20)}...` : 'No token',
          user: data.user,
          timestamp: new Date().toISOString()
        }
      });

    } catch (err) {
      console.error('❌ Direct auth error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setResult({
        type: 'direct_backend',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testNextAuth = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔍 Testing NextAuth...');
      
      // Test NextAuth API directly
      const response = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email,
          password,
          callbackUrl: '/dashboard',
          csrfToken: 'test' // This should be properly generated
        }).toString(),
      });

      console.log('📊 NextAuth response status:', response.status);
      console.log('📊 NextAuth response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NextAuth error: ${response.status} - ${errorText}`);
      }

      const data = await response.text();
      console.log('✅ NextAuth response:', data);

      setResult({
        type: 'nextauth',
        success: true,
        data: {
          response: data.substring(0, 200) + '...',
          timestamp: new Date().toISOString()
        }
      });

    } catch (err) {
      console.error('❌ NextAuth error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setResult({
        type: 'nextauth',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔐 Debug Authentification RADRIS
          </h1>
          <p className="text-lg text-gray-600">
            Test des différents mécanismes d'authentification
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Credentials de Test</CardTitle>
            <CardDescription>
              Modifiez les credentials pour tester différents scénarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@radris.fr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin123"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Direct Backend</CardTitle>
              <CardDescription>
                Test direct de l'API backend sans NextAuth
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={testDirectAuth}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Testing...' : 'Test Backend Direct'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test NextAuth</CardTitle>
              <CardDescription>
                Test de l'authentification via NextAuth
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={testNextAuth}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading ? 'Testing...' : 'Test NextAuth'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Erreur:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Résultat du Test</CardTitle>
              <CardDescription>
                Type: {result.type} | Status: {result.success ? '✅ Success' : '❌ Error'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Variables d'Environnement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>NEXT_PUBLIC_API_URL:</strong><br />
                <code>{process.env.NEXT_PUBLIC_API_URL || 'undefined'}</code>
              </div>
              <div>
                <strong>NEXTAUTH_URL:</strong><br />
                <code>{process.env.NEXTAUTH_URL || 'undefined'}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}