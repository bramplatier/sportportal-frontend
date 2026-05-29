import React, { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { trainerApi } from '../../services/apiClient';
import { usePageTitle } from '../../hooks/usePageTitle';
import './TrainerPage.css';

const toLocalInputValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16);
};

const normalizeSession = (session) => ({
  id: session?.id,
  title: session?.title || 'Onbekende training',
  date: toLocalInputValue(session?.date || session?.dateTime || session?.datetime || session?.sessionDate || session?.session_date || ''),
  time: session?.time || null,
  location: session?.location || '',
  trainerId: session?.trainerId || session?.trainer_id || null,
  trainerName: session?.trainerName || session?.trainer_name || session?.trainer || 'Onbekend',
  participants: Array.isArray(session?.participants) ? session.participants : [],
});

const normalizePoll = (poll) => ({
  id: poll?.id,
  title: poll?.title || 'Onbekende poll',
  description: poll?.description || '',
  closesAt: toLocalInputValue(poll?.closesAt || poll?.deadline || ''),
  options: Array.isArray(poll?.options) ? poll.options : [],
  totalVotes: Number(poll?.totalVotes || poll?.total_votes || 0),
  isActive: Boolean(poll?.isActive || poll?.is_active || poll?.active),
});

const normalizeVoter = (entry) => ({
  id: entry?.id || `${entry?.userName || entry?.name || 'stemmer'}-${entry?.votedAt || entry?.voted_at || ''}`,
  name: entry?.userName || entry?.name || entry?.fullName || 'Onbekende stemmer',
  option: entry?.optionTitle || entry?.option || entry?.optionId || '-',
  votedAt: entry?.votedAt || entry?.voted_at || '',
});

const TrainerPage = () => {
  usePageTitle('Trainer');
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [sessionForm, setSessionForm] = useState({ title: '', date: '', location: '' });

  const [polls, setPolls] = useState([]);
  const [selectedPollId, setSelectedPollId] = useState('');
  const [pollVoters, setPollVoters] = useState([]);
  const [pollForm, setPollForm] = useState({
    title: '',
    description: '',
    closesAt: '',
    optionsText: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isSavingPoll, setIsSavingPoll] = useState(false);
  const [isDeletingPoll, setIsDeletingPoll] = useState(false);
  const [isActivatingPoll, setIsActivatingPoll] = useState(false);
  const [isLoadingVoters, setIsLoadingVoters] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTrainerData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [sessionsData, pollsData] = await Promise.all([
          trainerApi.getSessions(),
          trainerApi.getPolls(),
        ]);

        const normalizedSessions = Array.isArray(sessionsData)
          ? sessionsData.map(normalizeSession).filter((session) => session.id)
          : [];
        const normalizedPolls = Array.isArray(pollsData)
          ? pollsData.map(normalizePoll).filter((poll) => poll.id)
          : [];

        setSessions(normalizedSessions);
        setPolls(normalizedPolls);

        if (normalizedSessions.length > 0) {
          setSelectedSessionId(normalizedSessions[0].id);
          setSessionForm({
            title: normalizedSessions[0].title || '',
            date: normalizedSessions[0].date || '',
            location: normalizedSessions[0].location || '',
          });
        } else {
          setSelectedSessionId('');
          setSessionForm({ title: '', date: '', location: '' });
        }

        if (normalizedPolls.length > 0) {
          setSelectedPollId(normalizedPolls[0].id);
        } else {
          setSelectedPollId('');
          setPollVoters([]);
        }

        setIsLiveMode(true);
      } catch (requestError) {
        setSessions([]);
        setPolls([]);
        setSelectedSessionId('');
        setSelectedPollId('');
        setSessionForm({ title: '', date: '', location: '' });
        setPollVoters([]);
        setIsLiveMode(false);
        setError('Trainerdata niet beschikbaar vanuit backend.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTrainerData();
  }, []);

  useEffect(() => {
    const selectedPoll = polls.find((poll) => poll.id === selectedPollId);
    if (!selectedPoll) {
      setPollVoters([]);
      return;
    }

    setIsLoadingVoters(true);
    trainerApi.getPollVoters({ pollId: selectedPoll.id }).then((response) => {
      const entries = Array.isArray(response?.voters)
        ? response.voters
        : Array.isArray(response)
          ? response
          : [];

      setPollVoters(entries.map(normalizeVoter));
    }).catch(() => {
      setPollVoters([]);
      setError('Kon stemmerslijst voor de gekozen poll niet laden.');
    }).finally(() => {
      setIsLoadingVoters(false);
    });
  }, [selectedPollId, polls]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || sessions[0],
    [selectedSessionId, sessions],
  );

  const selectedPoll = useMemo(
    () => polls.find((poll) => poll.id === selectedPollId) || polls[0],
    [selectedPollId, polls],
  );

  useEffect(() => {
    if (!selectedSession) return;

    setSessionForm({
      title: selectedSession.title || '',
      date: selectedSession.date || '',
      location: selectedSession.location || '',
    });
  }, [selectedSession?.id]);

  const addSession = async () => {
    setError('');
    setIsSavingSession(true);

    try {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const isoDate = nextHour.toISOString();

      const created = await trainerApi.createSession({
        title: 'Nieuwe training',
        date: isoDate,
        location: 'Studio 1',
      });

      const normalizedCreated = normalizeSession(created || {});
      if (!normalizedCreated.id) {
        throw new Error('Backend response mist session id.');
      }

      setSessions((prev) => [normalizedCreated, ...prev]);
      setSelectedSessionId(normalizedCreated.id);
      setSessionForm({
        title: normalizedCreated.title,
        date: normalizedCreated.date,
        location: normalizedCreated.location,
      });
    } catch (requestError) {
      setError('Nieuwe training kon niet worden opgeslagen op backend.');
    } finally {
      setIsSavingSession(false);
    }
  };

  const saveSessionDetails = (event) => {
    event.preventDefault();

    if (!selectedSession) {
      setError('Selecteer eerst een training om aan te passen.');
      return;
    }

    if (!sessionForm.title || !sessionForm.date || !sessionForm.location) {
      setError('Vul titel, datum/tijd en locatie in.');
      return;
    }

    const previousSession = selectedSession;

    // Convert datetime-local to ISO-8601 if it's in datetime-local format
    let isoDate = sessionForm.date;
    if (sessionForm.date && !sessionForm.date.endsWith('Z')) {
      // If the date is in datetime-local format (YYYY-MM-DDTHH:mm), convert it to ISO-8601
      const dateObj = new Date(sessionForm.date);
      if (!isNaN(dateObj.getTime())) {
        isoDate = dateObj.toISOString();
      }
    }

    setSessions((prev) => prev.map((session) => (
      session.id === selectedSession.id
        ? { ...session, title: sessionForm.title, date: sessionForm.date, location: sessionForm.location }
        : session
    )));

    trainerApi.updateSession({
      sessionId: selectedSession.id,
      payload: {
        title: sessionForm.title,
        date: isoDate,
        location: sessionForm.location,
      },
    }).catch(() => {
      setSessions((prev) => prev.map((session) => (
        session.id === previousSession.id ? previousSession : session
      )));
      setError('Training details konden niet opgeslagen worden op backend.');
    });
  };

  const createPoll = (event) => {
    event.preventDefault();
    setError('');

    const optionTitles = pollForm.optionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!pollForm.title.trim() || optionTitles.length < 2) {
      setError('Vul polltitel in en minimaal 2 opties (1 per regel).');
      return;
    }

    let isoClosesAt = pollForm.closesAt || null;
    if (isoClosesAt && !isoClosesAt.endsWith('Z')) {
      const dateObj = new Date(isoClosesAt);
      if (!isNaN(dateObj.getTime())) {
        isoClosesAt = dateObj.toISOString();
      }
    }

    setIsSavingPoll(true);
    trainerApi.createPoll({
      payload: {
        title: pollForm.title.trim(),
        description: pollForm.description.trim(),
        closesAt: isoClosesAt,
        options: optionTitles,
      },
    }).then((createdPoll) => {
      const normalizedCreatedPoll = normalizePoll(createdPoll || {});
      if (!normalizedCreatedPoll.id) {
        throw new Error('Backend response mist poll id.');
      }

      setPolls((prev) => [normalizedCreatedPoll, ...prev]);
      setSelectedPollId(normalizedCreatedPoll.id);
      setPollForm({ title: '', description: '', closesAt: '', optionsText: '' });
    }).catch(() => {
      setError('Nieuwe poll kon niet aangemaakt worden op backend.');
    }).finally(() => {
      setIsSavingPoll(false);
    });
  };

  const deleteSelectedPoll = () => {
    if (!selectedPoll) {
      setError('Selecteer eerst een poll om te verwijderen.');
      return;
    }

    const isConfirmed = window.confirm(`Weet je zeker dat je de poll "${selectedPoll.title}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`);
    if (!isConfirmed) {
      return;
    }

    setError('');
    setIsDeletingPoll(true);

    trainerApi.deletePoll({ pollId: selectedPoll.id }).then(() => {
      setPolls((prev) => {
        const nextPolls = prev.filter((poll) => poll.id !== selectedPoll.id);
        setSelectedPollId(nextPolls[0]?.id || '');
        return nextPolls;
      });
      setPollVoters([]);
    }).catch(() => {
      setError('Poll verwijderen is mislukt op backend.');
    }).finally(() => {
      setIsDeletingPoll(false);
    });
  };

  const activateSelectedPoll = () => {
    if (!selectedPoll) {
      setError('Selecteer eerst een poll om actief te zetten voor de stempagina.');
      return;
    }

    setError('');
    setIsActivatingPoll(true);

    trainerApi.setActivePoll({ pollId: selectedPoll.id }).then(() => {
      setPolls((prev) => prev.map((poll) => ({
        ...poll,
        isActive: poll.id === selectedPoll.id,
      })));
    }).catch(() => {
      setError('Actieve stempoll instellen is mislukt op backend.');
    }).finally(() => {
      setIsActivatingPoll(false);
    });
  };

  const removeParticipant = async (sessionId, participantName) => {
    if (!window.confirm(`Weet je zeker dat je ${participantName} wilt verwijderen uit deze training?`)) return;

    try {
      await trainerApi.removeParticipant({ sessionId, participantName });
      setSessions((prev) => prev.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          participants: s.participants.filter(p => p !== participantName)
        };
      }));
    } catch (err) {
      setError('Deelnemer kon niet worden verwijderd.');
    }
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm('Weet je zeker dat je deze training volledig wilt verwijderen?')) return;

    try {
      await trainerApi.deleteSession({ sessionId });
      setSessions((prev) => prev.filter(s => s.id !== sessionId));
      if (selectedSessionId === sessionId) {
        setSelectedSessionId('');
      }
    } catch (err) {
      setError('Training kon niet worden verwijderd.');
    }
  };

  return (
    <section className="trainer-wrap">
      <header className="trainer-header">
        <h1>Trainer Dashboard</h1>
        <p>Beheer trainingen, bekijk deelnemers en beheer voting polls.</p>
        {!isLiveMode && !isLoading && <p className="trainer-error">Live backend data is momenteel niet bereikbaar.</p>}
        {error && <p className="trainer-error" role="alert">{error}</p>}
      </header>

      <div className="trainer-grid">
        <aside className="trainer-card">
          <div className="title-row">
            <h2>Mijn trainingen</h2>
            <button type="button" className="btn btn-primary" disabled={isSavingSession} onClick={addSession}>
              {isSavingSession ? 'Opslaan...' : '+ Nieuw'}
            </button>
          </div>

          <div className="session-list">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={`session-item ${selectedSession?.id === session.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedSessionId(session.id);
                  setError('');
                }}
              >
                <strong>{session.title}</strong>
                <span>{session.time || session.date || 'Tijd onbekend'}</span>
                <span>📍 {session.location || 'Locatie onbekend'}</span>
              </button>
            ))}
          </div>
        </aside>

        <article className="trainer-card">
          <div className="title-row">
            <h2>Details & Deelnemers</h2>
            {selectedSession && (
              <button type="button" className="btn btn-danger" onClick={() => deleteSession(selectedSession.id)}>
                Verwijder Training
              </button>
            )}
          </div>

          {selectedSession && (
            <form className="trainer-session-form" onSubmit={saveSessionDetails}>
              <div>
                <label htmlFor="sessionTitle">Titel</label>
                <input
                  id="sessionTitle"
                  type="text"
                  value={sessionForm.title}
                  onChange={(event) => setSessionForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </div>

              <div>
                <label htmlFor="sessionDate">Datum / Tijd</label>
                <input
                  id="sessionDate"
                  type="datetime-local"
                  value={sessionForm.date}
                  onChange={(event) => setSessionForm((prev) => ({ ...prev, date: event.target.value }))}
                  required
                />
              </div>

              <div>
                <label htmlFor="sessionLocation">Locatie</label>
                <input
                  id="sessionLocation"
                  type="text"
                  value={sessionForm.location}
                  onChange={(event) => setSessionForm((prev) => ({ ...prev, location: event.target.value }))}
                  required
                />
              </div>

              <button type="submit" className="btn btn-accent">Wijzigingen Opslaan</button>
            </form>
          )}

          <h3 className="participants-title">Deelnemers ({selectedSession?.participants.length || 0})</h3>

          {isLoading ? (
            <p className="empty">Deelnemers laden...</p>
          ) : selectedSession && selectedSession.participants.length > 0 ? (
            <ul className="participants">
              {selectedSession.participants.map((name) => (
                <li key={name} className="participant-item">
                  <strong>{name}</strong>
                  <button 
                    className="remove-btn" 
                    onClick={() => removeParticipant(selectedSession.id, name)}
                    title="Verwijder uit training"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Nog geen deelnemers ingeschreven.</p>
          )}
        </article>
      </div>

      <section className="trainer-voting-grid">
        <article className="trainer-card">
          <h2>Poll Aanmaken</h2>
          <form className="trainer-session-form" onSubmit={createPoll}>
            <div>
              <label htmlFor="pollTitle">Titel</label>
              <input
                id="pollTitle"
                type="text"
                value={pollForm.title}
                onChange={(event) => setPollForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </div>

            <div>
              <label htmlFor="pollClosesAt">Sluit op</label>
              <input
                id="pollClosesAt"
                type="datetime-local"
                value={pollForm.closesAt}
                onChange={(event) => setPollForm((prev) => ({ ...prev, closesAt: event.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="pollOptions">Opties (1 per regel)</label>
              <textarea
                id="pollOptions"
                value={pollForm.optionsText}
                onChange={(event) => setPollForm((prev) => ({ ...prev, optionsText: event.target.value }))}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSavingPoll}>
              {isSavingPoll ? 'Aanmaken...' : 'Poll aanmaken'}
            </button>
          </form>
        </article>

        <article className="trainer-card">
          <h2>Poll Beheer</h2>

          <div className="poll-picker">
            <label htmlFor="pollSelect">Kies poll</label>
            <select
              id="pollSelect"
              value={selectedPollId}
              onChange={(event) => setSelectedPollId(event.target.value)}
            >
              <option value="">Selecteer poll</option>
              {polls.map((poll) => (
                <option key={poll.id} value={poll.id}>{poll.title}</option>
              ))}
            </select>
          </div>

          {selectedPoll && (
            <div className="poll-summary">
              <p>
                <strong>{selectedPoll.title}</strong>
                {selectedPoll.isActive && <span className="poll-active-badge">ACTIEF</span>}
              </p>
              <div className="poll-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isActivatingPoll || selectedPoll.isActive}
                  onClick={activateSelectedPoll}
                >
                  {selectedPoll.isActive ? 'Actief' : 'Activeer'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={isDeletingPoll}
                  onClick={deleteSelectedPoll}
                >
                  Verwijder
                </button>
              </div>
            </div>
          )}

          {isLoadingVoters ? (
            <p className="empty">Stemmers laden...</p>
          ) : pollVoters.length > 0 ? (
            <ul className="participants">
              {pollVoters.map((voter) => (
                <li key={voter.id} className="participant-item">
                  <strong>{voter.name}</strong>
                  <span>{voter.option}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Nog geen stemmers.</p>
          )}
        </article>
      </section>
    </section>
  );
};

export default TrainerPage;
