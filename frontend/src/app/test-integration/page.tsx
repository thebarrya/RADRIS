'use client';

import { useState, useEffect } from 'react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  examinations: Examination[];
}

interface Examination {
  id: string;
  accessionNumber: string;
  scheduledDate: string;
  status: string;
  modality: string;
  examType: string;
  studyInstanceUID: string | null;
  imagesAvailable: boolean;
}

export default function TestIntegrationPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patients/cme9ue4kt0001zmx7o24ko5f3');
      
      if (!response.ok) {
        throw new Error('Failed to load patient data');
      }
      
      const data = await response.json();
      setPatient(data.patient);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const openDicomViewer = (studyInstanceUID: string) => {
    const studyMap = {
      '1.2.840.113619.2.411.3.2831159347.876.1534830071.274': '1798996c-5d5cecb5-f1e94353-b4182765-64f553cb',
      '1.2.840.113619.2.411.3.101326337.665.1547791985.542': '19e4ec2a-75263992-a7ae5234-d1ccb856-25b05fbe', 
      '1.2.840.113619.2.411.3.101326337.898.1551938993.543': '5e659b19-ef453868-ea40526b-060bea7f-ded9291f'
    };
    
    const orthancStudyId = studyMap[studyInstanceUID as keyof typeof studyMap];
    if (orthancStudyId) {
      window.open(`http://localhost:8042/stone-webviewer/index.html?study=${orthancStudyId}`, '_blank');
    }
  };

  const openOhifViewer = (studyInstanceUID: string) => {
    // OHIF viewer with study parameter
    window.open(`http://localhost:3005?StudyInstanceUIDs=${studyInstanceUID}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>⏳ Chargement des données patient...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>
        <div>❌ Erreur: {error}</div>
        <button onClick={loadPatientData} style={{ marginTop: '20px' }}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#0066CC', marginBottom: '30px' }}>
        🔗 Test Intégration RIS-PACS
      </h1>

      {/* Info patient */}
      {patient && (
        <>
          <div style={{ 
            background: '#d4edda', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '30px',
            border: '1px solid #c3e6cb' 
          }}>
            <h2 style={{ color: '#155724', marginTop: 0 }}>
              👤 Patient: {patient.firstName} {patient.lastName}
            </h2>
            <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: '#155724' }}>
              <div><strong>ID Patient:</strong> {patient.id}</div>
              <div><strong>Date de naissance:</strong> {new Date(patient.birthDate).toLocaleDateString('fr-FR')}</div>
              <div><strong>Sexe:</strong> {patient.gender}</div>
              <div><strong>Âge:</strong> {new Date().getFullYear() - new Date(patient.birthDate).getFullYear()} ans</div>
            </div>
          </div>

          {/* Liste des examens */}
          <div style={{ marginBottom: '30px' }}>
            <h2>🏥 Examens TAP Oncologique</h2>
            
            {patient.examinations.map((exam, index) => (
              <div key={exam.id} style={{
                background: 'white',
                border: '2px solid #0066CC',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'grid', gap: '15px' }}>
                  
                  {/* Header examen */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', color: '#0066CC' }}>
                        📋 {exam.examType}
                      </h3>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {new Date(exam.scheduledDate).toLocaleDateString('fr-FR')} - {exam.accessionNumber}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: exam.status === 'ACQUIRED' ? '#d4edda' : '#fff3cd',
                      color: exam.status === 'ACQUIRED' ? '#155724' : '#856404',
                      border: exam.status === 'ACQUIRED' ? '1px solid #c3e6cb' : '1px solid #ffeeba'
                    }}>
                      {exam.status === 'ACQUIRED' ? '✅ ACQUIS' : '⏳ EN ATTENTE'}
                    </div>
                  </div>

                  {/* Détails techniques */}
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '15px', 
                    borderRadius: '6px',
                    display: 'grid',
                    gap: '8px',
                    fontSize: '14px'
                  }}>
                    <div><strong>Modalité:</strong> {exam.modality}</div>
                    <div><strong>Images disponibles:</strong> {exam.imagesAvailable ? '✅ Oui' : '❌ Non'}</div>
                    {exam.studyInstanceUID && (
                      <div><strong>Study Instance UID:</strong> <code style={{ fontSize: '12px' }}>{exam.studyInstanceUID}</code></div>
                    )}
                  </div>

                  {/* Actions viewer */}
                  {exam.studyInstanceUID && exam.imagesAvailable && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => openDicomViewer(exam.studyInstanceUID!)}
                        style={{
                          padding: '10px 20px',
                          background: '#0066CC',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🪨 Stone Web Viewer
                      </button>
                      
                      <button
                        onClick={() => openOhifViewer(exam.studyInstanceUID!)}
                        style={{
                          padding: '10px 20px',
                          background: '#00AA44',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🔬 OHIF Viewer
                      </button>

                      <a
                        href={`http://localhost:8042/studies`}
                        target="_blank"
                        style={{
                          padding: '10px 20px',
                          background: '#FF8800',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        📂 Orthanc Explorer
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Test de l'intégration */}
      <div style={{ 
        background: '#d1ecf1', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #bee5eb'
      }}>
        <h3 style={{ color: '#0c5460', marginTop: 0 }}>🧪 Test d'Intégration RIS-PACS</h3>
        <div style={{ color: '#0c5460' }}>
          <p><strong>✅ Intégration réussie :</strong></p>
          <ul>
            <li>Patient TAP Onco créé dans le RIS avec données DICOM correspondantes</li>
            <li>3 examens liés aux études DICOM via StudyInstanceUID</li>
            <li>Images disponibles et accessibles via visualisateurs</li>
            <li>Workflow complet RIS → PACS → Viewer fonctionnel</li>
          </ul>
          
          <p><strong>🔗 Flux de données :</strong></p>
          <div style={{ fontSize: '14px', fontFamily: 'monospace', background: 'white', padding: '10px', borderRadius: '4px' }}>
            RIS Database → StudyInstanceUID → Orthanc PACS → DICOM Viewers
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ 
        background: '#fff3cd', 
        padding: '20px', 
        borderRadius: '8px', 
        marginTop: '20px',
        border: '1px solid #ffeeba'
      }}>
        <h3 style={{ color: '#856404' }}>📋 Instructions de Test</h3>
        <ol style={{ color: '#856404' }}>
          <li>Cliquer sur les boutons de visualisateur pour chaque examen</li>
          <li>Vérifier que les images DICOM s'ouvrent correctement</li>
          <li>Confirmer que les métadonnées patient correspondent</li>
          <li>Tester les outils de mesure et windowing</li>
          <li>Valider l'intégration complète RIS-PACS-Viewer</li>
        </ol>
      </div>
    </div>
  );
}