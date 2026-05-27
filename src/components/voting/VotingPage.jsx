import React, { useEffect, useMemo, useState } from 'react';
import { votingApi } from '../../services/apiClient';
import { usePageTitle } from '../../hooks/usePageTitle';
import './VotingPage.css';

const GENERIC_VOTING_ERROR = 'Er is iets misgegaan. Neem contact op met de systeembeheerder.';

const normalizeOption = (option) => ({
  id: option?.id,
  title: option?.title || option?.name || 'Onbekende optie',
  location: option?.location || '-',
  time: option?.time || '-',
  players: option?.players || '-',
});

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeOverview = (overview) => {
  if (!isPlainObject(overview)) {
    throw new Error('Voting overview payload is ongeldig.');
  }

  const rawOptions = Array.isArray(overview.options) ? overview.options : null;
  const rawVotes = isPlainObject(overview.votes) ? overview.votes : null;

  if (!rawOptions || !rawVotes) {
    throw new Error('Voting overview mist verplichte velden options of votes.');
  }

  const options = rawOptions.map(normalizeOption).filter((option) => option.id);
  const votes = Object.fromEntries(
    Object.entries(rawVotes).map(([key, value]) => [key, Number(value || 0)])
  );

  return {
    options,
    votes,
    deadline: overview?.deadline ? new Date(overview.deadline) : null,
    userVote: overview?.userVote || null,
  };
};

const VotingPage = () => {
  usePageTitle('Activiteiten');
  const [options, setOptions] = useState([]);
  const [votes, setVotes] = useState({});
  const [userVote, setUserVote] = useState('');
  const [deadline, setDeadline] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadVoting = async ({ silent = false } = {}) => {
      setError('');
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const overview = await votingApi.getOverview();

        const normalizedOverview = normalizeOverview(overview);
        setOptions(normalizedOverview.options);
        setVotes(normalizedOverview.votes);
        setDeadline(normalizedOverview.deadline);
        setUserVote(normalizedOverview.userVote);
      } catch (requestError) {
        setOptions([]);
        setVotes({});
        setDeadline(null);
        setUserVote(null);
        setError(GENERIC_VOTING_ERROR);
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
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

  const isClosed = deadline ? now >= deadline.getTime() : false;
  const msLeft = deadline ? Math.max(0, deadline.getTime() - now) : 0;
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minutesLeft = Math.floor((msLeft % 3600000) / 60000);

  const totalVotes = useMemo(
    () => Object.values(votes).reduce((sum, amount) => sum + Number(amount || 0), 0),
    [votes]
  );

  const winnerId = useMemo(() => {
    const entries = Object.entries(votes);
    return entries.sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0]?.[0] ?? null;
  }, [votes]);

  const handleVote = (optionId) => {
    if (isClosed || isSubmittingVote) return;
    setError('');

    setIsSubmittingVote(true);
    votingApi.submitVote({ optionId }).then(async () => {
      const refreshedOverview = await votingApi.getOverview();
      const normalizedOverview = normalizeOverview(refreshedOverview);
      setOptions(normalizedOverview.options);
      setVotes(normalizedOverview.votes);
      setDeadline(normalizedOverview.deadline);
      setUserVote(normalizedOverview.userVote);
    }).catch(() => {
      setError(GENERIC_VOTING_ERROR);
    }).finally(() => {
      setIsSubmittingVote(false);
    });
  };

  return (
    <main className="vote-wrap">
      <header className="vote-header">
        <h1>Stem op de activiteit</h1>
        <p aria-live="polite">
          {isLoading
            ? 'Votingdata laden...'
            : !deadline
              ? 'Geen actieve poll beschikbaar.'
              : isClosed
                ? 'Stemming gesloten. Winnaar wordt direct getoond.'
                : `Deadline over ${hoursLeft}u ${minutesLeft}m`}
        </p>
        {error && <p className="vote-error" role="alert">{error}</p>}
      </header>

      {!isLoading && isClosed && winnerId && (
        <div className="winner-box" role="status" aria-live="polite">
          Winnaar: {options.find((option) => option.id === winnerId)?.title}
        </div>
      )}

      {isLoading ? (
        <p className="vote-empty">Opties laden...</p>
      ) : options.length === 0 ? (
        <p className="vote-empty">Nog geen poll-opties ontvangen van backend.</p>
      ) : (
        <section className="vote-list">
          {options.map((option) => {
            const amount = Number(votes[option.id] || 0);
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
                  disabled={isClosed || isSubmittingVote}
                >
                  {isSubmittingVote ? 'Stem opslaan...' : selected ? 'Jouw stem' : 'Stem'}
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
      )}
    </main>
  );
};

export default VotingPage;
