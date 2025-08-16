'use client';

import { SimpleDicomViewer } from '@/components/examinations/SimpleDicomViewer';

export default function TestCornerstonePage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1 style={{ color: '#0066CC', marginBottom: '20px' }}>
        🏥 Test Visualisateur DICOM Cornerstone.js
      </h1>
      
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ background: '#f0f8ff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h2>📊 Test d'Initialisation Cornerstone.js</h2>
          <p>Cette page teste l'initialisation et la configuration de Cornerstone.js pour le visualisateur DICOM.</p>
        </div>

        {/* Composant de test */}
        <SimpleDicomViewer 
          studyInstanceUID="test-study-123"
          className="mb-6"
        />

        {/* Informations techniques */}
        <div style={{ background: '#fff8dc', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
          <h3>🔧 Informations Techniques</h3>
          <ul>
            <li><strong>Cornerstone.js Core:</strong> @cornerstonejs/core</li>
            <li><strong>Cornerstone.js Tools:</strong> @cornerstonejs/tools</li>
            <li><strong>DICOM Image Loader:</strong> @cornerstonejs/dicom-image-loader</li>
            <li><strong>Mode:</strong> Initialisation simplifiée sans Web Workers</li>
          </ul>
        </div>

        {/* Liens vers autres tests */}
        <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
          <h3>🔗 Autres Tests</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a 
              href="/test-cornerstone-fixed" 
              style={{ color: '#0066CC', textDecoration: 'underline' }}
            >
              Test Configuration Fixée
            </a>
            <a 
              href="/test-login" 
              style={{ color: '#0066CC', textDecoration: 'underline' }}
            >
              Test Authentification
            </a>
            <a 
              href="http://localhost:8042/stone-webviewer/" 
              target="_blank"
              style={{ color: '#0066CC', textDecoration: 'underline' }}
            >
              Stone Web Viewer (Orthanc)
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}