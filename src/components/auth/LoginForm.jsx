import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/apiClient';
import { normalizeRole } from '../../utils/auth';
import './LoginForm.css';

const LoginForm = ({ requiredRole = null, successPath = '/dashboard' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const targetPath = new URLSearchParams(location.search).get('next') || successPath;
  const isAdminLogin = requiredRole === 'admin';
  const title = requiredRole === 'admin' ? 'Admin Login' : 'SportPortal';
  const fallingLines = Array.from({ length: 14 }, (_, index) => ({
    id: index,
    left: `${(index + 1) * 7}%`,
    delay: `${(index % 7) * 0.6}s`,
    duration: `${6 + (index % 4) * 1.2}s`,
  }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const cleanedPassword = password.trim();

    try {
      if (!normalizedEmail || !cleanedPassword) {
        setError('Vul alle verplichte velden in.');
        return;
      }

      const result = await authApi.login({
        email: normalizedEmail,
        password: cleanedPassword,
      });

      if (result?.mfaRequired) {
        if (!result.challengeToken) {
          setError('MFA challenge ontbreekt in server response.');
          return;
        }

        setChallengeToken(result.challengeToken);
        setStep(2);
        return;
      }

      const rawUser = result?.user || { email: normalizedEmail, role: 'customer' };
      const user = { ...rawUser, role: normalizeRole(rawUser.role) };
      const token = result?.accessToken || result?.token || '';

      if (requiredRole && user.role !== requiredRole) {
        window.localStorage.removeItem('sportportal:user');
        window.localStorage.removeItem('sportportal:token');
        setError('Je account heeft geen admin rechten.');
        return;
      }

      window.localStorage.setItem('sportportal:user', JSON.stringify(user));
      if (token) {
        window.localStorage.setItem('sportportal:token', token);
      }

      navigate(targetPath);
    } catch (err) {
      // OWASP: Generieke foutmelding om 'user enumeration' te voorkomen
      setError(err?.message || 'Inloggen mislukt. Controleer je e-mailadres en wachtwoord.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFA = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mfaCode.length !== 6) {
        setError('Ongeldige MFA code.');
        return;
      }

      if (!challengeToken) {
        setError('MFA sessie is verlopen. Log opnieuw in.');
        setStep(1);
        return;
      }

      const result = await authApi.verifyMfa({
        challengeToken,
        otp: mfaCode,
      });

      const rawUser = result?.user || { email: email.trim().toLowerCase(), role: 'customer' };
      const user = { ...rawUser, role: normalizeRole(rawUser.role) };
      const token = result?.accessToken || result?.token || '';

      if (requiredRole && user.role !== requiredRole) {
        window.localStorage.removeItem('sportportal:user');
        window.localStorage.removeItem('sportportal:token');
        setError('Je account heeft geen admin rechten.');
        return;
      }

      window.localStorage.setItem('sportportal:user', JSON.stringify(user));
      if (token) {
        window.localStorage.setItem('sportportal:token', token);
      }

      navigate(targetPath);
    } catch (err) {
      setError(err?.message || 'MFA verificatie mislukt. Probeer het opnieuw.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`login-container ${isAdminLogin ? 'admin-login' : ''}`}>
      <div className="falling-lines" aria-hidden="true">
        {fallingLines.map((line) => (
          <span
            key={line.id}
            className="line"
            style={{
              left: line.left,
              animationDelay: line.delay,
              animationDuration: line.duration,
            }}
          />
        ))}
      </div>
      <div className="login-box">
        {isAdminLogin && <div className="admin-badge">Restricted Access</div>}
        <h2 className="login-title">{title}</h2>
        <p className="login-subtitle">
          {isAdminLogin
            ? 'Alleen voor beheerders. Activiteit wordt gelogd en beveiligd met MFA.'
            : 'Log in op je account en ga verder waar je gebleven was.'}
        </p>
        {error && (
          <div className="login-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleLogin} className="login-form" aria-busy={isLoading}>
            <div className="form-group">
              <label htmlFor="email">E-mailadres</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder={isAdminLogin ? 'admin@voorbeeld.nl' : 'sporter@voorbeeld.nl'}
                aria-invalid={Boolean(error)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Wachtwoord</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                minLength={8}
                aria-invalid={Boolean(error)}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Bezig met inloggen...' : 'Inloggen'}
            </button>
            {requiredRole ? (
              <div className="auth-link">
                <Link to="/login">Naar normale login</Link>
              </div>
            ) : (
              <div className="auth-link">
                <Link to="/register">Nog geen account? Registreer.</Link>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleMFA} className="login-form" aria-busy={isLoading}>
            <p className="mfa-instructions">
              Voer de 6-cijferige code in vanuit je authenticator app.
            </p>
            <div className="form-group">
              <label htmlFor="mfaCode">Authenticatie Code</label>
              <input
                type="text"
                id="mfaCode"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))} // Filter non-digits
                required
                maxLength="6"
                autoComplete="one-time-code"
                inputMode="numeric"
                placeholder="123456"
                pattern="[0-9]{6}"
                aria-invalid={Boolean(error)}
              />
            </div>
            <div className="mfa-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setStep(1);
                  setChallengeToken('');
                  setMfaCode('');
                }}
              >
                Terug
              </button>
              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? 'Verifiëren...' : 'Bevestig Code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginForm;