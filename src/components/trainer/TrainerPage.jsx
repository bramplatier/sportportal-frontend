import React, { useMemo, useState, useEffect } from 'react';
import { trainerApi } from '../../services/apiClient';
import { usePageTitle } from '../../hooks/usePageTitle';
import Modal from '../ui/Modal';
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
  trainerName: session?.trainerName || 'Onbekend',
  participants: Array.isArray(session?.participants) ? session.participants : [],
});

const normalizePoll = (poll) => ({
  id: poll?.id,
  title: poll?.title || 'Onbekende poll',
  isActive: Boolean(poll?.isActive || poll?.is_active || poll?.active),
  totalVotes: Number(poll?.totalVotes || 0),
});

const TrainerPage = () => {
  usePageTitle('Trainer');
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [sessionForm, setSessionForm] = useState({ title: '', date: '', location: '' });

  const [polls, setPolls] = useState([]);
  const [selectedPollId, setSelectedPollId] = useState('');
  const [pollForm, setPollForm] = useState({ title: '', description: '', closesAt: '', optionsText: '' });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ isOpen: false, type: '', data: null });

  useEffect(() => {
    const load = async () => {
      try {
        const [sData, pData] = await Promise.all([trainerApi.getSessions(), trainerApi.getPolls()]);
        const sNormalized = Array.isArray(sData) ? sData.map(normalizeSession) : [];
        const pNormalized = Array.isArray(pData) ? pData.map(normalizePoll) : [];
        setSessions(sNormalized);
        setPolls(pNormalized);
        if (sNormalized.length > 0) setSelectedSessionId(sNormalized[0].id);
        if (pNormalized.length > 0) setSelectedPollId(pNormalized[0].id);
      } catch (err) { setError('Data laden mislukt.'); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  const selectedSession = useMemo(() => sessions.find(s => s.id === selectedSessionId), [selectedSessionId, sessions]);
  const selectedPoll = useMemo(() => polls.find(p => p.id === selectedPollId), [selectedPollId, polls]);

  useEffect(() => {
    if (selectedSession) {
      setSessionForm({ title: selectedSession.title, date: selectedSession.date, location: selectedSession.location });
    }
  }, [selectedSession]);

  const confirm = (type, data) => setModal({ isOpen: true, type, data });
  const close = () => setModal({ isOpen: false, type: '', data: null });

  const executeAction = async () => {
    const { type, data } = modal;
    close();
    try {
      if (type === 'DELETE_SESSION') {
        await trainerApi.deleteSession({ sessionId: data.id });
        setSessions(prev => prev.filter(s => s.id !== data.id));
      } else if (type === 'REMOVE_PARTICIPANT') {
        await trainerApi.removeParticipant({ sessionId: data.sessionId, participantName: data.name });
        setSessions(prev => prev.map(s => s.id === data.sessionId ? {...s, participants: s.participants.filter(p => p !== data.name)} : s));
      } else if (type === 'DELETE_POLL') {
        await trainerApi.deletePoll({ pollId: data.id });
        setPolls(prev => prev.filter(p => p.id !== data.id));
      }
    } catch (err) { setError('Actie mislukt.'); }
  };

  const saveSession = async (e) => {
    e.preventDefault();
    try {
      await trainerApi.updateSession({ sessionId: selectedSession.id, payload: sessionForm });
      setSessions(prev => prev.map(s => s.id === selectedSession.id ? {...s, ...sessionForm} : s));
    } catch (err) { setError('Opslaan mislukt.'); }
  };

  const createSession = async () => {
    try {
      const created = await trainerApi.createSession({ title: 'Nieuwe Training', date: new Date().toISOString(), location: 'Studio 1' });
      const norm = normalizeSession(created);
      setSessions(prev => [norm, ...prev]);
      setSelectedSessionId(norm.id);
    } catch (err) { setError('Aanmaken mislukt.'); }
  };

  const activatePoll = async () => {
    try {
      await trainerApi.setActivePoll({ pollId: selectedPoll.id });
      setPolls(prev => prev.map(p => ({...p, isActive: p.id === selectedPoll.id})));
    } catch (err) { setError('Activeren mislukt.'); }
  };

  return (
    <section className="trainer-wrap">
      <header className="trainer-header">
        <h1>Trainer</h1>
        <p>Sessies & Polls</p>
        {error && <p className="trainer-error">{error}</p>}
      </header>

      <div className="trainer-grid">
        <aside className="trainer-card">
          <div className="title-row">
            <h2>Trainingen</h2>
            <button className="btn btn-primary" onClick={createSession}>+ Nieuw</button>
          </div>
          <div className="session-list">
            {sessions.map(s => (
              <button key={s.id} className={`session-item ${selectedSessionId === s.id ? 'active' : ''}`} onClick={() => setSelectedSessionId(s.id)}>
                <strong>{s.title}</strong>
                <span>{s.date.replace('T', ' ')} • {s.location}</span>
              </button>
            ))}
          </div>
        </aside>

        <article className="trainer-card">
          <div className="title-row">
            <h2>Beheer</h2>
            {selectedSession && <button className="btn btn-danger" onClick={() => confirm('DELETE_SESSION', selectedSession)}>Verwijder</button>}
          </div>
          {selectedSession && (
            <form className="trainer-session-form" onSubmit={saveSession}>
              <label>Titel</label><input type="text" value={sessionForm.title} onChange={e => setSessionForm(p => ({...p, title: e.target.value}))} />
              <label>Datum</label><input type="datetime-local" value={sessionForm.date} onChange={e => setSessionForm(p => ({...p, date: e.target.value}))} />
              <label>Locatie</label><input type="text" value={sessionForm.location} onChange={e => setSessionForm(p => ({...p, location: e.target.value}))} />
              <button type="submit" className="btn btn-accent">Opslaan</button>
            </form>
          )}

          <h3 className="participants-title">Deelnemers ({selectedSession?.participants.length || 0})</h3>
          <ul className="participants">
            {selectedSession?.participants.map(p => (
              <li key={p} className="participant-item">
                {p} <button className="remove-btn" onClick={() => confirm('REMOVE_PARTICIPANT', {sessionId: selectedSession.id, name: p})}>&times;</button>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <section className="trainer-voting-grid">
        <article className="trainer-card">
          <h2>Poll Beheer</h2>
          <div className="poll-picker">
            <select value={selectedPollId} onChange={e => setSelectedPollId(e.target.value)}>
              {polls.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          {selectedPoll && (
            <div className="poll-summary">
              <strong>{selectedPoll.title} {selectedPoll.isActive && <span className="poll-active-badge">ACTIEF</span>}</strong>
              <p>Stemmen: {selectedPoll.totalVotes}</p>
              <div className="poll-actions">
                <button className="btn btn-primary" onClick={activatePoll} disabled={selectedPoll.isActive}>Activeer</button>
                <button className="btn btn-outline" onClick={() => confirm('DELETE_POLL', selectedPoll)}>Verwijder</button>
              </div>
            </div>
          )}
        </article>
      </section>

      <Modal isOpen={modal.isOpen} onClose={close} title="Zeker weten?" actions={<>
        <button className="btn btn-outline" onClick={close}>Nee</button>
        <button className="btn btn-danger" onClick={executeAction}>Ja, uitvoeren</button>
      </>}>
        <p>Weet je zeker dat je deze actie wilt uitvoeren? Dit kan niet ongedaan worden gemaakt.</p>
      </Modal>
    </section>
  );
};

export default TrainerPage;
