'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export default function UsersManagementPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'TECHNICIAN'
  });
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/test-login');
      return;
    }

    if (session.user.role !== 'ADMIN') {
      router.push('/dashboard-simple');
      return;
    }

    loadUsers();
  }, [session, status, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Simulated users data since we don't have a users list API yet
      const mockUsers: User[] = [
        {
          id: 'cme9nq9tq0000rhgl8pcq1103',
          email: 'admin@radris.fr',
          firstName: 'Administrateur',
          lastName: 'Système',
          role: 'ADMIN',
          active: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'user2',
          email: 'dr.martin@radris.fr',
          firstName: 'Dr. Pierre',
          lastName: 'MARTIN',
          role: 'RADIOLOGIST_SENIOR',
          active: true,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'user3',
          email: 'tech.marie@radris.fr',
          firstName: 'Marie',
          lastName: 'TECHNICIENNE',
          role: 'TECHNICIAN',
          active: true,
          createdAt: new Date(Date.now() - 172800000).toISOString()
        }
      ];
      
      setUsers(mockUsers);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        alert('Utilisateur créé avec succès !');
        setShowCreateForm(false);
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          password: '',
          role: 'TECHNICIAN'
        });
        loadUsers();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error || 'Échec de la création'}`);
      }
    } catch (error) {
      alert('Erreur lors de la création de l\'utilisateur');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return { bg: '#dc3545', text: 'white' };
      case 'RADIOLOGIST_SENIOR': return { bg: '#0066CC', text: 'white' };
      case 'RADIOLOGIST_JUNIOR': return { bg: '#6f42c1', text: 'white' };
      case 'TECHNICIAN': return { bg: '#28a745', text: 'white' };
      case 'SECRETARY': return { bg: '#ffc107', text: 'black' };
      default: return { bg: '#6c757d', text: 'white' };
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrateur';
      case 'RADIOLOGIST_SENIOR': return 'Radiologue Senior';
      case 'RADIOLOGIST_JUNIOR': return 'Radiologue Junior';
      case 'TECHNICIAN': return 'Technicien';
      case 'SECRETARY': return 'Secrétaire';
      default: return role;
    }
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
        <div>⏳ Chargement...</div>
      </div>
    );
  }

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'system-ui'
      }}>
        <div>🔒 Accès refusé - Administrateur requis</div>
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
            👥 Gestion des Utilisateurs
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Administration des comptes utilisateurs RADRIS
          </p>
        </div>
        
        <button
          onClick={() => router.push('/dashboard-simple')}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ← Retour Dashboard
        </button>
      </div>

      {/* Main Content */}
      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Actions */}
        <div style={{ marginBottom: '30px' }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              padding: '12px 24px',
              background: showCreateForm ? '#dc3545' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            {showCreateForm ? '❌ Annuler' : '➕ Nouvel Utilisateur'}
          </button>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '30px',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Créer un Nouvel Utilisateur</h3>
            
            <form onSubmit={handleCreateUser}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '15px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Rôle
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="TECHNICIAN">Technicien</option>
                    <option value="SECRETARY">Secrétaire</option>
                    <option value="RADIOLOGIST_JUNIOR">Radiologue Junior</option>
                    <option value="RADIOLOGIST_SENIOR">Radiologue Senior</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  background: '#0066CC',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ✅ Créer l'Utilisateur
              </button>
            </form>
          </div>
        )}

        {/* Users List */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e9ecef',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '15px 20px', 
            borderBottom: '1px solid #e9ecef',
            background: '#f8f9fa'
          }}>
            <h3 style={{ margin: 0, color: '#333' }}>Utilisateurs Enregistrés</h3>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div>⏳ Chargement des utilisateurs...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#dc3545' }}>
              <div>❌ {error}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef' }}>
                      Utilisateur
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef' }}>
                      Email
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e9ecef' }}>
                      Rôle
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e9ecef' }}>
                      Status
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e9ecef' }}>
                      Créé le
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const roleColor = getRoleBadgeColor(user.role);
                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                        <td style={{ padding: '12px' }}>
                          <div>
                            <div style={{ fontWeight: '500' }}>
                              {user.firstName} {user.lastName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              ID: {user.id.substring(0, 8)}...
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {user.email}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: roleColor.bg,
                            color: roleColor.text
                          }}>
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: user.active ? '#d4edda' : '#f8d7da',
                            color: user.active ? '#155724' : '#721c24'
                          }}>
                            {user.active ? '✅ Actif' : '❌ Inactif'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                          {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}