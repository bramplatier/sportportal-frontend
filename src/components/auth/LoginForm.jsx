import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import './LoginForm.css';

const EyeIcon = ({ closed = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {closed ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

const LoginForm = () => {
  usePageTitle('Login');
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchUser, loginWithGoogle, loginWithPasskey } = useAuth();
  
  const [loginType, setLoginType] = useState('sporter'); // 'sporter', 'trainer', 'admin'
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const challenge = params.get('challenge');
    if (challenge) {
      setChallengeToken(challenge);
      setLoginType('trainer');
      setStep(2);
    }
  }, [location.search]);

  const handleTrainerLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await authApi.login({ email, password });
      if (result.mfaRequired || result.mfa_required) {
        setChallengeToken(result.challengeToken || result.challenge_token);
        setStep(2);
      } else {
        await fetchUser();
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err?.message || 'Login mislukt.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFA = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.verifyMfa({ challengeToken, otp: mfaCode });
      await fetchUser();
      navigate('/dashboard');
    } catch (err) {
      setError('MFA code onjuist.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminPasskey = async (e) => {
    e.preventDefault();
    if (!email) { setError('Voer eerst je e-mailadres in.'); return; }
    setIsLoading(true);
    setError('');
    try {
      await loginWithPasskey(email);
      navigate('/dashboard');
    } catch (err) {
      setError('Passkey verificatie mislukt. Gebruik een geregistreerde Passkey.');
    } finally {
      setIsLoading(false);
    }
  };

  const fallingLines = Array.from({ length: 10 }, (_, i) => ({ id: i, left: `${i * 10}%`, delay: `${i * 0.5}s` }));

  return (
    <div className="login-container">
      <div className="falling-lines">
        {fallingLines.map(l => <span key={l.id} className="line" style={{left: l.left, animationDelay: l.delay}} />)}
      </div>

      <div className="login-box">
        <header className="login-nav">
          <button className={loginType === 'sporter' ? 'active' : ''} onClick={() => {setLoginType('sporter'); setStep(1); setError('');}}>Sporter</button>
          <button className={loginType === 'trainer' ? 'active' : ''} onClick={() => {setLoginType('trainer'); setStep(1); setError('');}}>Trainer</button>
          <button className={loginType === 'admin' ? 'active' : ''} onClick={() => {setLoginType('admin'); setStep(1); setError('');}}>Admin</button>
        </header>

        <h2 className="login-title">
          {loginType === 'sporter' && 'Welkom'}
          {loginType === 'trainer' && 'Trainer Portal'}
          {loginType === 'admin' && 'Admin Vault'}
        </h2>
        <p className="login-subtitle">
          {loginType === 'sporter' && 'Log in met je Google account om te sporten.'}
          {loginType === 'trainer' && 'Gebruik je wachtwoord en MFA code.'}
          {loginType === 'admin' && 'Beveiligde toegang via Passkey.'}
        </p>

        {error && <div className="login-error">{error}</div>}

        <div className="login-body">
          {loginType === 'sporter' && (
            <button className="btn btn-primary btn-full google-btn" onClick={loginWithGoogle}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width="18" />
              Inloggen met Google
            </button>
          )}

          {loginType === 'trainer' && step === 1 && (
            <form onSubmit={handleTrainerLogin} className="login-form">
              <div className="form-group">
                <label>E-mailadres</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Wachtwoord</label>
                <div className="password-field">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    <EyeIcon closed={showPassword} />
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
                {isLoading ? 'Laden...' : 'Inloggen'}
              </button>
            </form>
          )}

          {loginType === 'trainer' && step === 2 && (
            <form onSubmit={handleMFA} className="login-form">
              <div className="form-group">
                <label>MFA Code</label>
                <input type="text" placeholder="6 cijfers" value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))} maxLength="6" required />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
                {isLoading ? 'Verifiëren...' : 'Bevestigen'}
              </button>
              <button type="button" className="btn btn-outline btn-full" style={{marginTop: '0.5rem'}} onClick={() => setStep(1)}>Terug</button>
            </form>
          )}

          {loginType === 'admin' && (
            <form onSubmit={handleAdminPasskey} className="login-form">
              <div className="form-group">
                <label>Admin E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
                {isLoading ? 'Biometrische scan...' : 'Gebruik Passkey'}
              </button>
              <p style={{fontSize: '0.8rem', color: 'var(--color-muted)', textAlign: 'center', marginTop: '1rem'}}>
                Nog geen Passkey? Log eerst in via Trainer en stel deze in bij Admin.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
