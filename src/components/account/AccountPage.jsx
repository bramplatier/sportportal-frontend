import React, { useEffect, useMemo, useState } from 'react';
import { customerApi } from '../../services/apiClient';
import { getStoredUser } from '../../utils/auth';
import './AccountPage.css';

const CATEGORIES = [
  { id: 'kracht', label: 'Krachttraining', joined: true },
  { id: 'hyrox', label: 'HYROX', joined: false },
  { id: 'padel', label: 'Padel', joined: true },
  { id: 'yoga', label: 'Yoga', joined: false },
];

const AccountPage = () => {
  const [categories, setCategories] = useState(CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);
  const [error, setError] = useState('');
  const user = useMemo(() => {
    const parsed = getStoredUser();
    return {
      email: parsed?.email || 'onbekend@sportportal.nl',
      role: parsed?.role || 'customer',
      fullName: parsed?.name || 'SportPortal Lid',
      memberSince: '2024',
      city: 'Rotterdam',
    };
  }, []);

  const [profile, setProfile] = useState(user);

  useEffect(() => {
    const loadAccountData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [profileData, categoriesData] = await Promise.all([
          customerApi.getProfile(),
          customerApi.getCategories(),
        ]);

        setProfile({
          email: profileData?.email || user.email,
          role: profileData?.role || user.role,
          fullName: profileData?.fullName || user.fullName,
          memberSince: profileData?.memberSince || user.memberSince,
          city: profileData?.city || user.city,
        });

        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData.map((category) => ({
            id: category.id,
            label: category.label,
            joined: Boolean(category.joined),
          })));
        }

        setIsMockMode(false);
      } catch (requestError) {
        setProfile(user);
        setCategories(CATEGORIES);
        setIsMockMode(true);
        setError('Kon accountdata niet laden van backend.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAccountData();
  }, [user]);

  const toggleCategory = (id) => {
    const current = categories.find((item) => item.id === id);
    const nextJoined = !current?.joined;

    setCategories((prev) => prev.map((item) => (
      item.id === id ? { ...item, joined: nextJoined } : item
    )));

    customerApi.setCategoryMembership({
      categoryId: id,
      joined: nextJoined,
    }).catch(() => {
      setCategories((prev) => prev.map((item) => (
        item.id === id ? { ...item, joined: !nextJoined } : item
      )));
      setError('Wijziging categorie kon niet opgeslagen worden.');
    });
  };

  return (
    <section className="account-wrap">
      <header className="account-header">
        <h1>Mijn Profiel</h1>
        <p>Bekijk je gegevens, lesinschrijvingen en sportcategorieen.</p>
        {isMockMode && <p className="account-note">Mock modus actief voor account data.</p>}
        {error && <p className="account-error" role="alert">{error}</p>}
      </header>

      <div className="account-grid">
        <article className="account-card">
          <h2>Persoonlijke gegevens</h2>
          <ul>
            <li><strong>Naam:</strong> {profile.fullName}</li>
            <li><strong>E-mail:</strong> {profile.email}</li>
            <li><strong>Rol:</strong> {profile.role}</li>
            <li><strong>Lid sinds:</strong> {profile.memberSince}</li>
            <li><strong>Woonplaats:</strong> {profile.city}</li>
          </ul>
        </article>

        <article className="account-card">
          <h2>Sportcategorieen</h2>
          <div className="category-list">
            {categories.map((category) => (
              <div className="category-item" key={category.id}>
                <span>{category.label}</span>
                <button type="button" disabled={isLoading} onClick={() => toggleCategory(category.id)}>
                  {category.joined ? 'Afmelden' : 'Aanmelden'}
                </button>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
};

export default AccountPage;
