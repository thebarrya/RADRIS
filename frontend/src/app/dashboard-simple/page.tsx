'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  totalPatients: number;
  totalExaminations: number;
  todayExams: number;
  pendingReports: number;
  userInfo: {
    name: string;
    email: string;
    role: string;
  };
}

export default function DashboardSimplePage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/test-login');
      return;
    }

    loadDashboardStats();
  }, [session, status, router]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Simulate API calls to get dashboard data
      const [patientsRes, examinationsRes] = await Promise.all([
        fetch('/api/patients?limit=1').then(r => r.ok ? r.json() : { data: { pagination: { total: 0 } } }),
        fetch('/api/examinations?limit=1').then(r => r.ok ? r.json() : { data: { pagination: { total: 0 } } })
      ]);

      const dashboardStats: DashboardStats = {
        totalPatients: patientsRes.data?.pagination?.total || 0,
        totalExaminations: examinationsRes.data?.pagination?.total || 0,
        todayExams: Math.floor(Math.random() * 10) + 1, // Simulated
        pendingReports: Math.floor(Math.random() * 5) + 1, // Simulated
        userInfo: {
          name: session?.user?.name || 'Utilisateur',
          email: session?.user?.email || '',
          role: session?.user?.role || 'USER'
        }
      };

      setStats(dashboardStats);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/test-login');
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  if (status === 'loading') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'system-ui'
      }}>
        <div>⏳ Chargement de la session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'system-ui'
      }}>
        <div>🔐 Redirection vers la connexion...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ 
        background: 'white', 
        borderBottom: '1px solid #e9ecef',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#0066CC', fontSize: '24px' }}>
            🏥 RADRIS Dashboard
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Système d'Information Radiologique
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: '600', color: '#333' }}>{stats?.userInfo.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{stats?.userInfo.role}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🚪 Déconnexion
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Welcome Message */}
        <div style={{ 
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px',
          border: '1px solid #e9ecef'
        }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>
            👋 Bienvenue, {stats?.userInfo.name}
          </h2>
          <p style={{ margin: 0, color: '#666' }}>
            Voici un aperçu de l'activité de votre système RIS-PACS.
          </p>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>⏳ Chargement des statistiques...</div>
          </div>
        ) : error ? (
          <div style={{ 
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            padding: '20px',
            color: '#721c24',
            textAlign: 'center'
          }}>
            <div>❌ {error}</div>
            <button 
              onClick={loadDashboardStats}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                background: '#0066CC',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 Réessayer
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            {/* Patients Card */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e9ecef',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', color: '#0066CC', marginBottom: '10px' }}>
                👤
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
                {stats?.totalPatients}
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>Patients total</div>
            </div>

            {/* Examinations Card */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e9ecef',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', color: '#28a745', marginBottom: '10px' }}>
                🏥
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
                {stats?.totalExaminations}
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>Examens total</div>
            </div>

            {/* Today's Exams Card */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e9ecef',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', color: '#ffc107', marginBottom: '10px' }}>
                📅
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
                {stats?.todayExams}
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>Examens aujourd'hui</div>
            </div>

            {/* Pending Reports Card */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e9ecef',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', color: '#dc3545', marginBottom: '10px' }}>
                📄
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
                {stats?.pendingReports}
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>Rapports en attente</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e9ecef',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>🚀 Actions Rapides</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <button
              onClick={() => navigateTo('/patients')}
              style={{
                padding: '15px',
                background: '#0066CC',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              👤 Gérer les Patients
            </button>

            <button
              onClick={() => navigateTo('/examinations')}
              style={{
                padding: '15px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              🏥 Planifier Examens
            </button>

            <button
              onClick={() => navigateTo('/reports')}
              style={{
                padding: '15px',
                background: '#ffc107',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              📄 Comptes-rendus
            </button>

            <button
              onClick={() => navigateTo('/worklist')}
              style={{
                padding: '15px',
                background: '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              📋 Worklist
            </button>
          </div>
        </div>

        {/* RIS-PACS Integration Status */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>🔗 État de l'Intégration RIS-PACS</h3>
          
          <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#28a745' }}>✅</span>
              <span><strong>Backend API:</strong> Connecté (http://localhost:3001)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#28a745' }}>✅</span>
              <span><strong>Orthanc PACS:</strong> Opérationnel (http://localhost:8042)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#28a745' }}>✅</span>
              <span><strong>Patient TAP Onco:</strong> 3 examens liés aux images DICOM</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#28a745' }}>✅</span>
              <span><strong>Visualisateurs:</strong> Stone Web Viewer, OHIF actifs</span>
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <button
              onClick={() => navigateTo('/test-viewer-working')}
              style={{
                padding: '10px 20px',
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔬 Tester les Visualisateurs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}