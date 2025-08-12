'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { examinationsApi, patientsApi } from '@/lib/api';

export default function ExaminationTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      addResult('🧪 Démarrage des tests Examination Management...');
      
      // Test 1: Get worklist
      addResult('📋 Test 1: Récupération de la worklist...');
      try {
        const response = await examinationsApi.getWorklist({ page: 1, limit: 10 });
        addResult(`✅ Test 1 réussi: ${response.data.pagination.total} examens trouvés`);
      } catch (error: any) {
        addResult(`❌ Test 1 échoué: ${error.response?.data?.error || error.message}`);
      }
      
      // Test 2: Get a patient for creating examination
      addResult('👤 Test 2: Récupération d\'un patient pour créer un examen...');
      let testPatientId = '';
      try {
        const patientsResponse = await patientsApi.getAll({ limit: 1 });
        if (patientsResponse.data.patients.length > 0) {
          testPatientId = patientsResponse.data.patients[0].id;
          addResult(`✅ Test 2 réussi: Patient ${patientsResponse.data.patients[0].firstName} ${patientsResponse.data.patients[0].lastName} sélectionné`);
        } else {
          // Create a test patient if none exists
          const testPatient = {
            firstName: 'Test',
            lastName: 'Examination',
            birthDate: '1985-06-20',
            gender: 'M' as const,
            phoneNumber: '0123456789',
          };
          const patientResponse = await patientsApi.create(testPatient);
          testPatientId = patientResponse.data.patient.id;
          addResult(`✅ Test 2 réussi: Patient de test créé avec ID ${testPatientId}`);
        }
      } catch (error: any) {
        addResult(`❌ Test 2 échoué: ${error.response?.data?.error || error.message}`);
      }
      
      // Test 3: Create a test examination
      addResult('🏥 Test 3: Création d\'un examen de test...');
      let testExaminationId = '';
      if (testPatientId) {
        try {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(10, 0, 0, 0);
          
          const testExamination = {
            patientId: testPatientId,
            scheduledDate: tomorrow.toISOString(),
            modality: 'CT' as const,
            examType: 'Thorax',
            bodyPart: 'Thorax',
            procedure: 'Scanner thoracique sans injection',
            contrast: false,
            priority: 'NORMAL' as const,
            clinicalInfo: 'Suspicion de pneumonie',
          };
          
          const response = await examinationsApi.create(testExamination);
          testExaminationId = response.data.examination.id;
          addResult(`✅ Test 3 réussi: Examen créé avec ID ${testExaminationId}`);
        } catch (error: any) {
          addResult(`❌ Test 3 échoué: ${error.response?.data?.error || error.message}`);
        }
      }
      
      // Test 4: Get examination by ID
      if (testExaminationId) {
        addResult('🔍 Test 4: Récupération de l\'examen par ID...');
        try {
          const response = await examinationsApi.getById(testExaminationId);
          addResult(`✅ Test 4 réussi: Examen ${response.data.examination.accessionNumber} récupéré`);
        } catch (error: any) {
          addResult(`❌ Test 4 échoué: ${error.response?.data?.error || error.message}`);
        }
        
        // Test 5: Update examination
        addResult('✏️ Test 5: Mise à jour de l\'examen...');
        try {
          const updateData = {
            priority: 'HIGH' as const,
            status: 'IN_PROGRESS' as const,
            clinicalInfo: 'Suspicion de pneumonie - Mise à jour: dyspnée',
            comments: ['Examen prioritaire', 'Patient anxieux']
          };
          
          await examinationsApi.update(testExaminationId, updateData);
          addResult(`✅ Test 5 réussi: Examen mis à jour`);
        } catch (error: any) {
          addResult(`❌ Test 5 échoué: ${error.response?.data?.error || error.message}`);
        }
        
        // Test 6: Bulk action
        addResult('📦 Test 6: Action en lot...');
        try {
          await examinationsApi.bulkAction('change-status', [testExaminationId], { status: 'ACQUIRED' });
          addResult(`✅ Test 6 réussi: Action en lot appliquée`);
        } catch (error: any) {
          addResult(`❌ Test 6 échoué: ${error.response?.data?.error || error.message}`);
        }
        
        // Test 7: Worklist filtering
        addResult('🔎 Test 7: Filtrage de la worklist...');
        try {
          const filterParams = {
            status: 'ACQUIRED',
            modality: 'CT',
            priority: 'HIGH'
          };
          
          const response = await examinationsApi.getWorklist(filterParams);
          addResult(`✅ Test 7 réussi: ${response.data.examinations.length} examens trouvés avec filtres`);
        } catch (error: any) {
          addResult(`❌ Test 7 échoué: ${error.response?.data?.error || error.message}`);
        }
        
        // Test 8: Delete examination
        addResult('🗑️ Test 8: Suppression de l\'examen de test...');
        try {
          await examinationsApi.delete(testExaminationId);
          addResult(`✅ Test 8 réussi: Examen supprimé`);
        } catch (error: any) {
          addResult(`❌ Test 8 échoué: ${error.response?.data?.error || error.message}`);
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
            Test Examination Management
          </h1>
          <p className="text-gray-600">
            Tests automatisés pour vérifier le bon fonctionnement du système de gestion des examens
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Tests API Examinations</h2>
            <Button 
              onClick={runTests} 
              disabled={isRunning}
              className="bg-green-600 hover:bg-green-700 text-white"
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
                <span className="text-sm">Récupération de la worklist</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-sm">Création d'un nouvel examen</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className="text-sm">Récupération par ID</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span className="text-sm">Mise à jour des données</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <span className="text-sm">Actions en lot</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                <span className="text-sm">Filtrage avancé</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                <span className="text-sm">Workflow des statuts</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span className="text-sm">Suppression</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}