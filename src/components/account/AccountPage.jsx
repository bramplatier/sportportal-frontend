import React, { useEffect, useState } from 'react';
import { customerApi } from '../../services/apiClient';
import { authApi } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import './AccountPage.css';

const CATEGORIES = [];

const normalizeCategory = (category) => ({
  id: category?.id || category?.categoryId || category?.slug || '',
  label: category?.label || category?.name || category?.title || 'Onbekende categorie',
  joined: Boolean(category?.joined ?? category?.isJoined ?? category?.is_joined),
});

const AccountPage = () => {
  usePageTitle('Account');
  const { user } = useAuth();
  const [categories, setCategories] = useState(CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [isBackendUnavailable, setIsBackendUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaMessage, setMfaMessage] = useState('');
  const [mfaSetupCode, setMfaSetupCode] = useState('');
  const [mfaDisableCode, setMfaDisableCode] = useState('');
  const [mfaSetupData, setMfaSetupData] = useState(null);
  const [mfaSetupToken, setMfaSetupToken] = useState('');

  const [profile, setProfile] = useState({
    email: user?.email || 'onbekend@sportportal.nl',
    role: user?.role || 'customer',
    fullName: user?.name || user?.fullName || 'SportPortal Lid',
    memberSince: user?.memberSince || '2024',
    city: user?.city || 'Rotterdam',
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

        setProfile({
          email: profileData?.email || user.email,
          role: profileData?.role || user.role,
          fullName: profileData?.fullName || user.fullName,
          memberSince: profileData?.memberSince || user.memberSince,
          city: profileData?.city || user.city,
        });

        setMfaEnabled(Boolean(
          profileData?.mfaEnabled
          || profileData?.mfa_enabled
          || profileData?.hasMfa
          || profileData?.has_mfa
        ));

        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData.map(normalizeCategory).filter((category) => category.id));
        }

        setIsBackendUnavailable(false);
      } catch (requestError) {
        setProfile(user);
        setCategories([]);
        setIsBackendUnavailable(true);
        setError('Kon accountdata niet laden van backend.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAccountData();
  }, [user]);

  const toggleCategory = (id) => {
    const current = categories.find((item) => item.id === id);
    if (!current) {
      setError('Deze categorie kon niet gevonden worden. Vernieuw de pagina.');
      return;
    }

    const nextJoined = !current?.joined;

    setCategories((prev) => prev.map((item) => (
      item.id === id ? { ...item, joined: nextJoined } : item
    )));

    customerApi.setCategoryMembership({
      categoryId: id,
      joined: nextJoined,
    }).catch((err) => {
      setCategories((prev) => prev.map((item) => (
        item.id === id ? { ...item, joined: !nextJoined } : item
      )));
      setError(err?.message || 'Wijziging categorie kon niet opgeslagen worden.');
    });
  };

  const handleStartMfaSetup = async () => {
    setMfaMessage('');
    setIsMfaLoading(true);

    try {
      const response = await authApi.startMfaSetup();
      const extractedSetupToken = response?.setupToken || response?.setup_token || '';

      setMfaSetupData({
        qrImageUrl: response?.qrImageUrl || response?.qr_image_url || response?.qrCodeDataUrl || response?.qr_code_data_url || '',
        otpAuthUri: response?.otpAuthUri || response?.otpauth_uri || response?.otpauthUrl || response?.otpauth_url || '',
        secret: response?.secret || response?.manualEntryKey || response?.manual_entry_key || '',
      });
      setMfaSetupToken(extractedSetupToken);
      setMfaMessage('Scan de QR-code in je authenticator app en bevestig met een 6-cijferige code.');
    } catch (requestError) {
      setMfaMessage(requestError?.message || 'Kon MFA setup niet starten.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleConfirmMfaSetup = async (event) => {
    event.preventDefault();

    if (mfaSetupCode.length !== 6) {
      setMfaMessage('Vul een geldige 6-cijferige code in.');
      return;
    }

    setMfaMessage('');
    setIsMfaLoading(true);

    try {
      await authApi.confirmMfaSetup({ otp: mfaSetupCode, setupToken: mfaSetupToken });
      setMfaEnabled(true);
      setMfaSetupData(null);
      setMfaSetupToken('');
      setMfaSetupCode('');
      setMfaMessage('MFA is succesvol ingeschakeld.');
    } catch (requestError) {
      setMfaMessage(requestError?.message || 'MFA bevestigen is mislukt.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleDisableMfa = async (event) => {
    event.preventDefault();

    if (mfaDisableCode.length !== 6) {
      setMfaMessage('Vul een geldige 6-cijferige code in om MFA uit te schakelen.');
      return;
    }

    setMfaMessage('');
    setIsMfaLoading(true);

    try {
      await authApi.disableMfa({ otp: mfaDisableCode });
      setMfaEnabled(false);
      setMfaDisableCode('');
      setMfaMessage('MFA is uitgeschakeld.');
    } catch (requestError) {
      setMfaMessage(requestError?.message || 'MFA uitschakelen is mislukt.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  return (
    <section className="account-wrap">
      <header className="account-header">
        <h1>Mijn Profiel</h1>
        <p>Bekijk je gegevens, lesinschrijvingen en sportcategorieen.</p>
        {isBackendUnavailable && <p className="account-note">Live accountdata is momenteel niet bereikbaar.</p>}
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
            {categories.length > 0 ? categories.map((category) => (
              <div className="category-item" key={category.id}>
                <span>{category.label}</span>
                <button type="button" disabled={isLoading} onClick={() => toggleCategory(category.id)}>
                  {category.joined ? 'Afmelden' : 'Aanmelden'}
                </button>
              </div>
            )) : <p className="category-empty">Nog geen sportcategorieen ontvangen van backend.</p>}
          </div>
        </article>

        <article className="account-card mfa-card">
          <h2>Beveiliging (MFA)</h2>
          <p className="mfa-state">
            Status: <strong>{mfaEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}</strong>
          </p>

          {!mfaEnabled && !mfaSetupData && (
            <button type="button" onClick={handleStartMfaSetup} disabled={isMfaLoading}>
              {isMfaLoading ? 'MFA setup starten...' : 'MFA inschakelen'}
            </button>
          )}

          {!mfaEnabled && mfaSetupData && (
            <form className="mfa-form" onSubmit={handleConfirmMfaSetup}>
              {mfaSetupData.qrImageUrl && (
                <img className="mfa-qr" src={mfaSetupData.qrImageUrl} alt="MFA QR code" />
              )}
              {mfaSetupData.otpAuthUri && (
                <p className="mfa-text-break">URI: {mfaSetupData.otpAuthUri}</p>
              )}
              {mfaSetupData.secret && (
                <p>Handmatige code: <strong>{mfaSetupData.secret}</strong></p>
              )}

              <label htmlFor="mfaSetupCode">Bevestig code uit authenticator</label>
              <input
                id="mfaSetupCode"
                type="text"
                value={mfaSetupCode}
                onChange={(e) => setMfaSetupCode(e.target.value.replace(/\D/g, ''))}
                maxLength="6"
                inputMode="numeric"
                placeholder="123456"
                pattern="[0-9]{6}"
                required
              />

              <button type="submit" disabled={isMfaLoading}>
                {isMfaLoading ? 'Bevestigen...' : 'MFA bevestigen'}
              </button>
            </form>
          )}

          {mfaEnabled && (
            <form className="mfa-form" onSubmit={handleDisableMfa}>
              <label htmlFor="mfaDisableCode">Code voor uitschakelen</label>
              <input
                id="mfaDisableCode"
                type="text"
                value={mfaDisableCode}
                onChange={(e) => setMfaDisableCode(e.target.value.replace(/\D/g, ''))}
                maxLength="6"
                inputMode="numeric"
                placeholder="123456"
                pattern="[0-9]{6}"
                required
              />
              <button type="submit" disabled={isMfaLoading}>
                {isMfaLoading ? 'Uitschakelen...' : 'MFA uitschakelen'}
              </button>
            </form>
          )}

          {mfaMessage && <p className="mfa-message">{mfaMessage}</p>}
        </article>
      </div>
    </section>
  );
};

export default AccountPage;
