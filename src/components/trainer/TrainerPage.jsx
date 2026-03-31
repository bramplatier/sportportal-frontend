import React, { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { trainerApi } from '../../services/apiClient';
import './TrainerPage.css';

const INITIAL_SESSIONS = [
  {
    id: 'tr-1',
    title: 'HIIT Fundamentals',
    date: 'Dinsdag 19:00',
    location: 'Zaal 2',
    participants: ['Noah', 'Mila', 'Bram', 'Lina'],
  },
  {
    id: 'tr-2',
    title: 'Padel Technique',
    date: 'Donderdag 18:30',
    location: 'Baan 3',
    participants: ['Tobias', 'Sara', 'Ruben'],
  },
];

const TrainerPage = () => {
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [selectedSessionId, setSelectedSessionId] = useState(INITIAL_SESSIONS[0].id);
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      setError('');

      try {
        const sessionsData = await trainerApi.getSessions();

        if (Array.isArray(sessionsData) && sessionsData.length > 0) {
          setSessions(sessionsData.map((session) => ({
            id: session.id,
            title: session.title,
            date: session.date,
            location: session.location,
            participants: Array.isArray(session.participants) ? session.participants : [],
          })));
          setSelectedSessionId(sessionsData[0].id);
        }

        setIsMockMode(false);
      } catch (requestError) {
        setSessions(INITIAL_SESSIONS);
        setSelectedSessionId(INITIAL_SESSIONS[0].id);
        setIsMockMode(true);
        setError('Trainerdata niet beschikbaar vanuit backend.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, []);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || sessions[0],
    [selectedSessionId, sessions],
  );

  const addSession = () => {
    const newSession = {
      id: `tr-${sessions.length + 1}`,
      title: `Nieuwe training ${sessions.length + 1}`,
      date: 'Vrijdag 17:30',
      location: 'Studio 1',
      participants: [],
    };

    setSessions((prev) => [...prev, newSession]);
    setSelectedSessionId(newSession.id);

    trainerApi.createSession({
      title: newSession.title,
      date: newSession.date,
      location: newSession.location,
    }).catch(() => {
      setError('Nieuwe training kon niet worden opgeslagen op backend.');
    });
  };

  return (
    <section className="trainer-wrap">
      <header className="trainer-header">
        <h1>Trainer Dashboard</h1>
        <p>Beheer trainingen, bekijk deelnemers en organiseer activiteiten.</p>
        {isMockMode && <p className="trainer-note">Mock modus actief voor trainerdata.</p>}
        {error && <p className="trainer-error" role="alert">{error}</p>}
      </header>

      <div className="trainer-grid">
        <aside className="trainer-card">
          <div className="title-row">
            <h2>Mijn trainingen</h2>
            <button type="button" onClick={addSession}>+ Training</button>
          </div>

          <div className="session-list">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={`session-item ${selectedSession?.id === session.id ? 'active' : ''}`}
                onClick={() => setSelectedSessionId(session.id)}
              >
                <strong>{session.title}</strong>
                <span>{session.date} • {session.location}</span>
              </button>
            ))}
          </div>
        </aside>

        <article className="trainer-card">
          <h2>Deelnemerslijst</h2>
          <p className="session-meta">
            {selectedSession ? `${selectedSession.title} • ${selectedSession.date}` : 'Geen training geselecteerd'}
          </p>

          {isLoading ? (
            <p className="empty">Deelnemers laden...</p>
          ) : selectedSession && selectedSession.participants.length > 0 ? (
            <ul className="participants">
              {selectedSession.participants.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : (
            <p className="empty">Nog geen deelnemers ingeschreven.</p>
          )}
        </article>
      </div>
    </section>
  );
};

export default TrainerPage;
