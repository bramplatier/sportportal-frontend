import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, adminApi } from '../../services/apiClient';
import { normalizeRole } from '../../utils/auth';
import { usePageTitle } from '../../hooks/usePageTitle';
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
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [search, setSearch] = useState('');
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'trainer',
    status: 'active',
    password: '',
    requireMfa: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', data: null });

  const { macStatus } = useMacVerification();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [o, u, a] = await Promise.all([
          adminApi.getOverview(),
          adminApi.getUsers(),
          adminApi.getActivities()
        ]);
        setOverview({ ...EMPTY_OVERVIEW, ...(o || {}) });
        setUsers(Array.isArray(u) ? u : []);
        setActivities(Array.isArray(a) ? a : []);
      } catch (err) {
        setError('Data laden mislukt.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => 
      (u.name || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q)
    );
  }, [search, users]);

  const confirmAction = (type, data) => setModalConfig({ isOpen: true, type, data });
  const closeModal = () => setModalConfig({ isOpen: false, type: '', data: null });

  const executeAction = async () => {
    const { type, data } = modalConfig;
    closeModal();
    try {
      if (type === 'DELETE_USER') {
        await adminApi.deleteUser({ userId: data.id });
        setUsers(prev => prev.filter(u => u.id !== data.id));
      } else if (type === 'RESET_MFA') {
        await adminApi.resetUserMfa({ userId: data.id });
      }
    } catch (err) {
      setError(`Actie ${type} mislukt.`);
    }
  };

  const updateUserField = (userId, field, value) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u));
    adminApi.updateUser({ userId, payload: { [field]: value } }).catch(() => setError('Wijziging mislukt.'));
  };

  const createUser = (e) => {
    e.preventDefault();
    adminApi.createUser({ payload: newUserForm }).then(created => {
      setUsers(prev => [created, ...prev]);
      setNewUserForm({ name: '', email: '', role: 'trainer', status: 'active', password: '', requireMfa: true });
      setError('');
    }).catch(() => {
      setError('Aanmaken mislukt. Controleer of het e-mailadres uniek is en het wachtwoord minimaal 8 tekens bevat.');
    });
  };

  return (
    <section className="admin-wrap">
      <header className="admin-header">
        <div>
          <h1>Admin</h1>
          <p>Beheer van het SportPortal platform</p>
          {macStatus?.macVerificationRequired && !macStatus?.isVerified && (
            <div className="mac-warning-banner">⚠️ MAC-verificatie vereist voor beheeracties</div>
          )}
          {error && <p className="admin-error">{error}</p>}
        </div>
        <div className="source-pill live">
          LIVE
          <span>{API_BASE_URL}</span>
        </div>
      </header>

      <div className="admin-metrics">
        <article>
          <h2>Gebruikers</h2>
          <strong>{overview.totalUsers}</strong>
        </article>
        <article>
          <h2>MFA Adoptie</h2>
          <strong>{overview.mfaEnabled}%</strong>
        </article>
      </div>

      <div className="admin-toolbar">
        <div className="tabs">
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>Gebruikers</button>
          <button className={activeTab === 'activities' ? 'active' : ''} onClick={() => setActiveTab('activities')}>Activiteiten</button>
          <button className={activeTab === 'mac' ? 'active' : ''} onClick={() => setActiveTab('mac')}>🔒 MAC</button>
        </div>
        {activeTab === 'users' && (
          <input 
            type="search" 
            placeholder="Zoek op naam of email..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        )}
      </div>

      {isLoading ? <p>Laden...</p> : (
        <div className="admin-content">
          {activeTab === 'users' && (
            <>
              <section className="admin-user-form-shell">
                <h2>Nieuwe Trainer / Admin</h2>
                <form className="admin-user-form" onSubmit={createUser}>
                  <div className="form-field">
                    <label>Naam</label>
                    <input type="text" value={newUserForm.name} onChange={e => setNewUserForm(p => ({...p, name: e.target.value}))} required />
                  </div>
                  <div className="form-field">
                    <label>E-mail</label>
                    <input type="email" value={newUserForm.email} onChange={e => setNewUserForm(p => ({...p, email: e.target.value}))} required />
                  </div>
                  <div className="form-field">
                    <label>Wachtwoord</label>
                    <input type="password" placeholder="Min. 8 tekens" value={newUserForm.password} onChange={e => setNewUserForm(p => ({...p, password: e.target.value}))} required minLength={8} />
                  </div>
                  <div className="form-field">
                    <label>Rol</label>
                    <select className="select-styled" value={newUserForm.role} onChange={e => setNewUserForm(p => ({...p, role: e.target.value}))}>
                      <option value="trainer">Trainer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="checkbox-field">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={newUserForm.requireMfa} onChange={e => setNewUserForm(p => ({...p, requireMfa: e.target.checked}))} />
                      MFA Verplicht stellen
                    </label>
                  </div>
                  <button type="submit" className="btn btn-primary">Account Aanmaken</button>
                </form>
              </section>

              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Gebruiker</th>
                      <th>Rol</th>
                      <th>Status</th>
                      <th>Acties</th>
                    </tr>
                  </thead>
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
                            <button className="btn btn-outline" onClick={() => confirmAction('RESET_MFA', u)}>MFA Reset</button>
                            <button className="btn btn-danger" onClick={() => confirmAction('DELETE_USER', u)}>Verwijder</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'activities' && (
            <div className="cards-grid">
              {activities.map(a => (
                <article key={a.id} className="admin-card">
                  <h3>{a.title}</h3>
                  <p>Status: <span className="status-pill">{a.status}</span></p>
                  <p>Bezetting: {a.enrolled}/{a.capacity}</p>
                </article>
              ))}
            </div>
          )}

          {activeTab === 'mac' && <MacManagement />}
        </div>
      )}

      <Modal 
        isOpen={modalConfig.isOpen} 
        onClose={closeModal} 
        title="Bevestiging"
        actions={<>
          <button className="btn btn-outline" onClick={closeModal}>Nee</button>
          <button className={`btn ${modalConfig.type === 'DELETE_USER' ? 'btn-danger' : 'btn-primary'}`} onClick={executeAction}>Ja, uitvoeren</button>
        </>}
      >
        <p>
          {modalConfig.type === 'DELETE_USER' 
            ? `Gebruiker ${modalConfig.data?.name} definitief verwijderen?`
            : `MFA resetten voor ${modalConfig.data?.name}? De gebruiker moet MFA opnieuw instellen bij volgende login.`}
        </p>
      </Modal>

      <footer className="admin-footer"><Link to="/dashboard">← Terug naar Dashboard</Link></footer>
    </section>
  );
};

export default AdminPanel;
