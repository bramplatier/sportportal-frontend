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
  description: poll?.description || '',
  closesAt: toLocalInputValue(poll?.closesAt || poll?.deadline || ''),
  isActive: Boolean(poll?.isActive || poll?.is_active || poll?.active),
  totalVotes: Number(poll?.totalVotes || 0),
});

const normalizeVoter = (entry) => ({
  id: entry?.id || entry?.userId || entry?.voterId || entry?.user_id || `${entry?.userName || 'voter'}-${Math.random()}`,
  userId: entry?.userId || entry?.voterId || entry?.user_id || entry?.id,
  name: entry?.userName || entry?.name || 'Anoniem',
  option: entry?.optionTitle || entry?.option || '-',
  optionId: entry?.optionId || null,
});

const TrainerPage = () => {
  usePageTitle('Trainer');
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [sessionForm, setSessionForm] = useState({ title: '', date: '', location: '' });

  const [polls, setPolls] = useState([]);
  const [selectedPollId, setSelectedPollId] = useState('');
  const [pollForm, setPollForm] = useState({ title: '', date: '' });
  const [voters, setVoters] = useState([]);
  const [showVoters, setShowVoters] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    if (selectedPoll) {
      setPollForm({ title: selectedPoll.title, date: selectedPoll.closesAt });
      setVoters([]);
      setShowVoters(false);
    }
  }, [selectedPollId, polls]);

  const confirm = (type, data) => setModal({ isOpen: true, type, data });
  const close = () => setModal({ isOpen: false, type: '', data: null });

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const executeAction = async () => {
    const { type, data } = modal;
    close();
    try {
      if (type === 'DELETE_SESSION') {
        await trainerApi.deleteSession({ sessionId: data.id });
        setSessions(prev => prev.filter(s => s.id !== data.id));
        showSuccess('Training verwijderd.');
      } else if (type === 'REMOVE_PARTICIPANT') {
        await trainerApi.removeParticipant({ sessionId: data.sessionId, participantName: data.name });
        setSessions(prev => prev.map(s => s.id === data.sessionId ? {...s, participants: s.participants.filter(p => p !== data.name)} : s));
        showSuccess('Deelnemer verwijderd.');
      } else if (type === 'DELETE_POLL') {
        await trainerApi.deletePoll({ pollId: data.id });
        setPolls(prev => prev.filter(p => p.id !== data.id));
        showSuccess('Poll verwijderd.');
      } else if (type === 'REMOVE_VOTE') {
        await trainerApi.deleteVote({ pollId: selectedPollId, userId: data.userId });
        setVoters(prev => prev.filter(v => v.id !== data.id));
        setPolls(prev => prev.map(p => p.id === selectedPollId ? {...p, totalVotes: Math.max(0, p.totalVotes - 1)} : p));
        showSuccess('Stem verwijderd.');
      }
    } catch (err) { setError('Actie mislukt.'); }
  };

  const saveSession = async (e) => {
    e.preventDefault();
    try {
      await trainerApi.updateSession({ sessionId: selectedSession.id, payload: sessionForm });
      setSessions(prev => prev.map(s => s.id === selectedSession.id ? {...s, ...sessionForm} : s));
      showSuccess('Wijzigingen opgeslagen.');
    } catch (err) { setError('Opslaan mislukt.'); }
  };

  const savePoll = async (e) => {
    e.preventDefault();
    try {
      await trainerApi.updatePoll({ pollId: selectedPoll.id, payload: { title: pollForm.title, closesAt: pollForm.date } });
      setPolls(prev => prev.map(p => p.id === selectedPoll.id ? {...p, title: pollForm.title, closesAt: pollForm.date} : p));
      showSuccess('Poll bijgewerkt.');
    } catch (err) { setError('Poll wijzigen mislukt.'); }
  };

  const loadVoters = async () => {
    if (showVoters) {
      setShowVoters(false);
      return;
    }
    try {
      const data = await trainerApi.getPollVoters({ pollId: selectedPoll.id });
      const entries = Array.isArray(data?.voters) ? data.voters : Array.isArray(data) ? data : [];
      setVoters(entries.map(normalizeVoter));
      setShowVoters(true);
    } catch (err) { setError('Stemmers laden mislukt.'); }
  };

  const createSession = async () => {
    try {
      const created = await trainerApi.createSession({ title: 'Nieuwe Training', date: new Date().toISOString(), location: 'Studio 1' });
      const norm = normalizeSession(created);
      setSessions(prev => [norm, ...prev]);
      setSelectedSessionId(norm.id);
      showSuccess('Nieuwe training aangemaakt.');
    } catch (err) { setError('Aanmaken mislukt.'); }
  };

  const createPoll = async () => {
    try {
      const created = await trainerApi.createPoll({ 
        title: 'Nieuwe Poll', 
        options: ['Optie 1', 'Optie 2'],
        closesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
      });
      const norm = normalizePoll(created);
      setPolls(prev => [norm, ...prev]);
      setSelectedPollId(norm.id);
      showSuccess('Nieuwe poll aangemaakt.');
    } catch (err) { setError('Aanmaken poll mislukt.'); }
  };

  const activatePoll = async () => {
    try {
      await trainerApi.setActivePoll({ pollId: selectedPoll.id });
      setPolls(prev => prev.map(p => ({...p, isActive: p.id === selectedPoll.id})));
      showSuccess('Poll geactiveerd.');
    } catch (err) { setError('Activeren mislukt.'); }
  };

  return (
    <section className="trainer-wrap">
      <header className="trainer-header">
        <h1>Trainer</h1>
        <p>Sessies & Polls</p>
        {error && <p className="trainer-error">{error}</p>}
        {success && <p className="alert alert-success" style={{margin: '1rem 0'}}>{success}</p>}
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
                <span className="participant-name">{p}</span>
                <button className="remove-btn" onClick={() => confirm('REMOVE_PARTICIPANT', {sessionId: selectedSession.id, name: p})}>&times;</button>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="trainer-voting-grid-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem', borderTop: '1px solid var(--color-border)', paddingTop: '2rem'}}>
        <h2 style={{fontSize: '1.5rem', color: 'var(--color-brand)', marginBottom: 0}}>📊 Poll Beheer</h2>
        <button className="btn btn-primary" onClick={createPoll}>+ Nieuw</button>
      </div>

      <article className="trainer-card poll-card-full" style={{marginTop: '1.5rem'}}>
        <div className="poll-picker-row" style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'flex-end'}}>
          <div className="form-field" style={{marginBottom: 0}}>
            <label>Selecteer Poll</label>
            <select className="select-styled" style={{width: '100%'}} value={selectedPollId} onChange={e => setSelectedPollId(e.target.value)}>
              {polls.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          {selectedPoll && <button type="button" className="btn btn-danger" onClick={() => confirm('DELETE_POLL', selectedPoll)}>Verwijder Poll</button>}
        </div>

        {selectedPoll ? (
          <form className="trainer-poll-edit-form" onSubmit={savePoll} style={{marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
            <div className="poll-settings">
              <div className="form-field">
                <label>Poll Titel</label>
                <input type="text" value={pollForm.title} onChange={e => setPollForm(p => ({...p, title: e.target.value}))} />
              </div>
              <div className="form-field">
                <label>Deadline</label>
                <input type="datetime-local" value={pollForm.date} onChange={e => setPollForm(p => ({...p, date: e.target.value}))} />
              </div>
              
              <div className="poll-status-info" style={{marginTop: '1.5rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)'}}>
                <p><strong>Status:</strong> {selectedPoll.isActive ? <span className="poll-active-badge">ACTIEF</span> : 'Inactief'}</p>
                <p style={{marginTop: '0.5rem'}}><strong>Stemmen:</strong> {selectedPoll.totalVotes}</p>
              </div>

              <div className="poll-actions" style={{marginTop: '1.5rem'}}>
                <button type="submit" className="btn btn-accent btn-full">Wijzigingen Opslaan</button>
                {!selectedPoll.isActive && <button type="button" className="btn btn-primary btn-full" onClick={activatePoll}>Activeer Nu</button>}
                <button type="button" className="btn btn-outline btn-full" onClick={loadVoters}>
                  {showVoters ? 'Verberg Stemmers' : 'Toon Huidige Stemmers'}
                </button>
              </div>
            </div>

            <div className="poll-voters-side">
              {showVoters ? (
                <div className="voters-list-area">
                  <h3 style={{fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-muted)'}}>Huidige Stemmers</h3>
                  <div className="voters-grid" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    {voters.length > 0 ? voters.map(v => (
                      <div key={v.id} className="voter-badge">
                        <div className="voter-info">
                          <strong>{v.name}</strong>
                          <span>{v.option}</span>
                        </div>
                        <button className="remove-btn" onClick={() => confirm('REMOVE_VOTE', v)} title="Verwijder stem">&times;</button>
                      </div>
                    )) : <p className="empty-text">Nog geen stemmen uitgebracht.</p>}
                  </div>
                </div>
              ) : (
                <div className="poll-placeholder-voters" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)'}}>
                  <p style={{color: 'var(--color-muted)', fontSize: '0.9rem'}}>Klik op 'Toon Stemmers' om de details te zien.</p>
                </div>
              )}
            </div>
          </form>
        ) : (
          <p className="empty-text" style={{marginTop: '1rem'}}>Geen poll geselecteerd of beschikbaar.</p>
        )}
      </article>

      <Modal isOpen={modal.isOpen} onClose={close} title="Zeker weten?" actions={<>
        <button className="btn btn-outline" onClick={close}>Nee</button>
        <button className="btn btn-danger" onClick={executeAction}>Ja, uitvoeren</button>
      </>}>
        <p>Deze actie kan niet ongedaan worden gemaakt.</p>
      </Modal>
    </section>
  );
};

export default TrainerPage;
