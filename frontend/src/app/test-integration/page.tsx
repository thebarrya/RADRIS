'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { patientsApi, examinationsApi, reportsApi } from '@/lib/api';

export default function TestIntegrationPage() {
  const { data: session, status } = useSession();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [credentials, setCredentials] = useState({
    email: 'admin@radris.fr',
    password: 'admin123'
  });

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleLogin = async () => {
    try {
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });
      
      if (result?.error) {
        addResult(`❌ Login failed: ${result.error}`);
      } else {
        addResult(`✅ Login successful`);
      }
    } catch (error: any) {
      addResult(`❌ Login error: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    addResult(`✅ Logged out successfully`);
  };

  const runIntegrationTests = async () => {
    if (!session) {
      addResult('❌ Please login first');
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    
    try {
      addResult('🧪 Starting full integration tests...');
      
      // Test 1: Patients API
      addResult('👤 Test 1: Testing Patients API...');
      try {
        const patientsResponse = await patientsApi.getAll({ limit: 5 });
        addResult(`✅ Patients API: ${patientsResponse.data.pagination.total} patients found`);
        
        if (patientsResponse.data.patients.length > 0) {
          const patient = patientsResponse.data.patients[0];
          addResult(`   📋 Sample patient: ${patient.firstName} ${patient.lastName}`);
        }
      } catch (error: any) {
        addResult(`❌ Patients API failed: ${error.response?.data?.error || error.message}`);
      }
      
      // Test 2: Examinations API
      addResult('🏥 Test 2: Testing Examinations API...');
      try {
        const examsResponse = await examinationsApi.getWorklist({ limit: 5 });
        addResult(`✅ Examinations API: ${examsResponse.data.pagination.total} examinations found`);
        
        if (examsResponse.data.examinations.length > 0) {
          const exam = examsResponse.data.examinations[0];
          addResult(`   📋 Sample exam: ${exam.accessionNumber} - ${exam.modality} ${exam.examType}`);
        }
      } catch (error: any) {
        addResult(`❌ Examinations API failed: ${error.response?.data?.error || error.message}`);
      }
      
      // Test 3: Reports API
      addResult('📄 Test 3: Testing Reports API...');
      try {
        const reportsResponse = await reportsApi.getAll({ limit: 5 });
        addResult(`✅ Reports API: ${reportsResponse.data.pagination?.total || reportsResponse.data.reports?.length || 0} reports found`);
      } catch (error: any) {
        addResult(`❌ Reports API failed: ${error.response?.data?.error || error.message}`);
      }
      
      // Test 4: Create a test patient
      addResult('👤 Test 4: Creating a test patient...');
      try {
        const newPatient = {
          firstName: 'Test',
          lastName: 'Integration',
          birthDate: '1990-01-01',
          gender: 'M' as const,
          phoneNumber: '0123456789',
          email: 'test.integration@radris.fr'
        };
        
        const createResponse = await patientsApi.create(newPatient);
        const patientId = createResponse.data.patient.id;
        addResult(`✅ Patient created: ${createResponse.data.patient.firstName} ${createResponse.data.patient.lastName} (ID: ${patientId})`);
        
        // Test 5: Create an examination for this patient
        addResult('🏥 Test 5: Creating an examination for the test patient...');
        try {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(14, 0, 0, 0);
          
          const newExam = {
            patientId: patientId,
            scheduledDate: tomorrow.toISOString(),
            modality: 'CT' as const,
            examType: 'Thorax',
            bodyPart: 'Thorax',
            procedure: 'Scanner thoracique de contrôle',
            contrast: false,
            priority: 'NORMAL' as const,
            clinicalInfo: 'Test d\'intégration système'
          };
          
          const examResponse = await examinationsApi.create(newExam);
          addResult(`✅ Examination created: ${examResponse.data.examination.accessionNumber}`);
          
          // Clean up: delete the test examination
          await examinationsApi.delete(examResponse.data.examination.id);
          addResult(`🗑️ Test examination deleted`);
          
        } catch (error: any) {
          addResult(`❌ Examination creation failed: ${error.response?.data?.error || error.message}`);
        }
        
        // Clean up: delete the test patient
        await patientsApi.delete(patientId);
        addResult(`🗑️ Test patient deleted`);
        
      } catch (error: any) {
        addResult(`❌ Patient creation failed: ${error.response?.data?.error || error.message}`);
      }
      
      addResult('🎉 Integration tests completed!');
      
    } catch (error: any) {
      addResult(`💥 General error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Test Intégration Frontend ↔ Backend
          </h1>
          <p className="text-gray-600">
            Tests complets de l'intégration entre le frontend Next.js et le backend Fastify
          </p>
        </div>

        {/* Authentication Status */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">État de l'authentification</h2>
          
          {status === 'loading' ? (
            <p>Chargement...</p>
          ) : session ? (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  ✅ Connecté en tant que: <strong>{session.user.name}</strong> ({session.user.role})
                </p>
                <p className="text-green-600 text-sm">Email: {session.user.email}</p>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={runIntegrationTests}
                  disabled={isRunning}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isRunning ? '⏳ Tests en cours...' : '🚀 Lancer les tests d\'intégration'}
                </Button>
                
                <Button
                  onClick={handleLogout}
                  variant="outline"
                >
                  🚪 Se déconnecter
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">⚠️ Non connecté - Veuillez vous authentifier</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <Input
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                  <Input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>
              
              <Button
                onClick={handleLogin}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                🔐 Se connecter
              </Button>
            </div>
          )}
        </Card>

        {/* Test Results */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Résultats des tests</h2>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-gray-500">Connectez-vous et lancez les tests pour voir les résultats...</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Quick Links */}
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Liens rapides</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={() => window.open('/patients', '_blank')}
              variant="outline"
              className="h-auto py-3"
            >
              👤 Patients
            </Button>
            
            <Button
              onClick={() => window.open('/examinations', '_blank')}
              variant="outline"
              className="h-auto py-3"
            >
              🏥 Examens
            </Button>
            
            <Button
              onClick={() => window.open('/reports', '_blank')}
              variant="outline"
              className="h-auto py-3"
            >
              📄 Rapports
            </Button>
            
            <Button
              onClick={() => window.open('/worklist', '_blank')}
              variant="outline"
              className="h-auto py-3"
            >
              📋 Worklist
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}