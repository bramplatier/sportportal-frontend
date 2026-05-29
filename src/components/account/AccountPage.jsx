import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi, authApi } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import './AccountPage.css';

const normalizeCategory = (category) => ({
  id: category?.id || category?.categoryId || category?.slug || '',
  label: category?.label || category?.name || category?.title || 'Onbekende categorie',
  joined: Boolean(category?.joined ?? category?.isJoined ?? category?.is_joined),
});

const AccountPage = () => {
  usePageTitle('Account');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaMessage, setMfaMessage] = useState('');
  const [mfaSetupCode, setMfaSetupCode] = useState('');
  const [mfaDisableCode, setMfaDisableCode] = useState('');
  const [mfaSetupData, setMfaSetupData] = useState(null);
  const [mfaSetupToken, setMfaSetupToken] = useState('');

  const [profile, setProfile] = useState({
    email: user?.email || '',
    role: user?.role || 'customer',
    fullName: user?.name || user?.fullName || 'SportPortal Lid',
    memberSince: '2024',
    city: 'Rotterdam',
  });

  useEffect(() => {
    const loadAccountData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [profileData, categoriesData] = await Promise.all([
          customerApi.getProfile(),
          customerApi.getCategories(),
        ]);

        if (profileData?.user) {
          const u = profileData.user;
          setProfile({
            email: u.email || user.email,
            role: u.role || user.role,
            fullName: u.fullName || user.fullName || 'SportPortal Lid',
            memberSince: u.createdAt ? new Date(u.createdAt).getFullYear().toString() : '2024',
            city: u.city || 'Rotterdam',
          });
        }

        setMfaEnabled(Boolean(profileData?.mfaEnabled || profileData?.mfa_enabled));

        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData.map(normalizeCategory).filter((category) => category.id));
        }
      } catch (requestError) {
        setError('Kon accountdata niet laden van de server.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAccountData();
  }, [user]);

  const toggleCategory = async (id) => {
    const current = categories.find((item) => item.id === id);
    if (!current) return;

    const nextJoined = !current.joined;

    // Optimistic update
    setCategories((prev) => prev.map((item) => (
      item.id === id ? { ...item, joined: nextJoined } : item
    )));

    try {
      await customerApi.setCategoryMembership({
        categoryId: id,
        joined: nextJoined,
      });
    } catch (err) {
      // Revert on error
      setCategories((prev) => prev.map((item) => (
        item.id === id ? { ...item, joined: !nextJoined } : item
      )));
      setError(err?.message || 'Wijziging kon niet worden opgeslagen.');
    }
  };

  const handleStartMfaSetup = async () => {
    setMfaMessage('');
    setIsMfaLoading(true);

    try {
      const response = await authApi.startMfaSetup();
      setMfaSetupData({
        qrImageUrl: response?.qrImageUrl || response?.qr_image_url || '',
        secret: response?.secret || response?.manualEntryKey || '',
      });
      setMfaSetupToken(response?.setupToken || response?.setup_token || '');
      setMfaMessage('Scan de QR-code en voer de 6-cijferige code in.');
    } catch (requestError) {
      setMfaMessage(requestError?.message || 'MFA setup mislukt.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleConfirmMfaSetup = async (e) => {
    e.preventDefault();
    if (mfaSetupCode.length !== 6) return;

    setIsMfaLoading(true);
    try {
      await authApi.confirmMfaSetup({ otp: mfaSetupCode, setupToken: mfaSetupToken });
      setMfaEnabled(true);
      setMfaSetupData(null);
      setMfaSetupCode('');
      setMfaMessage('MFA is succesvol ingeschakeld.');
    } catch (err) {
      setMfaMessage(err?.message || 'Bevestiging mislukt.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleDisableMfa = async (e) => {
    e.preventDefault();
    if (mfaDisableCode.length !== 6) return;

    setIsMfaLoading(true);
    try {
      await authApi.disableMfa({ otp: mfaDisableCode });
      setMfaEnabled(false);
      setMfaDisableCode('');
      setMfaMessage('MFA is uitgeschakeld.');
    } catch (err) {
      setMfaMessage(err?.message || 'Uitschakelen mislukt.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError('');
    try {
      await customerApi.deleteAccount();
      // On success, the backend clears cookies. We just need to logout on frontend and redirect.
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err?.message || 'Account verwijderen mislukt.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="account-container">
      <header className="account-hero">
        <div className="hero-content">
          <span className="badge">Mijn Profiel</span>
          <h1>{profile.fullName}</h1>
          <p className="subtitle">Beheer je sportieve reis bij SportPortal</p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="account-bento">
        {/* Profile Card */}
        <section className="bento-card profile-card">
          <div className="card-header">
            <div className="icon-circle">👤</div>
            <h2>Gegevens</h2>
          </div>
          <div className="card-content">
            <div className="info-row">
              <span className="label">E-mail</span>
              <span className="value">{profile.email}</span>
            </div>
            <div className="info-row">
              <span className="label">Rol</span>
              <span className="value role-badge">{profile.role}</span>
            </div>
            <div className="info-row">
              <span className="label">Lid sinds</span>
              <span className="value">{profile.memberSince}</span>
            </div>
            <div className="info-row">
              <span className="label">Stad</span>
              <span className="value">{profile.city}</span>
            </div>
          </div>
        </section>

        {/* Categories Card */}
        <section className="bento-card categories-card">
          <div className="card-header">
            <div className="icon-circle">🏃</div>
            <h2>Mijn Sporten</h2>
          </div>
          <div className="card-content">
            {categories.length > 0 ? (
              <div className="sport-grid">
                {categories.map((cat) => (
                  <button 
                    key={cat.id} 
                    className={`sport-chip ${cat.joined ? 'active' : ''}`}
                    onClick={() => toggleCategory(cat.id)}
                    disabled={isLoading}
                  >
                    {cat.label}
                    <span className="chip-status">{cat.joined ? '✓' : '+'}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">Geen sportcategorieën beschikbaar.</p>
            )}
          </div>
        </section>

        {/* Security Card */}
        <section className="bento-card security-card">
          <div className="card-header">
            <div className="icon-circle">🔒</div>
            <h2>Beveiliging</h2>
          </div>
          <div className="card-content">
            <div className="mfa-status-box">
              <span className={`status-dot ${mfaEnabled ? 'enabled' : 'disabled'}`}></span>
              <p>Multi-Factor Authenticatie: <strong>{mfaEnabled ? 'Actief' : 'Inactief'}</strong></p>
            </div>

            {!mfaEnabled && !mfaSetupData && (
              <button className="btn btn-primary btn-full" onClick={handleStartMfaSetup} disabled={isMfaLoading}>
                {isMfaLoading ? 'Laden...' : 'MFA Inschakelen'}
              </button>
            )}

            {mfaSetupData && (
              <div className="mfa-setup-area">
                {mfaSetupData.qrImageUrl && <img src={mfaSetupData.qrImageUrl} alt="QR" className="qr-code" />}
                <form onSubmit={handleConfirmMfaSetup} className="compact-form">
                  <input 
                    type="text" 
                    placeholder="6-cijferige code" 
                    value={mfaSetupCode}
                    onChange={(e) => setMfaSetupCode(e.target.value.replace(/\D/g, ''))}
                    maxLength="6"
                  />
                  <button type="submit" className="btn btn-accent" disabled={isMfaLoading}>Bevestigen</button>
                </form>
              </div>
            )}

            {mfaEnabled && (
              <form onSubmit={handleDisableMfa} className="compact-form">
                <input 
                  type="text" 
                  placeholder="6-cijferige code" 
                  value={mfaDisableCode}
                  onChange={(e) => setMfaDisableCode(e.target.value.replace(/\D/g, ''))}
                  maxLength="6"
                />
                <button type="submit" className="btn btn-outline" disabled={isMfaLoading}>MFA Uitschakelen</button>
              </form>
            )}
            {mfaMessage && <p className="mfa-info-text">{mfaMessage}</p>}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bento-card danger-card">
          <div className="card-header">
            <div className="icon-circle danger">⚠️</div>
            <h2>Gevaarlijke Zone</h2>
          </div>
          <div className="card-content">
            <p>Het verwijderen van je account is onomkeerbaar. Al je gegevens, inschrijvingen en voortgang gaan verloren.</p>
            
            {!showDeleteConfirm ? (
              <button className="btn btn-danger btn-full" onClick={() => setShowDeleteConfirm(true)}>
                Account Verwijderen
              </button>
            ) : (
              <div className="confirm-box">
                <p className="confirm-text">Weet je het zeker? Dit kan niet ongedaan worden gemaakt.</p>
                <div className="btn-group">
                  <button className="btn btn-danger" onClick={handleDeleteAccount} disabled={isDeleting}>
                    {isDeleting ? 'Verwijderen...' : 'Ja, verwijder definitief'}
                  </button>
                  <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                    Annuleren
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AccountPage;
