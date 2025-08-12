'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { patientsApi } from '@/lib/api';

export default function PatientTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      addResult('🧪 Démarrage des tests Patient Management...');
      
      // Test 1: Get all patients
      addResult('📋 Test 1: Récupération de tous les patients...');
      try {
        const response = await patientsApi.getAll({ page: 1, limit: 10 });
        addResult(`✅ Test 1 réussi: ${response.data.pagination.total} patients trouvés`);
      } catch (error: any) {
        addResult(`❌ Test 1 échoué: ${error.message}`);
      }
      
      // Test 2: Create a test patient
      addResult('👤 Test 2: Création d\'un patient de test...');
      let testPatientId = '';
      try {
        const testPatient = {
          firstName: 'Jean',
          lastName: 'Dupont',
          birthDate: '1980-01-15',
          gender: 'M' as const,
          phoneNumber: '0123456789',
          email: 'jean.dupont@test.com',
          allergies: ['Pénicilline'],
          warnings: ['allergy']
        };
        
        const response = await patientsApi.create(testPatient);
        testPatientId = response.data.patient.id;
        addResult(`✅ Test 2 réussi: Patient créé avec ID ${testPatientId}`);
      } catch (error: any) {
        addResult(`❌ Test 2 échoué: ${error.response?.data?.error || error.message}`);
      }
      
      // Test 3: Get patient by ID
      if (testPatientId) {
        addResult('🔍 Test 3: Récupération du patient par ID...');
        try {
          const response = await patientsApi.getById(testPatientId);
          addResult(`✅ Test 3 réussi: Patient ${response.data.patient.firstName} ${response.data.patient.lastName} récupéré`);
        } catch (error: any) {
          addResult(`❌ Test 3 échoué: ${error.response?.data?.error || error.message}`);
        }
        
        // Test 4: Update patient
        addResult('✏️ Test 4: Mise à jour du patient...');
        try {
          const updateData = {
            phoneNumber: '0987654321',
            city: 'Paris',
            medicalHistory: ['Hypertension']
          };
          
          const response = await patientsApi.update(testPatientId, updateData);
          addResult(`✅ Test 4 réussi: Patient mis à jour`);
        } catch (error: any) {
          addResult(`❌ Test 4 échoué: ${error.response?.data?.error || error.message}`);
        }
        
        // Test 5: Advanced search
        addResult('🔎 Test 5: Recherche avancée...');
        try {
          const searchParams = {
            firstName: 'Jean',
            gender: 'M',
            hasWarnings: true
          };
          
          const response = await patientsApi.search(searchParams);
          addResult(`✅ Test 5 réussi: ${response.data.patients.length} patients trouvés avec la recherche avancée`);
        } catch (error: any) {
          addResult(`❌ Test 5 échoué: ${error.response?.data?.error || error.message}`);
        }
        
        // Test 6: Delete patient (soft delete)
        addResult('🗑️ Test 6: Suppression du patient de test...');
        try {
          await patientsApi.delete(testPatientId);
          addResult(`✅ Test 6 réussi: Patient supprimé (soft delete)`);
        } catch (error: any) {
          addResult(`❌ Test 6 échoué: ${error.response?.data?.error || error.message}`);
        }
      }
      
      addResult('🎉 Tests terminés!');
      
    } catch (error: any) {
      addResult(`💥 Erreur générale: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Test Patient Management
          </h1>
          <p className="text-gray-600">
            Tests automatisés pour vérifier le bon fonctionnement du système de gestion des patients
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Tests API Patients</h2>
            <Button 
              onClick={runTests} 
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRunning ? '⏳ Tests en cours...' : '🚀 Lancer les tests'}
            </Button>
          </div>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-gray-500">Cliquez sur "Lancer les tests" pour commencer...</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Tests couverts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-sm">Récupération de tous les patients</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-sm">Création d'un nouveau patient</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className="text-sm">Récupération par ID</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span className="text-sm">Mise à jour des données</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <span className="text-sm">Recherche avancée</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span className="text-sm">Suppression (soft delete)</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}