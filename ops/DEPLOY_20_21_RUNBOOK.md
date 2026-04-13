# Deploy Runbook (Frontend 10.10.10.20 -> Backend 10.10.10.21)

Doel: backend API extern bereikbaar op poort 3000 en frontend gekoppeld aan die API.

## 1. Backend server (10.10.10.21)

### 1.1 Inloggen en naar project

```bash
ssh user@10.10.10.21
cd /home/pindakaas/backend
```

### 1.2 Environment instellen

In .env moet minimaal staan:

```env
PORT=3000
NODE_ENV=production
DATABASE_URL=...
JWT_SECRET=...
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
NTP_SYNC_OK=true
```

Opmerking:
- ENCRYPTION_KEY moet exact 64 hex tekens zijn.

### 1.3 Starten op netwerkinterface

Stop eerst oud proces (als nodig):

```bash
lsof -i :3000
# noteer PID en stop die:
kill <PID>
```

Start daarna:

```bash
HOST=0.0.0.0 PORT=3000 npm start
```

### 1.4 Lokaal testen op backend server

```bash
curl -i http://localhost:3000/health
curl -i -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"probe2@example.com","password":"Demo@12345"}'
```

Verwacht:
- /health geeft 200
- /api/auth/register geeft 200/201 of functionele fout (geen 404)

### 1.5 Firewall openzetten (indien nodig)

```bash
sudo ufw allow from 10.10.10.20 to any port 3000 proto tcp
sudo ufw status
```

## 2. Frontend server (10.10.10.20)

### 2.1 Inloggen en naar frontend

```bash
ssh user@10.10.10.20
cd /home/pindakaas/sportportal
```

### 2.2 Frontend environment

In .env (of .env.production) zetten:

```env
VITE_API_BASE_URL=http://10.10.10.21:3000
```

Belangrijk:
- Geen /api toevoegen in VITE_API_BASE_URL.

### 2.3 Frontend opnieuw bouwen/starten

```bash
npm install
npm run build
# of voor dev:
npm run dev
```

### 2.4 End-to-end check vanaf frontend server

```bash
curl -i http://10.10.10.21:3000/health
curl -i -X POST http://10.10.10.21:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"frontend-probe@example.com","password":"Demo@12345"}'
```

## 3. Probleemoplossing

Als register nog 404 geeft:
- Controleer of backend echt route POST /api/auth/register exposeert.
- Controleer of backend process draait op 0.0.0.0:3000.
- Controleer firewall rule en netwerkroute tussen 10.10.10.20 en 10.10.10.21.
- Controleer dat frontend VITE_API_BASE_URL naar 10.10.10.21:3000 wijst.

Als health wel werkt maar register niet:
- Auth routes niet geladen of ander base path op backend.
- Controleer backend startup logs op route mounting.
