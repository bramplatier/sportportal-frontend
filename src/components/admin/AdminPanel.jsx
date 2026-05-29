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

const getTrainerName = (trainer) => trainer?.name || trainer?.fullName || trainer?.email || 'Onbekende trainer';
const getTrainerId = (trainer) => trainer?.id || trainer?.userId || trainer?.trainerId || '';
const ROLE_OPTIONS = ['customer', 'trainer', 'admin'];
const STATUS_OPTIONS = ['active', 'inactive', 'suspended'];

const AdminPanel = () => {
  usePageTitle('Admin Control Center');
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [users, setUsers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [votes, setVotes] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [search, setSearch] = useState('');
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'trainer',
    status: 'active',
    temporaryPassword: '',
  });
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', data: null });

  const { macStatus } = useMacVerification();

  useEffect(() => {
    const loadAdminData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [overviewData, usersData, activitiesData, votesData] = await Promise.all([
          adminApi.getOverview(),
          adminApi.getUsers(),
          adminApi.getActivities(),
          adminApi.getVotes(),
        ]);
        setOverview({ ...EMPTY_OVERVIEW, ...(overviewData || {}) });
        setUsers(Array.isArray(usersData) ? usersData : []);
        setActivities(Array.isArray(activitiesData) ? activitiesData : []);
        setVotes(Array.isArray(votesData) ? votesData : []);

        try {
          const trainerData = await adminApi.getTrainers();
          setTrainers(Array.isArray(trainerData) ? trainerData : []);
        } catch (trainerError) {
          setTrainers(Array.isArray(usersData) ? usersData.filter(u => normalizeRole(u.role) === 'trainer') : []);
        }
        setIsLiveMode(true);
      } catch (err) {
        setError('Admin data kon niet geladen worden.');
        setIsLiveMode(false);
      } finally {
        setIsLoading(false);
      }
    };
    loadAdminData();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(u => (u.name || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query));
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
      setNewUserForm({ name: '', email: '', role: 'trainer', status: 'active', temporaryPassword: '' });
    }).catch(() => setError('Nieuwe gebruiker aanmaken mislukt.'));
  };

  return (
    <section className="admin-wrap">
      <header className="admin-header">
        <div>
          <h1>Admin</h1>
          <p>Systeembrede cockpit</p>
          {macStatus?.macVerificationRequired && !macStatus?.isVerified && (
            <div className="mac-warning-banner">⚠️ MAC-verificatie vereist voor beheer</div>
          )}
          {error && <p className="admin-error">{error}</p>}
        </div>
        <div className={`source-pill ${isLiveMode ? 'live' : 'offline'}`}>
          {isLiveMode ? 'Live' : 'Offline'}
          <span>{API_BASE_URL}</span>
        </div>
      </header>

      <div className="admin-metrics">
        <article><h2>Gebruikers</h2><strong>{overview.totalUsers}</strong></article>
        <article><h2>Lessen</h2><strong>{overview.activeLessons}</strong></article>
        <article><h2>MFA</h2><strong>{overview.mfaEnabled}%</strong></article>
      </div>

      <div className="admin-toolbar">
        <div className="tabs">
          {['users', 'activities', 'votes', 'mac'].map(tab => (
            <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
              {tab === 'mac' ? '🔒 MAC' : tab}
            </button>
          ))}
        </div>
        {activeTab === 'users' && <input type="search" placeholder="Zoek gebruiker..." value={search} onChange={e => setSearch(e.target.value)} />}
      </div>

      {isLoading ? <p>Laden...</p> : (
        <div className="admin-content">
          {activeTab === 'users' && (
            <>
              <section className="admin-user-form-shell">
                <h2>Nieuwe Trainer/Admin</h2>
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
                    <label>Rol</label>
                    <select value={newUserForm.role} onChange={e => setNewUserForm(p => ({...p, role: e.target.value}))}>
                      <option value="trainer">Trainer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">Aanmaken</button>
                </form>
              </section>

              <div className="table-shell">
                <table>
                  <thead><tr><th>Naam</th><th>Rol</th><th>Status</th><th>Beheer</th></tr></thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong><span>{u.email}</span></td>
                        <td>
                          <select value={normalizeRole(u.role)} onChange={e => updateUserField(u.id, 'role', e.target.value)}>
                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td>
                          <select value={u.status || 'active'} onChange={e => updateUserField(u.id, 'status', e.target.value)}>
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
                  <p>Trainer: {a.coach || 'Geen'}</p>
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
        title="Bevestiging Vereist"
        actions={<>
          <button className="btn btn-outline" onClick={closeModal}>Annuleren</button>
          <button className={`btn ${modalConfig.type === 'DELETE_USER' ? 'btn-danger' : 'btn-primary'}`} onClick={executeAction}>Bevestigen</button>
        </>}
      >
        <p>
          {modalConfig.type === 'DELETE_USER' 
            ? `Weet je zeker dat je de gebruiker ${modalConfig.data?.name} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`
            : `Weet je zeker dat je de MFA voor ${modalConfig.data?.name} wilt resetten?`}
        </p>
      </Modal>

      <footer className="admin-footer"><Link to="/dashboard">← Dashboard</Link></footer>
    </section>
  );
};

export default AdminPanel;
