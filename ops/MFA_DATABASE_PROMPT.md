# Prompt: MFA + Database end-to-end compatibel maken

Gebruik onderstaande prompt letterlijk richting je database/backend team of AI assistant.

---

Je bent een senior backend + database engineer.

Context:
- Frontend verwacht een 2-staps login met MFA.
- Project gebruikt TOTP (6-cijferige codes) via authenticator app.
- MFA moet werken voor alle users (niet alleen admin).
- Maak API responses compatibel met zowel camelCase als snake_case waar mogelijk.

## Doel
Implementeer een veilige MFA flow met database-ondersteuning en onderstaande endpoint-contracten.

## Vereiste database wijzigingen
Maak migraties voor deze tabellen/kolommen:

1. users
- id (uuid, pk)
- email (varchar unique, lowercase indexed)
- password_hash (text)
- role (varchar)
- mfa_enabled (boolean default false)
- mfa_secret_encrypted (text nullable)
- mfa_secret_iv (text nullable)
- mfa_setup_pending (boolean default false)
- failed_login_attempts (int default 0)
- lock_until (timestamp nullable)
- created_at (timestamp)
- updated_at (timestamp)

2. auth_challenges
- id (uuid, pk)
- user_id (uuid fk users.id)
- challenge_token_hash (text unique)
- purpose (varchar) // LOGIN_MFA or MFA_SETUP
- expires_at (timestamp)
- consumed_at (timestamp nullable)
- created_at (timestamp)

3. user_recovery_codes
- id (uuid, pk)
- user_id (uuid fk users.id)
- code_hash (text)
- used_at (timestamp nullable)
- created_at (timestamp)

4. auth_audit_log
- id (uuid, pk)
- user_id (uuid nullable)
- event_type (varchar)
- ip_address (varchar)
- user_agent (text)
- created_at (timestamp)

## Security vereisten
- Wachtwoorden met Argon2id hashen.
- MFA secret alleen encrypted opslaan (AES-256-GCM).
- Nooit otp/secrets loggen.
- Rate limiting op login, mfa verify, mfa setup confirm, mfa disable.
- Lockout/backoff bij brute force.
- Challenge tokens max 5 minuten geldig, eenmalig te gebruiken.
- NTP tijdsync verplicht voor correcte TOTP validatie.

## API contracten

### 1) POST /api/auth/login
Input:
- email
- password

Response zonder MFA:
- success: true
- accessToken (of session cookie)
- user

Response met MFA:
- success: true
- mfaRequired: true
- challengeToken

Compatibiliteit: stuur optioneel ook snake_case velden terug:
- mfa_required
- challenge_token

### 2) POST /api/auth/mfa/verify
Input accepteert:
- challengeToken of challenge_token
- otp of code of token

Response:
- success: true
- accessToken (of session cookie)
- user

### 3) POST /api/auth/mfa/setup/start
Auth vereist.

Actie:
- Genereer TOTP secret.
- Sla encrypted secret op als pending.
- Genereer setup challenge token voor confirm-stap.

Response (minimaal een van QR/URI + secret):
- setupToken (en optioneel setup_token)
- qrImageUrl (of qr_image_url / qrCodeDataUrl)
- otpAuthUri (of otpauth_uri / otpauth_url)
- secret (of manualEntryKey / manual_entry_key)

### 4) POST /api/auth/mfa/setup/confirm
Auth vereist.

Input accepteert:
- setupToken of setup_token
- otp of code of token

Actie:
- Verifieer TOTP.
- Zet mfa_enabled = true.
- Zet pending uit.

Response:
- success: true
- mfaEnabled: true (optioneel ook mfa_enabled)

### 5) POST /api/auth/mfa/disable
Auth vereist + geldige otp.

Input accepteert:
- otp of code of token

Actie:
- Verifieer otp.
- Zet mfa_enabled = false.
- Verwijder/invalidatie secret en open challenges.

Response:
- success: true
- mfaEnabled: false (optioneel ook mfa_enabled)

### 6) GET /api/customer/profile
Voeg MFA status toe zodat frontend accountpagina juist toont:
- mfaEnabled (optioneel ook mfa_enabled)

## Validatiecriteria
- User met MFA aan: login geeft eerst challengeToken, daarna pas sessie/token na /mfa/verify.
- User met MFA uit: login geeft direct sessie/token.
- Setup flow werkt: start -> scan -> confirm -> mfa_enabled true.
- Disable flow werkt met geldige otp.
- Foute otp geeft veilige generieke foutmelding.
- Alle MFA-gerelateerde acties staan in audit log.

Lever op:
- SQL migraties
- backend endpoint implementatie
- korte testcases (happy flow + fout flow)
