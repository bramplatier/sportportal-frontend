import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../../services/apiClient';
import { getCapabilitiesForRole, hasCapability } from '../../utils/auth';
import { useAuth } from '../../context/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import './Dashboard.css';

const INITIAL_LESSONS = [];

const deriveTimeLabel = (lesson) => {
  if (lesson?.time) return lesson.time;

  const rawDate = lesson?.date || lesson?.startsAt || lesson?.starts_at || lesson?.sessionDate || lesson?.session_date;
  if (!rawDate) return null;

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
};

const CAPABILITY_LABELS = {
  'profile.view': 'Persoonlijk profiel bekijken',
  'lessons.view.my': 'Eigen lessen bekijken',
  'lessons.view.available': 'Beschikbare lessen bekijken',
  'lessons.subscribe': 'Aanmelden voor lessen',
  'lessons.unsubscribe': 'Afmelden van lessen',
  'categories.join': 'Aanmelden voor sportcategorieen',
  'categories.leave': 'Afmelden van sportcategorieen',
  'trainer.sessions.view': 'Trainersessies bekijken',
  'trainer.sessions.create': 'Trainingen aanmaken',
  'trainer.participants.view': 'Deelnemerslijsten bekijken',
  'trainer.activities.organize': 'Sportactiviteiten organiseren',
  'trainer.polls.view': 'Polls bekijken',
  'trainer.polls.create': 'Nieuwe polls aanmaken',
  'trainer.polls.voters.view': 'Stemmers per poll inzien',
  'trainer.polls.delete': 'Polls verwijderen',
  'trainer.polls.activate': 'Actieve stempoll instellen',
  'admin.users.view': 'Gebruikers beheren',
  'admin.users.approve': 'Nieuwe gebruikers goedkeuren',
  'admin.mfa.reset': 'MFA resetten voor accounts',
  'admin.activities.assign.trainer': 'Trainers koppelen aan activiteiten',
};

const Dashboard = () => {
  usePageTitle('Dashboard');
  const [lessons, setLessons] = useState(INITIAL_LESSONS);
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
          trainerId: lesson.trainerId || lesson.trainer_id || null,
          trainerName: lesson.trainerName || lesson.trainer_name || lesson.instructor || 'Onbekend',
          instructor: lesson.instructor || lesson.trainerName || lesson.trainer_name || 'Onbekend',
          isSubscribed: subscribed,
        });

        const mappedMyLessons = Array.isArray(myLessons)
          ? myLessons.map((lesson) => normalizeLesson(lesson, true))
          : [];
        const mappedAvailableLessons = Array.isArray(availableLessons)
          ? availableLessons.map((lesson) => normalizeLesson(lesson, false))
          : [];

        setLessons([...mappedMyLessons, ...mappedAvailableLessons]);
      } catch (requestError) {
        setLessons([]);
        setError('Lessen konden niet geladen worden vanuit de backend.');
      } finally {
        setIsLoading(false);
      }
    };

    loadLessons();
  }, []);

  const toggleSubscription = (id) => {
    setLessons((previousLessons) => previousLessons.map(
      (lesson) => (lesson.id === id ? { ...lesson, isSubscribed: !lesson.isSubscribed } : lesson),
    ));

    const target = lessons.find((lesson) => lesson.id === id);
    const isCurrentlySubscribed = Boolean(target?.isSubscribed);

    const syncRequest = isCurrentlySubscribed
      ? customerApi.unsubscribeFromLesson({ lessonId: id })
      : customerApi.subscribeToLesson({ lessonId: id });

    syncRequest.catch((err) => {
      // Rollback local state when backend update fails.
      setLessons((previousLessons) => previousLessons.map(
        (lesson) => (lesson.id === id ? { ...lesson, isSubscribed: isCurrentlySubscribed } : lesson),
      ));
      setError(err?.message || 'Wijziging kon niet opgeslagen worden op de server.');
    });
  };

  const upcomingSubscribedLessons = useMemo(
    () => lessons.filter((lesson) => lesson.isSubscribed),
    [lessons],
  );
  const visibleCapabilities = useMemo(
    () => getCapabilitiesForRole(user.role).filter((capability) => CAPABILITY_LABELS[capability]),
    [user.role],
  );
  const hasAdminAccess = hasCapability(user, 'admin.users.view');
  const hasTrainerAccess = hasCapability(user, 'trainer.sessions.view');

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Mijn SportPortal</h1>
        <p>Welkom terug! Je hebt {upcomingSubscribedLessons.length} geplande lessen.</p>
        {error && <p className="dashboard-error" role="alert">{error}</p>}
        <div className="header-actions">
          <Link className="quick-action" to="/activiteiten">Stem op sportactiviteit</Link>
          {hasTrainerAccess && <Link className="quick-action" to="/trainer">Open Trainer Panel</Link>}
          {hasAdminAccess && <Link className="quick-action admin-link" to="/admin">Open Admin Panel</Link>}
        </div>
      </header>

      <section className="summary-strip" aria-label="Dashboard samenvatting">
        <article>
          <h2>Ingeschreven</h2>
          <strong>{upcomingSubscribedLessons.length}</strong>
        </article>
        <article>
          <h2>Totaal lessen</h2>
          <strong>{lessons.length}</strong>
        </article>
        <article>
          <h2>Beschikbaar</h2>
          <strong>{lessons.length - upcomingSubscribedLessons.length}</strong>
        </article>
      </section>

      <section className="dashboard-section">
        <h2>Jouw Toegang</h2>
        <p className="dashboard-role-line">Rol: <strong>{user.role}</strong></p>
        <div className="capability-list" aria-label="Actieve rechten">
          {visibleCapabilities.map((capability) => (
            <span className="capability-pill" key={capability}>{CAPABILITY_LABELS[capability]}</span>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Aankomende Lessen</h2>
        {isLoading ? (
          <p className="dashboard-hint">Lessen laden...</p>
        ) : lessons.length > 0 ? (
          <div className="lesson-list">
            {lessons.map((lesson) => (
              <div key={lesson.id} className={`lesson-card ${lesson.isSubscribed ? 'subscribed' : ''}`}>
                <div className="lesson-info">
                  <h3 className="lesson-title">{lesson.title}</h3>
                  <div className="lesson-details">
                    <span className="detail-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      {lesson.time || 'Tijd onbekend'}
                    </span>
                    <span className="detail-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      {lesson.location}
                    </span>
                    <span className="detail-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      {lesson.trainerName || lesson.instructor || 'Onbekend'}
                    </span>
                  </div>
                </div>

                <div className="lesson-actions">
                  <button
                    className={`btn-toggle ${lesson.isSubscribed ? 'btn-unsubscribe' : 'btn-subscribe'}`}
                    onClick={() => toggleSubscription(lesson.id)}
                    aria-label={lesson.isSubscribed ? `Afmelden voor ${lesson.title}` : `Aanmelden voor ${lesson.title}`}
                    aria-pressed={lesson.isSubscribed}
                  >
                    {lesson.isSubscribed ? (
                      <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Afmelden</>
                    ) : (
                      <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Aanmelden</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="dashboard-hint">Nog geen lessen ontvangen van backend.</p>
        )}
      </section>
    </div>
  );
};

export default Dashboard;