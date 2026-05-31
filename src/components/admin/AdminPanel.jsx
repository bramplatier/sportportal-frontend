import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { startRegistration } from '@simplewebauthn/browser';
import { API_BASE_URL, adminApi, authApi } from '../../services/apiClient';
import { normalizeRole } from '../../utils/auth';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import useMacVerification from '../../hooks/useMacVerification';
import MacManagement from './MacManagement';
import Modal from '../ui/Modal';
import './AdminPanel.css';

const EMPTY_OVERVIEW = {
  totalUsers: 0,
  activeLessons: 0,
  votesToday: 0,
  mfaEnabled: 0,
};

const ROLE_OPTIONS = ['customer', 'trainer', 'admin'];
const STATUS_OPTIONS = ['active', 'inactive', 'suspended'];

const AdminPanel = () => {
  usePageTitle('Admin Control Center');
  const { user: currentUser } = useAuth(); // Hernoemd naar currentUser voor duidelijkheid
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [users, setUsers] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [userCategories, setUserCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [search, setSearch] = useState('');
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'trainer',
    status: 'active',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal & MFA & Passkey States
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', data: null });
  const [mfaSetupData, setMfaSetupData] = useState(null);
  const [mfaOtp, setMfaOtp] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { 
    macStatus, 
    checkMacStatus, 
    registerCurrentDevice 
  } = useMacVerification();
  const [hasPasskey, setHasPasskey] = useState(false);

  useEffect(() => {
    const loadInitial = async () => {
      setIsLoading(true);
      setError('');
      try {
        // First check MAC status and Passkey status
        const [status, meRes] = await Promise.all([
          checkMacStatus(),
          authApi.getMe()
        ]);
        
        const currentStatus = status?.data || status;
        const me = meRes?.user || meRes;
        setHasPasskey(!!me?.hasPasskey);

        // If MAC is verified or not required, load the rest
        if (!currentStatus?.macVerificationRequired || currentStatus?.isVerified) {
          const [o, u] = await Promise.all([
            adminApi.getOverview(),
            adminApi.getUsers(),
          ]);
          setOverview({ ...EMPTY_OVERVIEW, ...(o || {}) });
          setUsers(Array.isArray(u) ? u : []);
        }
      } catch (err) {
        if (err.message?.includes('MAC') || err.status === 403) {
          // Handled by registration UI
        } else {
          setError('Data laden mislukt.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadInitial();
  }, [checkMacStatus]);

  const handleRegisterCurrent = async () => {
    setIsActionLoading(true);
    try {
      await registerCurrentDevice(`Mijn Apparaat (${new Date().toLocaleDateString('nl-NL')})`);
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Registratie mislukt');
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => 
      (u.name || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q)
    );
  }, [search, users]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const confirmAction = (type, data) => {
    setModalConfig({ isOpen: true, type, data });
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, type: '', data: null });
    setMfaSetupData(null);
    setMfaOtp('');
  };

  const executeAction = async () => {
    const { type, data } = modalConfig;
    setIsActionLoading(true);
    try {
      if (type === 'DELETE_USER') {
        await adminApi.deleteUser({ userId: data.id });
        setUsers(prev => prev.filter(u => u.id !== data.id));
        showSuccess('Gebruiker verwijderd.');
        closeModal();
      } else if (type === 'RESET_MFA') {
        await adminApi.resetUserMfa({ userId: data.id });
        setUsers(prev => prev.map(u => u.id === data.id ? { ...u, mfaEnabled: false } : u));
        showSuccess('MFA gereset.');
        closeModal();
      }
    } catch (err) {
      setError(`Actie mislukt: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const startMfaSetup = async (targetUser) => {
    setIsActionLoading(true);
    try {
      const data = await adminApi.startUserMfaSetup({ userId: targetUser.id });
      setMfaSetupData(data);
      setModalConfig({ isOpen: true, type: 'MFA_SETUP', data: targetUser });
    } catch (err) {
      setError('MFA setup starten mislukt.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const confirmMfaSetup = async (e) => {
    e.preventDefault();
    if (mfaOtp.length !== 6) return;
    setIsActionLoading(true);
    try {
      await adminApi.confirmUserMfaSetup({
        userId: modalConfig.data.id,
        otp: mfaOtp,
        setupToken: mfaSetupData.setupToken
      });
      setUsers(prev => prev.map(u => u.id === modalConfig.data.id ? { ...u, mfaEnabled: true } : u));
      showSuccess('MFA succesvol ingesteld.');
      closeModal();
    } catch (err) {
      setError('MFA verificatie mislukt.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const registerMyPasskey = async () => {
    setIsActionLoading(true);
    setError('');
    try {
      const options = await authApi.getPasskeyRegisterOptions();
      const regResponse = await startRegistration({ optionsJSON: options });
      await authApi.verifyPasskeyRegister(regResponse);
      showSuccess('Passkey succesvol geregistreerd voor jouw account!');
    } catch (err) {
      console.error(err);
      setError('Passkey registratie mislukt. Zorg dat je biometrie/security key gebruikt.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const updateUserField = (userId, field, value) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u));
    adminApi.updateUser({ userId, payload: { [field]: value } }).catch(() => setError('Wijziging mislukt.'));
  };

  const createUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const created = await adminApi.createUser({ payload: newUserForm });
      setUsers(prev => [created, ...prev]);
      setNewUserForm({ name: '', email: '', role: 'trainer', status: 'active', password: '' });
      showSuccess('Gebruiker aangemaakt.');
      startMfaSetup(created);
    } catch (err) {
      setError(err.message || 'Aanmaken mislukt.');
    }
  };

  const editCategories = async (user) => {
    setIsActionLoading(true);
    try {
      const [all, mine] = await Promise.all([
        adminApi.getCategories(),
        adminApi.getUserCategories(user.id)
      ]);
      setAllCategories(all);
      setUserCategories(mine);
      setModalConfig({ isOpen: true, type: 'EDIT_CATEGORIES', data: user });
    } catch (err) {
      setError('Categorieën laden mislukt.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const toggleCategory = async (categoryId, joined) => {
    try {
      await adminApi.updateUserCategory(modalConfig.data.id, { categoryId, joined });
      if (joined) {
        const cat = allCategories.find(c => c.id === categoryId);
        setUserCategories(prev => [...prev, cat]);
      } else {
        setUserCategories(prev => prev.filter(c => c.id !== categoryId));
      }
    } catch (err) {
      setError('Update mislukt.');
    }
  };

  return (
    <section className="admin-wrap">
      <header className="admin-header">
        <div>
          <h1>Admin Cockpit</h1>
          {error && <div className="login-error" style={{marginTop: '1rem'}}>{error}</div>}
          {success && <p className="alert alert-success" style={{margin: '1rem 0'}}>{success}</p>}
        </div>
        <div className="source-pill live">LIVE <span>{API_BASE_URL}</span></div>
      </header>

      {/* Security Prerequisite Section */}
      <section className="admin-card security-card" style={{margin: '0 0 2rem 0', background: 'var(--color-bg-light)', borderLeft: '4px solid var(--color-brand)'}}>
        <h2 style={{fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--color-brand)'}}>🛡️ Beveiligingsstatus</h2>
        <div className="security-check-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
          
          <div className="check-item">
            <p><strong>1. Passkey Status:</strong> {hasPasskey ? <span style={{color:'var(--color-accent)'}}>✓ Geconfigureerd</span> : <span style={{color:'var(--color-brand)'}}>⚠ Vereist</span>}</p>
            {!hasPasskey && <p style={{fontSize:'0.8rem', margin:'0.5rem 0'}}>U moet een Passkey hebben om apparaten te kunnen vertrouwen.</p>}
            <button 
              className={`btn btn-full ${hasPasskey ? 'btn-outline' : 'btn-primary'}`} 
              onClick={registerMyPasskey} 
              disabled={isActionLoading}
            >
              {hasPasskey ? 'Passkey Beheren' : 'Registreer Passkey'}
            </button>
          </div>

          <div className="check-item">
            <p><strong>2. Apparaat Status:</strong> {macStatus?.isVerified ? <span style={{color:'var(--color-accent)'}}>✓ Vertrouwd</span> : <span style={{color:'var(--color-brand)'}}>⚠ Niet geverifieerd</span>}</p>
            {!macStatus?.isVerified && (
              <>
                <p style={{fontSize:'0.8rem', margin:'0.5rem 0'}}>Dit apparaat heeft geen toegang tot admin functies.</p>
                <button 
                  className="btn btn-full btn-primary" 
                  onClick={handleRegisterCurrent}
                  disabled={isActionLoading || !hasPasskey}
                  title={!hasPasskey ? "Eerst een Passkey registreren" : ""}
                >
                  {isActionLoading ? 'Bezig...' : 'Dit apparaat vertrouwen'}
                </button>
              </>
            )}
            {macStatus?.isVerified && <p style={{fontSize:'0.8rem', color:'var(--color-accent)', marginTop:'0.5rem'}}>ID: {macStatus?.currentMacAddress}</p>}
          </div>

        </div>
      </section>

      {(!macStatus?.isVerified && macStatus?.macVerificationRequired) ? (
        <div className="admin-card" style={{textAlign: 'center', padding: '3rem'}}>
          <h3>Toegang Geblokkeerd</h3>
          <p>Bevestig uw identiteit hierboven door dit apparaat te vertrouwen.</p>
        </div>
      ) : (
        <>
          <div className="admin-metrics">
            <article><h2>Systeemgebruikers</h2><strong>{overview.totalUsers}</strong></article>
            <article><h2>MFA Adoptie</h2><strong>{overview.mfaEnabled}%</strong></article>
            <article><h2>Stemmen Vandaag</h2><strong>{overview.votesToday}</strong></article>
          </div>

          <div className="admin-toolbar">
            <div className="tabs">
              <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>GEBRUIKERS</button>
              <button className={activeTab === 'mac' ? 'active' : ''} onClick={() => setActiveTab('mac')}>🔒 MAC</button>
            </div>
            {activeTab === 'users' && <input type="search" placeholder="Zoek op naam/email..." value={search} onChange={e => setSearch(e.target.value)} />}
          </div>

          {isLoading ? <p>Data laden...</p> : (
            <div className="admin-content">
              {activeTab === 'users' && (
                <>
                  <section className="admin-user-form-shell">
                    <h2>Nieuw Account</h2>
                    <form className="admin-user-form" onSubmit={createUser}>
                      <div className="form-field"><label>Naam</label><input type="text" value={newUserForm.name} onChange={e => setNewUserForm(p => ({...p, name: e.target.value}))} required /></div>
                      <div className="form-field"><label>E-mail</label><input type="email" value={newUserForm.email} onChange={e => setNewUserForm(p => ({...p, email: e.target.value}))} required /></div>
                      <div className="form-field"><label>Wachtwoord</label><input type="password" value={newUserForm.password} onChange={e => setNewUserForm(p => ({...p, password: e.target.value}))} required minLength={8} /></div>
                      <div className="form-field">
                        <label>Rol</label>
                        <select className="select-styled" value={newUserForm.role} onChange={e => setNewUserForm(p => ({...p, role: e.target.value}))}>
                          <option value="trainer">Trainer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={isActionLoading}>Maak Gebruiker</button>
                    </form>
                  </section>

                  <div className="table-shell">
                    <table>
                      <thead><tr><th>Naam</th><th>Rol</th><th>Status</th><th>Acties</th></tr></thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr key={u.id}>
                            <td><strong>{u.name}</strong><span>{u.email}</span></td>
                            <td>
                              <select className="select-styled" value={normalizeRole(u.role)} onChange={e => updateUserField(u.id, 'role', e.target.value)}>
                                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </td>
                            <td>
                              <select className="select-styled" value={u.status || 'active'} onChange={e => updateUserField(u.id, 'status', e.target.value)}>
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td>
                              <div className="user-actions-row">
                                {['trainer', 'admin'].includes(normalizeRole(u.role)) && (
                                  <button className="btn btn-primary" onClick={() => editCategories(u)} title="Specialisaties">Cats</button>
                                )}
                                {!u.mfaEnabled ? (
                                  <button className="btn btn-accent" onClick={() => startMfaSetup(u)}>MFA Setup</button>
                                ) : (
                                  <button className="btn btn-outline" onClick={() => confirmAction('RESET_MFA', u)}>Reset MFA</button>
                                )}
                                <button className="btn btn-danger" onClick={() => confirmAction('DELETE_USER', u)}>Wissen</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {activeTab === 'mac' && <MacManagement />}
            </div>
          )}
        </>
      )}

      <Modal 
        isOpen={modalConfig.isOpen} 
        onClose={closeModal} 
        title={modalConfig.type === 'MFA_SETUP' ? "MFA Activeren" : "Bevestiging"}
        actions={modalConfig.type !== 'MFA_SETUP' && (
          <>
            <button className="btn btn-outline" onClick={closeModal}>Nee</button>
            <button className="btn btn-danger" onClick={executeAction} disabled={isActionLoading}>Ja, uitvoeren</button>
          </>
        )}
      >
        {modalConfig.type === 'DELETE_USER' && <p>Gebruiker {modalConfig.data?.name} definitief verwijderen? Dit kan niet ongedaan worden gemaakt.</p>}
        {modalConfig.type === 'RESET_MFA' && <p>MFA herstarten voor {modalConfig.data?.name}?</p>}
        {modalConfig.type === 'EDIT_CATEGORIES' && (
          <div className="category-edit-list" style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
            <p>Specialisaties voor <strong>{modalConfig.data?.name}</strong>:</p>
            {allCategories.map(cat => (
              <label key={cat.id} className="checkbox-label" style={{justifyContent:'space-between', padding:'0.5rem', background:'var(--color-surface)', borderRadius:'4px'}}>
                <span>{cat.name}</span>
                <input 
                  type="checkbox" 
                  checked={userCategories.some(c => c.id === cat.id)}
                  onChange={(e) => toggleCategory(cat.id, e.target.checked)}
                />
              </label>
            ))}
          </div>
        )}
        {modalConfig.type === 'MFA_SETUP' && mfaSetupData && (
          <div style={{textAlign: 'center'}}>
            <p>Scan QR voor <strong>{modalConfig.data?.email}</strong></p>
            <img src={mfaSetupData.qrImageUrl} alt="QR" className="qr-code" style={{border: '8px solid #fff', borderRadius: '8px', margin: '1rem 0'}} />
            <form onSubmit={confirmMfaSetup} className="compact-form">
              <input type="text" placeholder="6 cijfers" value={mfaOtp} onChange={e => setMfaOtp(e.target.value.replace(/\D/g, ''))} maxLength="6" style={{textAlign: 'center'}} />
              <button type="submit" className="btn btn-primary" disabled={isActionLoading || mfaOtp.length !== 6}>Verifiëren</button>
            </form>
          </div>
        )}
      </Modal>

      <footer className="admin-footer"><Link to="/dashboard">← Dashboard</Link></footer>
    </section>
  );
};

export default AdminPanel;
