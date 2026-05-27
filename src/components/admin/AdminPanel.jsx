import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, adminApi } from '../../services/apiClient';
import { normalizeRole } from '../../utils/auth';
import { usePageTitle } from '../../hooks/usePageTitle';
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

/**
 * Sanitizes user input to prevent XSS attacks
 * - Removes HTML tags and scripts
 * - Escapes dangerous characters
 * - Limits length
 */
const sanitizeInput = (input, maxLength = 255) => {
  if (!input || typeof input !== 'string') return '';

  return input
    .trim()
    // Verwijder HTML tags en script-achtige content
    .replace(/<[^>]*>/g, '')
    // Escape XSS-gevoelige karakters
    .replace(/[<>\"'`]/g, (char) => {
      const escapeMap = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '`': '&#x60;' };
      return escapeMap[char];
    })
    // Verwijder kontrolekarakters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Beperk lengte
    .substring(0, maxLength);
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validates and sanitizes password/temporary password
 * - Checks minimum length (8 characters)
 * - Removes HTML tags
 * - Limits length
 */
const sanitizePassword = (password, minLength = 8, maxLength = 128) => {
  if (!password || typeof password !== 'string') return null;

  const trimmed = password.trim();
  if (trimmed.length === 0) return null;

  if (trimmed.length < minLength) {
    throw new Error(`Wachtwoord moet minstens ${minLength} karakters lang zijn.`);
  }

  return trimmed
    .replace(/<[^>]*>/g, '')
    .substring(0, maxLength);
};

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

        const normalizedUsers = Array.isArray(usersData) ? usersData : [];
        const normalizedActivities = Array.isArray(activitiesData) ? activitiesData : [];
        const normalizedVotes = Array.isArray(votesData) ? votesData : [];

        setOverview({ ...EMPTY_OVERVIEW, ...(overviewData || {}) });
        setUsers(normalizedUsers);
        setActivities(normalizedActivities);
        setVotes(normalizedVotes);

        try {
          const trainerData = await adminApi.getTrainers();
          setTrainers(Array.isArray(trainerData) ? trainerData : []);
        } catch (trainerError) {
          const trainersFromUsers = normalizedUsers.filter((user) => normalizeRole(user.role) === 'trainer');
          setTrainers(trainersFromUsers);
        }

        setIsLiveMode(true);
      } catch (requestError) {
        setOverview(EMPTY_OVERVIEW);
        setUsers([]);
        setActivities([]);
        setVotes([]);
        setTrainers([]);
        setIsLiveMode(false);
        setError('Admin data kon niet geladen worden vanuit de backend.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminData();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => (
      String(user.name || '').toLowerCase().includes(query)
      || String(user.email || '').toLowerCase().includes(query)
      || String(user.role || '').toLowerCase().includes(query)
    ));
  }, [search, users]);

  const toggleActivityStatus = (activityId) => {
    const target = activities.find((activity) => activity.id === activityId);
    if (!target) return;

    const nextStatus = target.status === 'published' ? 'draft' : 'published';

    setActivities((previous) => previous.map((activity) => {
      if (activity.id !== activityId) return activity;
      return { ...activity, status: nextStatus };
    }));

    adminApi.updateActivityStatus({ activityId, status: nextStatus }).catch(() => {
      setActivities((previous) => previous.map((activity) => {
        if (activity.id !== activityId) return activity;
        return { ...activity, status: target.status };
      }));
      setError('Activiteit status kon niet worden opgeslagen.');
    });
  };

  const assignTrainer = (activityId, trainerId) => {
    const selectedTrainer = trainers.find((trainer) => String(getTrainerId(trainer)) === String(trainerId));
    const previousActivity = activities.find((activity) => activity.id === activityId);

    if (!selectedTrainer || !previousActivity) {
      setError('Geen geldige trainer geselecteerd voor deze activiteit.');
      return;
    }

    setActivities((previous) => previous.map((activity) => {
      if (activity.id !== activityId) return activity;
      return {
        ...activity,
        trainerId: getTrainerId(selectedTrainer),
        coach: getTrainerName(selectedTrainer),
      };
    }));

    adminApi.assignTrainerToActivity({
      activityId,
      trainerId: getTrainerId(selectedTrainer),
    }).catch(() => {
      setActivities((previous) => previous.map((activity) => {
        if (activity.id !== activityId) return activity;
        return previousActivity;
      }));
      setError('Trainer koppelen aan activiteit is mislukt op de server.');
    });
  };

  const updateUserField = (userId, field, value) => {
    const previousUser = users.find((user) => user.id === userId);
    if (!previousUser) return;

    setUsers((previous) => previous.map((user) => (
      user.id === userId ? { ...user, [field]: value } : user
    )));

    adminApi.updateUser({ userId, payload: { [field]: value } }).catch(() => {
      setUsers((previous) => previous.map((user) => (
        user.id === userId ? previousUser : user
      )));
      setError('Gebruikerswijziging kon niet opgeslagen worden op de server.');
    });
  };

  const resetUserMfa = (userId) => {
    adminApi.resetUserMfa({ userId }).catch(() => {
      setError('MFA reset voor gebruiker is mislukt op de server.');
    });
  };

  const deleteUser = (userId) => {
    const previousUsers = users;
    setUsers((previous) => previous.filter((user) => user.id !== userId));

    adminApi.deleteUser({ userId }).catch(() => {
      setUsers(previousUsers);
      setError('Gebruiker verwijderen is mislukt op de server.');
    });
  };

  const createUser = (event) => {
    event.preventDefault();

    try {
      // Sanitize name input
      const sanitizedName = sanitizeInput(newUserForm.name, 100);
      if (!sanitizedName) {
        setError('Voer een geldige naam in.');
        return;
      }

      // Sanitize and validate email
      const sanitizedEmail = newUserForm.email.trim().toLowerCase();
      if (!validateEmail(sanitizedEmail)) {
        setError('Voer een geldig e-mailadres in (max 254 karakters).');
        return;
      }

      // Validate role
      if (!['trainer', 'admin'].includes(newUserForm.role)) {
        setError('Nieuwe gebruikers kunnen alleen als trainer of admin worden aangemaakt.');
        return;
      }

      // Validate status
      if (!STATUS_OPTIONS.includes(newUserForm.status)) {
        setError('Ongeldige status geselecteerd.');
        return;
      }

      // Build payload with sanitized data
      const payload = {
        name: sanitizedName,
        email: sanitizedEmail,
        role: newUserForm.role,
        status: newUserForm.status,
      };

      // Handle optional temporary password
      if (newUserForm.temporaryPassword.trim()) {
        try {
          const sanitizedPassword = sanitizePassword(newUserForm.temporaryPassword);
          if (sanitizedPassword) {
            payload.temporaryPassword = sanitizedPassword;
          }
        } catch (passwordError) {
          setError(passwordError.message);
          return;
        }
      }

      // Send to API
      adminApi.createUser({ payload }).then((createdUser) => {
        setUsers((previous) => [createdUser, ...previous]);
        setNewUserForm({
          name: '',
          email: '',
          role: 'trainer',
          status: 'active',
          temporaryPassword: '',
        });
        setError('');
      }).catch(() => {
        setError('Nieuwe trainer of admin kon niet worden aangemaakt.');
      });
    } catch (error) {
      setError('Er is een fout opgetreden bij het valideren van de invoer.');
      console.error('Create user error:', error);
    }
  };

  return (
    <section className="admin-wrap">
      <header className="admin-header">
        <div>
          <h1>Admin Control Center</h1>
          <p>Beheer gebruikers, activiteiten en stemdata vanuit een centrale cockpit.</p>
          {error && <p className="admin-error" role="alert">{error}</p>}
        </div>

        <div className={`source-pill ${isLiveMode ? 'live' : 'offline'}`}>
          {isLiveMode ? 'Live data actief' : 'Backend niet bereikbaar'}
          <span>{API_BASE_URL}</span>
        </div>
      </header>

      <div className="admin-metrics">
        <article>
          <h2>Totaal gebruikers</h2>
          <strong>{overview.totalUsers}</strong>
        </article>
        <article>
          <h2>Actieve lessen</h2>
          <strong>{overview.activeLessons}</strong>
        </article>
        <article>
          <h2>Stemmen vandaag</h2>
          <strong>{overview.votesToday}</strong>
        </article>
        <article>
          <h2>MFA adoptie</h2>
          <strong>{overview.mfaEnabled}%</strong>
        </article>
      </div>

      <div className="admin-toolbar">
        <div className="tabs" role="tablist" aria-label="Admin secties">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'users'}
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Gebruikers
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'activities'}
            className={activeTab === 'activities' ? 'active' : ''}
            onClick={() => setActiveTab('activities')}
          >
            Activiteiten
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'votes'}
            className={activeTab === 'votes' ? 'active' : ''}
            onClick={() => setActiveTab('votes')}
          >
            Votes
          </button>
        </div>

        {activeTab === 'users' && (
          <input
            type="search"
            placeholder="Zoek op naam, email of rol"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Zoek gebruiker"
          />
        )}
      </div>

      {isLoading ? (
        <p className="loading-state">Data laden...</p>
      ) : (
        <div className="admin-content">
          {activeTab === 'users' && (
            <section className="admin-user-form-shell" aria-label="Nieuwe gebruiker aanmaken">
              <h2>Nieuwe trainer of admin</h2>
              <form className="admin-user-form" onSubmit={createUser}>
                <label htmlFor="newUserName">Naam</label>
                <input
                  id="newUserName"
                  type="text"
                  value={newUserForm.name}
                  onChange={(event) => setNewUserForm((previous) => ({ ...previous, name: event.target.value }))}
                  placeholder="Volledige naam"
                  required
                />

                <label htmlFor="newUserEmail">E-mail</label>
                <input
                  id="newUserEmail"
                  type="email"
                  value={newUserForm.email}
                  onChange={(event) => setNewUserForm((previous) => ({ ...previous, email: event.target.value }))}
                  placeholder="naam@sportportal.nl"
                  required
                />

                <label htmlFor="newUserRole">Rol</label>
                <select
                  id="newUserRole"
                  value={newUserForm.role}
                  onChange={(event) => setNewUserForm((previous) => ({ ...previous, role: event.target.value }))}
                >
                  <option value="trainer">trainer</option>
                  <option value="admin">admin</option>
                </select>

                <label htmlFor="newUserStatus">Status</label>
                <select
                  id="newUserStatus"
                  value={newUserForm.status}
                  onChange={(event) => setNewUserForm((previous) => ({ ...previous, status: event.target.value }))}
                >
                  {STATUS_OPTIONS.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>{statusOption}</option>
                  ))}
                </select>

                <label htmlFor="newUserPassword">Tijdelijk wachtwoord</label>
                <input
                  id="newUserPassword"
                  type="text"
                  value={newUserForm.temporaryPassword}
                  onChange={(event) => setNewUserForm((previous) => ({ ...previous, temporaryPassword: event.target.value }))}
                  placeholder="Laat leeg als backend invite genereert"
                />

                <button type="submit">Gebruiker aanmaken</button>
              </form>
            </section>
          )}

          {activeTab === 'users' && (
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Naam</th>
                    <th>Rol</th>
                    <th>MFA</th>
                    <th>Status</th>
                    <th>Beheer</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                      </td>
                      <td>{user.role}</td>
                      <td>{user.mfaEnabled ? 'Aan' : 'Uit'}</td>
                      <td>
                        <span className={`badge status-${user.status}`}>{user.status}</span>
                      </td>
                      <td>
                        <div className="user-actions">
                          <label htmlFor={`role-${user.id}`}>Rol</label>
                          <select
                            id={`role-${user.id}`}
                            value={normalizeRole(user.role)}
                            onChange={(event) => updateUserField(user.id, 'role', event.target.value)}
                          >
                            {ROLE_OPTIONS.map((roleOption) => (
                              <option key={roleOption} value={roleOption}>{roleOption}</option>
                            ))}
                          </select>

                          <label htmlFor={`status-${user.id}`}>Status</label>
                          <select
                            id={`status-${user.id}`}
                            value={String(user.status || 'active')}
                            onChange={(event) => updateUserField(user.id, 'status', event.target.value)}
                          >
                            {STATUS_OPTIONS.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>{statusOption}</option>
                            ))}
                          </select>

                          <div className="user-actions-row">
                            <button type="button" onClick={() => resetUserMfa(user.id)}>MFA reset</button>
                            <button type="button" className="danger" onClick={() => deleteUser(user.id)}>Verwijder</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="empty-cell">Geen gebruikers gevonden.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="cards-grid">
              {activities.length > 0 ? activities.map((activity) => {
                const currentTrainerId = String(activity.trainerId || activity.coachId || '');

                return (
                  <article key={activity.id} className="admin-card">
                    <h3>{activity.title}</h3>
                    <p>Trainer: {activity.coach || 'Nog niet gekoppeld'}</p>
                    <p>Bezetting: {activity.enrolled}/{activity.capacity}</p>
                    <span className={`badge status-${activity.status}`}>{activity.status}</span>
                    <button type="button" onClick={() => toggleActivityStatus(activity.id)}>
                      Zet op {activity.status === 'published' ? 'draft' : 'published'}
                    </button>

                    <div className="trainer-assignment">
                      <label htmlFor={`trainer-select-${activity.id}`}>Koppel trainer</label>
                      <select
                        id={`trainer-select-${activity.id}`}
                        value={currentTrainerId}
                        onChange={(event) => assignTrainer(activity.id, event.target.value)}
                      >
                        <option value="">Selecteer trainer</option>
                        {trainers.map((trainer) => (
                          <option key={getTrainerId(trainer)} value={getTrainerId(trainer)}>
                            {getTrainerName(trainer)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                );
              }) : <p className="empty-cell">Geen activiteiten beschikbaar.</p>}
            </div>
          )}

          {activeTab === 'votes' && (
            <div className="cards-grid">
              {votes.length > 0 ? votes.map((voteItem) => (
                <article key={voteItem.id} className="admin-card vote">
                  <h3>{voteItem.activity}</h3>
                  <div className="vote-number">{voteItem.votes}</div>
                  <p>Trend: {voteItem.trend}</p>
                </article>
              )) : <p className="empty-cell">Nog geen stemgegevens ontvangen.</p>}
            </div>
          )}
        </div>
      )}

      <footer className="admin-footer">
        <Link to="/dashboard">Terug naar dashboard</Link>
      </footer>
    </section>
  );
};

export default AdminPanel;
