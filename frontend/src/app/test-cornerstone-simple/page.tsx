'use client';

import { useState, useEffect } from 'react';

export default function TestCornerstoneSimplePage() {
  const [initStatus, setInitStatus] = useState<string>('Starting...');
  const [errors, setErrors] = useState<string[]>([]);
  const [cornerstoneReady, setCornerstoneReady] = useState(false);

  useEffect(() => {
    testCornerstoneSetup();
  }, []);

  const testCornerstoneSetup = async () => {
    const errorList: string[] = [];
    
    try {
      setInitStatus('Testing Cornerstone.js modules...');

      // Test 1: Import @cornerstonejs/core
      try {
        const coreModule = await import('@cornerstonejs/core');
        setInitStatus('✅ @cornerstonejs/core imported');
        
        // Test initialization
        await coreModule.init();
        setInitStatus('✅ Cornerstone Core initialized');
      } catch (error) {
        const msg = `❌ Core module error: ${error instanceof Error ? error.message : 'Unknown'}`;
        errorList.push(msg);
        setInitStatus(msg);
      }

      // Test 2: Import @cornerstonejs/tools
      try {
        const toolsModule = await import('@cornerstonejs/tools');
        setInitStatus('✅ @cornerstonejs/tools imported');
        
        toolsModule.init();
        setInitStatus('✅ Cornerstone Tools initialized');
      } catch (error) {
        const msg = `❌ Tools module error: ${error instanceof Error ? error.message : 'Unknown'}`;
        errorList.push(msg);
        setInitStatus(msg);
      }

      // Test 3: Import @cornerstonejs/dicom-image-loader (optional)
      try {
        const dicomModule = await import('@cornerstonejs/dicom-image-loader');
        setInitStatus('✅ DICOM Image Loader imported');

        // Test initialization using the new API
        try {
          if (dicomModule.init && typeof dicomModule.init === 'function') {
            await dicomModule.init({ maxWebWorkers: 1, strict: false });
            setInitStatus('✅ DICOM Image Loader initialized');
          } else {
            const msg = '⚠️ DICOM Image Loader init method not found (non-critical)';
            errorList.push(msg);
            setInitStatus(msg);
          }
        } catch (configError) {
          const msg = `⚠️ DICOM init error: ${configError instanceof Error ? configError.message : 'Unknown'}`;
          errorList.push(msg);
          setInitStatus(msg);
        }
      } catch (error) {
        const msg = `❌ DICOM module error: ${error instanceof Error ? error.message : 'Unknown'}`;
        errorList.push(msg);
        setInitStatus(msg);
      }

      // Final status
      if (errorList.length === 0) {
        setInitStatus('🎉 All Cornerstone.js modules ready!');
        setCornerstoneReady(true);
      } else if (errorList.filter(e => e.startsWith('❌')).length === 0) {
        setInitStatus('⚠️ Cornerstone.js ready with warnings');
        setCornerstoneReady(true);
      } else {
        setInitStatus('❌ Cornerstone.js initialization failed');
        setCornerstoneReady(false);
      }

      setErrors(errorList);

    } catch (globalError) {
      const msg = `❌ Global error: ${globalError instanceof Error ? globalError.message : 'Unknown'}`;
      setInitStatus(msg);
      setErrors([...errorList, msg]);
      setCornerstoneReady(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#0066CC', marginBottom: '30px' }}>
        🔬 Diagnostic Cornerstone.js
      </h1>
      
      {/* Status Principal */}
      <div style={{ 
        background: cornerstoneReady ? '#d4edda' : '#f8d7da', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: `1px solid ${cornerstoneReady ? '#c3e6cb' : '#f5c6cb'}`
      }}>
        <h2>📊 Status d'Initialisation</h2>
        <div style={{ 
          fontFamily: 'monospace', 
          fontSize: '14px', 
          padding: '10px',
          background: 'white',
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          {initStatus}
        </div>
      </div>

      {/* Liste des erreurs/warnings */}
      {errors.length > 0 && (
        <div style={{ 
          background: '#fff3cd', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #ffeeba'
        }}>
          <h3>⚠️ Détails des Erreurs/Warnings</h3>
          <ul style={{ marginTop: '10px' }}>
            {errors.map((error, index) => (
              <li key={index} style={{ 
                fontFamily: 'monospace', 
                fontSize: '13px', 
                marginBottom: '5px',
                color: error.startsWith('❌') ? '#dc3545' : '#856404'
              }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Zone de test du viewer */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px'
      }}>
        <h3>🖥️ Zone de Test Viewer</h3>
        <div style={{
          width: '100%',
          height: '300px',
          background: cornerstoneReady ? '#000' : '#ccc',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: cornerstoneReady ? 'white' : '#666',
          marginTop: '10px'
        }}>
          {cornerstoneReady ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px' }}>✅</div>
              <div>Viewer Ready</div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                Cornerstone.js initialisé
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px' }}>❌</div>
              <div>Viewer Not Ready</div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                Problème d'initialisation
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bouton de test */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button 
          onClick={testCornerstoneSetup}
          style={{
            padding: '12px 24px',
            background: '#0066CC',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🔄 Relancer le Test
        </button>
      </div>

      {/* Info technique */}
      <div style={{ background: '#e9ecef', padding: '15px', borderRadius: '8px', fontSize: '13px' }}>
        <h4>🔧 Informations Techniques</h4>
        <ul>
          <li><strong>Modules testés:</strong> @cornerstonejs/core, @cornerstonejs/tools, @cornerstonejs/dicom-image-loader</li>
          <li><strong>Mode test:</strong> Import dynamique avec gestion d'erreurs</li>
          <li><strong>Configuration:</strong> Web Workers avec limitation à 1 worker</li>
          <li><strong>Environnement:</strong> Next.js 14 client-side</li>
        </ul>
      </div>
    </div>
  );
}