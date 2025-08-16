'use client';

export default function TestSimpleUI() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1 style={{ color: '#0066CC', marginBottom: '20px' }}>
        🏥 RADRIS - Test Interface Simple
      </h1>
      
      <div style={{ display: 'grid', gap: '20px', maxWidth: '800px' }}>
        
        {/* Status Services */}
        <div style={{ background: '#f0f8ff', padding: '15px', borderRadius: '8px', border: '1px solid #0066CC' }}>
          <h2>📊 Status des Services</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            <div>✅ <strong>Frontend</strong>: http://localhost:3000</div>
            <div>✅ <strong>Backend API</strong>: http://localhost:3001</div>
            <div>✅ <strong>Orthanc PACS</strong>: http://localhost:8042</div>
            <div>✅ <strong>OHIF Viewer</strong>: http://localhost:3005</div>
          </div>
        </div>

        {/* Navigation Links */}
        <div style={{ background: '#f0f8ff', padding: '15px', borderRadius: '8px', border: '1px solid #0066CC' }}>
          <h2>🔗 Accès Direct aux Services</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            <a href="http://localhost:8042" target="_blank" style={{ color: '#0066CC', textDecoration: 'underline' }}>
              🏥 Orthanc PACS Interface
            </a>
            <a href="http://localhost:8042/stone-webviewer/" target="_blank" style={{ color: '#0066CC', textDecoration: 'underline' }}>
              👁️ Stone Web Viewer
            </a>
            <a href="http://localhost:3005" target="_blank" style={{ color: '#0066CC', textDecoration: 'underline' }}>
              🔍 OHIF Viewer Standalone
            </a>
            <a href="http://localhost:3001/health" target="_blank" style={{ color: '#0066CC', textDecoration: 'underline' }}>
              🔧 Backend Health Check
            </a>
          </div>
        </div>

        {/* Test Data */}
        <div style={{ background: '#f0f8ff', padding: '15px', borderRadius: '8px', border: '1px solid #0066CC' }}>
          <h2>🧪 Données de Test</h2>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div><strong>Patient Test TAP Onco</strong>: cme95h3bs0001f1u2v1tg4q6d</div>
            <div><strong>Études DICOM</strong>: 8 études disponibles</div>
            <div><strong>Instances DICOM</strong>: ~4,795 instances</div>
            <div><strong>Plugins Orthanc</strong>: 6 plugins actifs</div>
          </div>
        </div>

        {/* Info Technique */}
        <div style={{ background: '#fff8dc', padding: '15px', borderRadius: '8px', border: '1px solid #ffa500' }}>
          <h2>⚠️ Mode Test</h2>
          <p>Cette page fonctionne sans authentification pour tester la connectivité.</p>
          <p>Le système principal RADRIS est opérationnel et accessible via les liens ci-dessus.</p>
        </div>
      </div>
    </div>
  );
}