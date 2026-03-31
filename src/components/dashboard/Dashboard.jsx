import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../../services/apiClient';
import { getStoredUser } from '../../utils/auth';
import './Dashboard.css';

// Mock data voor de sportlessen
const INITIAL_LESSONS = [
  { id: 1, title: 'Bokszaktraining', time: 'Vandaag, 19:00 - 20:00', location: 'Zaal 1', instructor: 'Mike', isSubscribed: true },
  { id: 2, title: 'CrossFit WOD', time: 'Morgen, 08:00 - 09:00', location: 'Buiten / Rig', instructor: 'Sarah', isSubscribed: false },
  { id: 3, title: 'Yoga Flow', time: 'Morgen, 10:00 - 11:00', location: 'Studio 2', instructor: 'Lisa', isSubscribed: false },
  { id: 4, title: 'HIIT Circuit', time: 'Woensdag, 18:30 - 19:15', location: 'Zaal 1', instructor: 'Mike', isSubscribed: true },
];

const Dashboard = () => {
  const [lessons, setLessons] = useState(INITIAL_LESSONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);
  const [error, setError] = useState('');

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
          time: lesson.time,
          location: lesson.location,
          instructor: lesson.instructor,
          isSubscribed: subscribed,
        });

        const mappedMyLessons = Array.isArray(myLessons)
          ? myLessons.map((lesson) => normalizeLesson(lesson, true))
          : [];
        const mappedAvailableLessons = Array.isArray(availableLessons)
          ? availableLessons.map((lesson) => normalizeLesson(lesson, false))
          : [];

        setLessons([...mappedMyLessons, ...mappedAvailableLessons]);
        setIsMockMode(false);
      } catch (requestError) {
        setLessons(INITIAL_LESSONS);
        setIsMockMode(true);
        setError('Live lessen konden niet geladen worden. Mock data getoond.');
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

    syncRequest.catch(() => {
      // Rollback local state when backend update fails.
      setLessons((previousLessons) => previousLessons.map(
        (lesson) => (lesson.id === id ? { ...lesson, isSubscribed: isCurrentlySubscribed } : lesson),
      ));
      setError('Wijziging kon niet opgeslagen worden op de server.');
    });
  };

  const upcomingSubscribedLessons = useMemo(
    () => lessons.filter((lesson) => lesson.isSubscribed),
    [lessons],
  );
  const [hasAdminAccess] = useState(() => {
    const user = getStoredUser();
    return user?.role === 'admin';
  });

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Mijn SportPortal</h1>
        <p>Welkom terug! Je hebt {upcomingSubscribedLessons.length} geplande lessen.</p>
        {isMockMode && <p className="dashboard-hint">Mock modus actief: backendlessen zijn niet bereikbaar.</p>}
        {error && <p className="dashboard-error" role="alert">{error}</p>}
        <div className="header-actions">
          <Link className="quick-action" to="/activiteiten">Stem op sportactiviteit</Link>
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
        <h2>Aankomende Lessen</h2>
        {isLoading ? (
          <p className="dashboard-hint">Lessen laden...</p>
        ) : (
          <div className="lesson-list">
            {lessons.map((lesson) => (
              <div key={lesson.id} className={`lesson-card ${lesson.isSubscribed ? 'subscribed' : ''}`}>
                <div className="lesson-info">
                  <h3 className="lesson-title">{lesson.title}</h3>
                  <div className="lesson-details">
                    <span className="detail-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      {lesson.time}
                    </span>
                    <span className="detail-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      {lesson.location}
                    </span>
                    <span className="detail-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      {lesson.instructor}
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
        )}
      </section>
    </div>
  );
};

export default Dashboard;