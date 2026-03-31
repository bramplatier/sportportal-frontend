import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, adminApi } from '../../services/apiClient';
import './AdminPanel.css';

const MOCK_OVERVIEW = {
  totalUsers: 148,
  activeLessons: 12,
  votesToday: 67,
  mfaEnabled: 83,
};

const MOCK_USERS = [
  { id: 'u-101', name: 'Noah van Dijk', email: 'noah@sportportal.nl', role: 'member', mfaEnabled: true, status: 'active' },
  { id: 'u-102', name: 'Mila Jansen', email: 'mila@sportportal.nl', role: 'coach', mfaEnabled: false, status: 'active' },
  { id: 'u-103', name: 'Bram Peters', email: 'bram@sportportal.nl', role: 'member', mfaEnabled: true, status: 'pending' },
  { id: 'u-104', name: 'Sara de Groot', email: 'sara@sportportal.nl', role: 'admin', mfaEnabled: true, status: 'active' },
];

const MOCK_ACTIVITIES = [
  { id: 'a-21', title: 'Neon Night Run', coach: 'Mila Jansen', capacity: 25, enrolled: 21, status: 'published' },
  { id: 'a-22', title: 'Power Hyrox Drill', coach: 'Mike Bos', capacity: 16, enrolled: 9, status: 'draft' },
  { id: 'a-23', title: 'Padel Clash Ladder', coach: 'Niek Vos', capacity: 20, enrolled: 20, status: 'published' },
];

const MOCK_VOTES = [
  { id: 'v-91', activity: 'Zaalvoetbal', votes: 39, trend: '+7%' },
  { id: 'v-92', activity: 'Padel Mix', votes: 25, trend: '+3%' },
  { id: 'v-93', activity: 'Bootcamp Outdoor', votes: 17, trend: '-2%' },
];

const AdminPanel = () => {
  const [overview, setOverview] = useState(MOCK_OVERVIEW);
  const [users, setUsers] = useState(MOCK_USERS);
  const [activities, setActivities] = useState(MOCK_ACTIVITIES);
  const [votes, setVotes] = useState(MOCK_VOTES);
  const [activeTab, setActiveTab] = useState('users');
  const [search, setSearch] = useState('');
  const [isMockMode, setIsMockMode] = useState(true);
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

        setOverview(overviewData ?? MOCK_OVERVIEW);
        setUsers(usersData ?? MOCK_USERS);
        setActivities(activitiesData ?? MOCK_ACTIVITIES);
        setVotes(votesData ?? MOCK_VOTES);
        setIsMockMode(false);
      } catch (error) {
        setOverview(MOCK_OVERVIEW);
        setUsers(MOCK_USERS);
        setActivities(MOCK_ACTIVITIES);
        setVotes(MOCK_VOTES);
        setIsMockMode(true);
        setError('Live admin data is niet bereikbaar. Je ziet mock data.');
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
      user.name.toLowerCase().includes(query)
      || user.email.toLowerCase().includes(query)
      || user.role.toLowerCase().includes(query)
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

    adminApi.updateActivityStatus({
      activityId,
      status: nextStatus,
    }).catch(() => {
      setActivities((previous) => previous.map((activity) => {
        if (activity.id !== activityId) return activity;
        return { ...activity, status: target.status };
      }));
      setError('Activiteit status kon niet worden opgeslagen.');
    });
  };

  const approvePendingUser = (userId) => {
    setUsers((previous) => previous.map((user) => (
      user.id === userId ? { ...user, status: 'active' } : user
    )));

    adminApi.approveUser({ userId }).catch(() => {
      setUsers((previous) => previous.map((user) => (
        user.id === userId ? { ...user, status: 'pending' } : user
      )));
      setError('Gebruiker kon niet worden goedgekeurd op de server.');
    });
  };

  return (
    <section className="admin-wrap">
      <header className="admin-header">
        <div>
          <h1>Admin Control Center</h1>
          <p>Beheer gebruikers, activiteiten en live stemdata vanuit een centrale cockpit.</p>
          {error && <p className="admin-error" role="alert">{error}</p>}
        </div>

        <div className={`source-pill ${isMockMode ? 'mock' : 'live'}`}>
          {isMockMode ? 'Mock data actief' : 'Live data actief'}
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
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Naam</th>
                    <th>Rol</th>
                    <th>MFA</th>
                    <th>Status</th>
                    <th>Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
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
                        {user.status === 'pending' ? (
                          <button type="button" onClick={() => approvePendingUser(user.id)}>Approve</button>
                        ) : (
                          <span className="muted">Geen actie</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="cards-grid">
              {activities.map((activity) => (
                <article key={activity.id} className="admin-card">
                  <h3>{activity.title}</h3>
                  <p>Coach: {activity.coach}</p>
                  <p>Bezetting: {activity.enrolled}/{activity.capacity}</p>
                  <span className={`badge status-${activity.status}`}>{activity.status}</span>
                  <button type="button" onClick={() => toggleActivityStatus(activity.id)}>
                    Zet op {activity.status === 'published' ? 'draft' : 'published'}
                  </button>
                </article>
              ))}
            </div>
          )}

          {activeTab === 'votes' && (
            <div className="cards-grid">
              {votes.map((voteItem) => (
                <article key={voteItem.id} className="admin-card vote">
                  <h3>{voteItem.activity}</h3>
                  <div className="vote-number">{voteItem.votes}</div>
                  <p>Trend: {voteItem.trend}</p>
                </article>
              ))}
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
