'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function SimpleLogin() {
  const [email, setEmail] = useState('admin@radris.fr');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 Simple login attempt...');
      
      // Use the public API URL (accessible from browser)
      const response = await fetch('/api/auth/test-backend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📊 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Login failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Login successful:', { hasToken: !!data.token });

      // Store token in localStorage for simple auth
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('✅ Token stored, redirecting to dashboard...');
        router.push('/dashboard');
      } else {
        throw new Error('No token received');
      }

    } catch (err) {
      console.error('❌ Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            🏥 RADRIS Login Simple
          </CardTitle>
          <CardDescription>
            Test d'authentification directe (bypass NextAuth)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="admin@radris.fr"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="admin123"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            <p>Credentials par défaut:</p>
            <p><strong>Email:</strong> admin@radris.fr</p>
            <p><strong>Password:</strong> admin123</p>
          </div>

          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              onClick={() => router.push('/auth/test-login')}
            >
              ← Retour au login NextAuth
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}