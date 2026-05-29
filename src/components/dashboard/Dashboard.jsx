import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../../services/apiClient';
import { getCapabilitiesForRole, hasCapability } from '../../utils/auth';
import { useAuth } from '../../context/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import './Dashboard.css';

const deriveTimeLabel = (lesson) => {
  if (lesson?.time) return lesson.time;

  const rawDate = lesson?.date || lesson?.startsAt || lesson?.starts_at || lesson?.sessionDate || lesson?.session_date;
  if (!rawDate) return null;

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
};

const CAPABILITY_LABELS = {
  'profile.view': 'Profiel',
  'lessons.view.my': 'Mijn lessen',
  'lessons.view.available': 'Lesaanbod',
  'lessons.subscribe': 'Inschrijven',
  'lessons.unsubscribe': 'Uitschrijven',
  'categories.join': 'Sportgroepen',
  'trainer.sessions.view': 'Trainingen',
  'trainer.polls.activate': 'Stempolls',
  'admin.users.view': 'Beheer',
};

const Dashboard = () => {
  usePageTitle('Dashboard');
  const [lessons, setLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const loadLessons = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [myLessons, availableLessons] = await Promise.all([
          customerApi.getMyLessons(),
          customerApi.getAvailableLessons(),
        ]);

        const normalizeLesson = (lesson, subscribed) => ({
          id: lesson.id,
          title: lesson.title,
          date: lesson.date || lesson.startsAt || lesson.starts_at || null,
          time: deriveTimeLabel(lesson),
          location: lesson.location,
          trainerName: lesson.trainerName || lesson.trainer_email || 'Onbekend',
          isSubscribed: subscribed,
        });

        const mappedMyLessons = Array.isArray(myLessons) ? myLessons.map((l) => normalizeLesson(l, true)) : [];
        const mappedAvailableLessons = Array.isArray(availableLessons) 
          ? availableLessons
              .filter(l => !mappedMyLessons.some(myL => myL.id === l.id))
              .map((l) => normalizeLesson(l, false)) 
          : [];

        setLessons([...mappedMyLessons, ...mappedAvailableLessons]);
      } catch (requestError) {
        setError('Lessen konden niet geladen worden.');
      } finally {
        setIsLoading(false);
      }
    };

    loadLessons();
  }, []);

  const toggleSubscription = async (id) => {
    const target = lessons.find((l) => l.id === id);
    if (!target) return;

    const isCurrentlySubscribed = target.isSubscribed;
    
    // Optimistic update
    setLessons(prev => prev.map(l => l.id === id ? { ...l, isSubscribed: !isCurrentlySubscribed } : l));

    try {
      if (isCurrentlySubscribed) {
        await customerApi.unsubscribeFromLesson({ lessonId: id });
      } else {
        await customerApi.subscribeToLesson({ lessonId: id });
      }
    } catch (err) {
      // Revert
      setLessons(prev => prev.map(l => l.id === id ? { ...l, isSubscribed: isCurrentlySubscribed } : l));
      setError(err?.message || 'Actie mislukt.');
    }
  };

  const upcomingSubscribedLessons = useMemo(() => lessons.filter((l) => l.isSubscribed), [lessons]);
  const visibleCapabilities = useMemo(
    () => getCapabilitiesForRole(user.role).filter((cap) => CAPABILITY_LABELS[cap]),
    [user.role]
  );

  return (
    <div className="dash-wrap">
      <header className="dash-hero">
        <div className="hero-main">
          <span className="welcome-badge">Welkom terug, {user.email.split('@')[0]}</span>
          <h1>Power up your day</h1>
          <p>Je hebt <strong>{upcomingSubscribedLessons.length}</strong> lessen gepland voor deze week.</p>
        </div>
        <div className="hero-stats">
          <div className="stat-pill">
            <span className="stat-value">{lessons.length}</span>
            <span className="stat-label">Lessen Totaal</span>
          </div>
          <div className="stat-pill accent">
            <span className="stat-value">{upcomingSubscribedLessons.length}</span>
            <span className="stat-label">Actief</span>
          </div>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <main className="dash-grid">
        {/* Quick Actions / Capabilities */}
        <section className="dash-card capabilities-card">
          <h2>Jouw Skills</h2>
          <div className="cap-grid">
            {visibleCapabilities.map((cap) => (
              <div key={cap} className="cap-item">
                <span className="cap-dot"></span>
                {CAPABILITY_LABELS[cap]}
              </div>
            ))}
          </div>
          <div className="dash-actions">
            <Link className="btn btn-primary" to="/activiteiten">Stem Nu</Link>
            {hasCapability(user, 'admin.users.view') && <Link className="btn btn-outline" to="/admin">Admin</Link>}
            {hasCapability(user, 'trainer.sessions.view') && <Link className="btn btn-outline" to="/trainer">Trainer</Link>}
          </div>
        </section>

        {/* Lessons Section */}
        <section className="dash-card lessons-card">
          <div className="card-header-flex">
            <h2>Aankomende Lessen</h2>
            <Link to="/activiteiten" className="view-all">Bekijk alles →</Link>
          </div>
          
          <div className="lesson-grid">
            {isLoading ? (
              <p className="loading-text">Loading lessons...</p>
            ) : lessons.length > 0 ? (
              lessons.slice(0, 6).map((lesson) => (
                <div key={lesson.id} className={`lesson-tile ${lesson.isSubscribed ? 'active' : ''}`}>
                  <div className="tile-content">
                    <h3>{lesson.title}</h3>
                    <div className="tile-meta">
                      <span>🕒 {lesson.time || '10:00'}</span>
                      <span>📍 {lesson.location || 'SportZaal'}</span>
                    </div>
                  </div>
                  <button 
                    className={`tile-action ${lesson.isSubscribed ? 'active' : ''}`}
                    onClick={() => toggleSubscription(lesson.id)}
                  >
                    {lesson.isSubscribed ? '✓' : '+'}
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-text">Nog geen lessen gepland.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
