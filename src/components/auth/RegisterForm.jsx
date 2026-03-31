import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/apiClient';
import './LoginForm.css';
import './RegisterForm.css';

const calculateStrength = (value) => {
  let score = 0;
  if (!value) return 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
};

const RegisterForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const strength = useMemo(() => calculateStrength(password), [password]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    const normalizedEmail = email.trim().toLowerCase();

    if (strength < 3) {
      setError('Kies een sterker wachtwoord (min. 8 tekens, incl. hoofdletter en cijfer).');
      return;
    }
    if (!normalizedEmail) {
      setError('Vul een geldig e-mailadres in.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.register({
        email: normalizedEmail,
        password,
      });
      navigate('/login');
    } catch (err) {
      setError(err?.message || 'Registratie mislukt. Probeer het later opnieuw.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthLabel = () => {
    switch (strength) {
      case 0: return '';
      case 1: return 'Zwak';
      case 2: return 'Matig';
      case 3: return 'Sterk';
      case 4: return 'Zeer Sterk';
      default: return '';
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Account Aanmaken</h2>
        {error && (
          <div className="login-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="login-form" aria-busy={isLoading}>
          <div className="form-group">
            <label htmlFor="email">E-mailadres</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="sporter@voorbeeld.nl"
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
              autoComplete="new-password"
              placeholder="Minimaal 8 tekens"
              minLength={8}
              aria-describedby="password-help password-strength-label"
              aria-invalid={Boolean(error)}
            />
            <small id="password-help" className="password-help">
              Gebruik minstens 8 tekens met hoofdletters, cijfers en liefst een speciaal teken.
            </small>
            {password && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[1, 2, 3, 4].map((level) => (
                    <span
                      key={level} 
                      className={`strength-bar ${strength >= level ? `active-${strength}` : ''}`}
                    />
                  ))}
                </div>
                <span id="password-strength-label" className="strength-label" aria-live="polite">
                  {getStrengthLabel()}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Bevestig Wachtwoord</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Herhaal wachtwoord"
              minLength={8}
              aria-invalid={Boolean(error)}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Bezig met registreren...' : 'Registreer'}
          </button>
        </form>
        
        <div className="auth-link">
          <Link to="/login">Al een account? Log in.</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;