'use client';

export default function TestViewerWorkingPage() {
  const openStoneViewer = () => {
    window.open('http://localhost:8042/stone-webviewer/', '_blank');
  };

  const openOHIFViewer = () => {
    window.open('http://localhost:3005', '_blank');
  };

  const openOrthancExplorer = () => {
    window.open('http://localhost:8042', '_blank');
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: '#0066CC', marginBottom: '30px' }}>
        🏥 Visualisateurs DICOM Fonctionnels
      </h1>
      
      <div style={{ background: '#d4edda', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #c3e6cb' }}>
        <h2 style={{ color: '#155724', marginTop: 0 }}>✅ Solutions Alternatives</h2>
        <p style={{ color: '#155724' }}>
          En attendant la résolution du problème Cornerstone.js, utilisez ces visualisateurs pleinement fonctionnels :
        </p>
      </div>

      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        
        {/* Stone Web Viewer */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '2px solid #0066CC' }}>
          <h3 style={{ color: '#0066CC', marginTop: 0 }}>🪨 Stone Web Viewer</h3>
          <p>Visualisateur DICOM moderne intégré à Orthanc</p>
          <ul style={{ fontSize: '14px', color: '#666' }}>
            <li>Multi-séries et multi-instances</li>
            <li>Outils de mesure avancés</li>
            <li>Windowing et zoom</li>
            <li>Performance optimisée</li>
          </ul>
          <button 
            onClick={openStoneViewer}
            style={{
              padding: '12px 24px',
              background: '#0066CC',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              marginTop: '15px',
              width: '100%'
            }}
          >
            🚀 Ouvrir Stone Viewer
          </button>
        </div>

        {/* OHIF Viewer */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '2px solid #00AA44' }}>
          <h3 style={{ color: '#00AA44', marginTop: 0 }}>🔬 OHIF Viewer v4</h3>
          <p>Visualisateur médical open-source standard</p>
          <ul style={{ fontSize: '14px', color: '#666' }}>
            <li>Interface clinique professionnelle</li>
            <li>Support MPR et 3D</li>
            <li>Annotations et ROI</li>
            <li>Export DICOM SR</li>
          </ul>
          <button 
            onClick={openOHIFViewer}
            style={{
              padding: '12px 24px',
              background: '#00AA44',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              marginTop: '15px',
              width: '100%'
            }}
          >
            🔍 Ouvrir OHIF Viewer
          </button>
        </div>

        {/* Orthanc Explorer */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '2px solid #FF8800' }}>
          <h3 style={{ color: '#FF8800', marginTop: 0 }}>🗃️ Orthanc Explorer 2</h3>
          <p>Interface de gestion PACS complète</p>
          <ul style={{ fontSize: '14px', color: '#666' }}>
            <li>Navigation par études/séries</li>
            <li>Métadonnées DICOM complètes</li>
            <li>Téléchargement et export</li>
            <li>Gestion des instances</li>
          </ul>
          <button 
            onClick={openOrthancExplorer}
            style={{
              padding: '12px 24px',
              background: '#FF8800',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              marginTop: '15px',
              width: '100%'
            }}
          >
            📂 Ouvrir Orthanc Explorer
          </button>
        </div>
      </div>

      {/* Données de test */}
      <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '8px', marginTop: '30px', border: '1px solid #ffeeba' }}>
        <h3 style={{ color: '#856404' }}>🧪 Données de Test Disponibles</h3>
        <div style={{ display: 'grid', gap: '10px', fontSize: '14px', color: '#856404', marginTop: '15px' }}>
          <div><strong>8 études DICOM</strong> disponibles dans Orthanc PACS</div>
          <div><strong>4,795 instances</strong> d'images médicales</div>
          <div><strong>Modalités:</strong> CT, MR, CR, DX, US</div>
          <div><strong>Patient test:</strong> TAP Onco (Suivi oncologique complet)</div>
        </div>
      </div>

      {/* Status technique */}
      <div style={{ background: '#e9ecef', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <h3>🔧 Status Technique</h3>
        <div style={{ display: 'grid', gap: '8px', fontSize: '14px', marginTop: '15px' }}>
          <div>✅ <strong>Orthanc PACS:</strong> 6 plugins actifs (http://localhost:8042)</div>
          <div>✅ <strong>Stone Web Viewer:</strong> Intégré et fonctionnel</div>
          <div>✅ <strong>OHIF Viewer:</strong> Container Docker healthy</div>
          <div>✅ <strong>DICOMweb API:</strong> QIDO-RS, WADO-RS, STOW-RS</div>
          <div>⚠️ <strong>Cornerstone.js:</strong> En cours de résolution</div>
        </div>
      </div>

        {/* Test d'intégration RIS-PACS */}
        <div style={{ background: '#e6f3ff', padding: '20px', borderRadius: '8px', border: '2px solid #0066CC', marginTop: '30px' }}>
          <h3 style={{ color: '#0066CC' }}>🔗 Test Patient TAP Onco (Intégration RIS-PACS)</h3>
          <p style={{ color: '#0066CC', marginBottom: '15px' }}>
            Patient Marc DUBOIS avec 3 examens TAP liés aux études DICOM
          </p>
          
          <div style={{ display: 'grid', gap: '10px', marginBottom: '15px', fontSize: '14px' }}>
            <div>📋 <strong>Patient ID RIS:</strong> cme9ue4kt0001zmx7o24ko5f3</div>
            <div>🏥 <strong>3 examens TAP:</strong> 21/08/2018, 18/01/2019, 07/03/2019</div>
            <div>🔗 <strong>Liaison PACS:</strong> StudyInstanceUID synchronisés</div>
            <div>✅ <strong>Images disponibles:</strong> Stone, OHIF, Orthanc Explorer</div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.open('http://localhost:3000/api/patients/cme9ue4kt0001zmx7o24ko5f3', '_blank')}
              style={{
                padding: '10px 20px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              👤 Voir Patient API
            </button>
            
            <button
              onClick={() => window.open('http://localhost:8042/stone-webviewer/index.html?study=1798996c-5d5cecb5-f1e94353-b4182765-64f553cb', '_blank')}
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
              🔬 Voir TAP 2018
            </button>

            <button
              onClick={() => window.open('http://localhost:8042/stone-webviewer/index.html?study=19e4ec2a-75263992-a7ae5234-d1ccb856-25b05fbe', '_blank')}
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
              🔬 Voir TAP 2019-01
            </button>

            <button
              onClick={() => window.open('http://localhost:8042/stone-webviewer/index.html?study=5e659b19-ef453868-ea40526b-060bea7f-ded9291f', '_blank')}
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
              🔬 Voir TAP 2019-03
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: '#d1ecf1', padding: '20px', borderRadius: '8px', marginTop: '20px', border: '1px solid #bee5eb' }}>
          <h3 style={{ color: '#0c5460' }}>📋 Comment Utiliser</h3>
          <ol style={{ color: '#0c5460', marginTop: '10px' }}>
            <li>Cliquer sur un des boutons ci-dessus</li>
            <li>Le visualisateur s'ouvre dans un nouvel onglet</li>
            <li>Naviguer vers les études DICOM disponibles</li>
            <li>Tester les outils de visualisation (zoom, windowing, mesures)</li>
            <li>Les images sont chargées depuis Orthanc PACS</li>
          </ol>
        </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '12px', color: '#666' }}>
        <p><strong>RADRIS</strong> - Système RIS-PACS Open Source</p>
        <p>Visualisateurs DICOM professionnels intégrés ✨</p>
      </div>
    </div>
  );
}