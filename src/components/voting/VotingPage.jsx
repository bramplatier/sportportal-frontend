import React, { useEffect, useMemo, useState } from 'react';
import { votingApi } from '../../services/apiClient';
import './VotingPage.css';

const DEFAULT_DEADLINE = new Date(Date.now() + 1000 * 60 * 60 * 5);

const OPTIONS = [
  {
    id: 'zaalvoetbal',
    title: 'Zaalvoetbal',
    location: 'Sporthal Centrum',
    time: 'Woensdag 20:00',
    players: '10-14 spelers',
  },
  {
    id: 'padel',
    title: 'Padel Mix',
    location: 'Racketpark Oost',
    time: 'Donderdag 19:30',
    players: '4-8 spelers',
  },
  {
    id: 'bootcamp',
    title: 'Bootcamp Outdoor',
    location: 'Stadspark Noord',
    time: 'Vrijdag 18:45',
    players: '12-20 spelers',
  },
];

const INITIAL_VOTES = {
  zaalvoetbal: 4,
  padel: 3,
  bootcamp: 2,
};

const VotingPage = () => {
  const [options, setOptions] = useState(OPTIONS);
  const [votes, setVotes] = useState(INITIAL_VOTES);
  const [userVote, setUserVote] = useState('');
  const [deadline, setDeadline] = useState(DEFAULT_DEADLINE);
  const [now, setNow] = useState(() => Date.now());
  const [isMockMode, setIsMockMode] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadVoting = async () => {
      setError('');

      try {
        const overview = await votingApi.getOverview();

        if (Array.isArray(overview?.options) && overview.options.length > 0) {
          setOptions(overview.options.map((option) => ({
            id: option.id,
            title: option.title,
            location: option.location,
            time: option.time,
            players: option.players,
          })));
        }

        if (overview?.votes && typeof overview.votes === 'object') {
          setVotes(overview.votes);
        }

        if (overview?.deadline) {
          setDeadline(new Date(overview.deadline));
        }

        if (overview?.userVote) {
          setUserVote(overview.userVote);
        }

        setIsMockMode(false);
      } catch (requestError) {
        setOptions(OPTIONS);
        setVotes(INITIAL_VOTES);
        setDeadline(DEFAULT_DEADLINE);
        setIsMockMode(true);
        setError('Live votingdata niet beschikbaar. Mock data actief.');
      }
    };

    loadVoting();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const isClosed = now >= deadline.getTime();
  const msLeft = Math.max(0, deadline.getTime() - now);
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minutesLeft = Math.floor((msLeft % 3600000) / 60000);

  const totalVotes = useMemo(
    () => Object.values(votes).reduce((sum, amount) => sum + amount, 0),
    [votes]
  );

  const winnerId = useMemo(() => {
    const entries = Object.entries(votes);
    return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [votes]);

  const handleVote = (optionId) => {
    if (isClosed) return;
    setError('');

    const previousVote = userVote;

    setVotes((previous) => {
      const next = { ...previous };

      if (previousVote) {
        next[previousVote] = Math.max(0, next[previousVote] - 1);
      }

      next[optionId] = (next[optionId] || 0) + 1;
      return next;
    });

    setUserVote(optionId);

    votingApi.submitVote({ optionId }).catch(() => {
      setVotes((previous) => {
        const next = { ...previous };

        next[optionId] = Math.max(0, next[optionId] - 1);
        if (previousVote) {
          next[previousVote] += 1;
        }

        return next;
      });

      setUserVote(previousVote);
      setError('Je stem kon niet opgeslagen worden op de server.');
    });
  };

  return (
    <main className="vote-wrap">
      <header className="vote-header">
        <h1>Stem op de activiteit</h1>
        <p aria-live="polite">
          {isClosed
            ? 'Stemming gesloten. Winnaar wordt direct getoond.'
            : `Deadline over ${hoursLeft}u ${minutesLeft}m`}
        </p>
        {isMockMode && <p className="vote-note">Mock modus actief voor voting data.</p>}
        {error && <p className="vote-error" role="alert">{error}</p>}
      </header>

      {isClosed && (
        <div className="winner-box" role="status" aria-live="polite">
          Winnaar: {options.find((option) => option.id === winnerId)?.title}
        </div>
      )}

      <section className="vote-list">
        {options.map((option) => {
          const amount = votes[option.id] || 0;
          const percentage = totalVotes ? Math.round((amount / totalVotes) * 100) : 0;
          const selected = userVote === option.id;

          return (
            <article key={option.id} className={`vote-card ${selected ? 'selected' : ''}`}>
              <div>
                <h2>{option.title}</h2>
                <p>{option.location} | {option.time} | {option.players}</p>
              </div>

              <button
                type="button"
                className="vote-button"
                onClick={() => handleVote(option.id)}
                disabled={isClosed}
              >
                {selected ? 'Jouw stem' : 'Stem'}
              </button>

              {(userVote || isClosed) && (
                <div className="result-row" aria-label={`Resultaat ${option.title}: ${percentage}%`}>
                  <div className="result-bar" style={{ width: `${percentage}%` }} />
                  <span>{percentage}% ({amount})</span>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
};

export default VotingPage;
