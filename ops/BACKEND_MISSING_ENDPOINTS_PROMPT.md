# Prompt: ontbrekende SportPortal API endpoints implementeren

Gebruik deze prompt letterlijk op de backend server/repo (10.10.10.21).

---

Je bent senior Node.js/Express backend engineer.

## Context
- Frontend draait op `https://sportportal.kstouthart.nl` en proxyt `/api/*` naar backend `http://10.10.10.21:3000`.
- Bestaande backend routes die al werken:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/mfa/verify`
  - `POST /api/auth/mfa/setup/start`
  - `POST /api/auth/mfa/setup/confirm`
  - `POST /api/auth/mfa/disable`
  - `GET /api/customer/profile`
  - `GET /api/me`
- Frontend verwacht extra routes die nu 404 geven.

## Doel
Implementeer onderstaande ontbrekende endpoints in dezelfde Express app, met JWT auth waar nodig.

## Auth
- Gebruik dezelfde `authenticateToken` middleware als bestaande protected routes.
- Voor alle protected routes: bij ontbrekende/ongeldige token -> `401` JSON.

## Ontbrekende endpoints die MOETEN werken

### Customer
1. `GET /api/customer/categories`
- Auth vereist
- Response:
```json
[
  { "id": "kracht", "name": "Krachttraining", "joined": true },
  { "id": "yoga", "name": "Yoga", "joined": false }
]
```

2. `PATCH /api/customer/categories/:categoryId`
- Auth vereist
- Body:
```json
{ "joined": true }
```
- Response: updated category object

3. `GET /api/customer/lessons/my`
- Auth vereist
- Response: array van lessen waar user op ingeschreven is

4. `GET /api/customer/lessons/available`
- Auth vereist
- Response: array van beschikbare lessen

5. `POST /api/customer/lessons/:lessonId/subscribe`
- Auth vereist
- Response: `{ "success": true }` (of lesson object)

6. `POST /api/customer/lessons/:lessonId/unsubscribe`
- Auth vereist
- Response: `{ "success": true }`

### Trainer
7. `GET /api/trainer/sessions`
- Auth vereist
- Alleen roles `trainer` en `admin`

8. `POST /api/trainer/sessions`
- Auth vereist
- Alleen roles `trainer` en `admin`
- Body:
```json
{ "title": "Bootcamp", "date": "2026-04-10T18:00:00Z", "location": "Zaal 1" }
```

9. `GET /api/trainer/sessions/:sessionId/participants`
- Auth vereist
- Alleen roles `trainer` en `admin`

### Voting
10. `GET /api/voting/overview`
- Auth vereist
- Response voorbeeld:
```json
{
  "options": [
    { "id": "zaalvoetbal", "title": "Zaalvoetbal", "votes": 4 },
    { "id": "padel", "title": "Padel Mix", "votes": 3 }
  ],
  "userVote": "padel"
}
```

11. `POST /api/voting/vote`
- Auth vereist
- Body:
```json
{ "optionId": "padel" }
```
- Response: `{ "success": true }`

### Admin
12. `GET /api/admin/overview`
- Auth vereist
- Alleen role `admin`

13. `GET /api/admin/users`
- Auth vereist
- Alleen role `admin`

14. `GET /api/admin/activities`
- Auth vereist
- Alleen role `admin`

15. `GET /api/admin/votes`
- Auth vereist
- Alleen role `admin`

16. `PATCH /api/admin/activities/:activityId/status`
- Auth vereist
- Alleen role `admin`
- Body: `{ "status": "approved" }`

17. `POST /api/admin/users/:userId/approve`
- Auth vereist
- Alleen role `admin`

## Vereisten
- Geen HTML error pages voor API routes; altijd JSON errors.
- Gebruik consistente JSON shape:
```json
{ "success": false, "error": "..." }
```
- Status codes:
  - `200/201` success
  - `400` validatie
  - `401` auth
  - `403` role forbidden
  - `404` resource not found
  - `500` internal

## Data-opslag
Gebruik bestaande database (PostgreSQL). Voeg migraties toe waar nodig voor:
- lessons
- lesson_subscriptions
- categories
- user_categories
- voting_options
- votes
- trainer_sessions
- trainer_session_participants

## Opleveren
1. Volledige endpoint implementatie in backend code.
2. DB migraties + seed data voor test.
3. Korte test-output van deze commando's:
```bash
curl -i http://localhost:3000/health
curl -i -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"smoke@example.com","password":"Demo@12345"}'
# login en token ophalen
# daarna met Authorization: Bearer <TOKEN>
curl -i http://localhost:3000/api/customer/lessons/available
curl -i -X POST http://localhost:3000/api/customer/lessons/2/subscribe -H "Authorization: Bearer <TOKEN>"
curl -i http://localhost:3000/api/voting/overview -H "Authorization: Bearer <TOKEN>"
curl -i -X POST http://localhost:3000/api/voting/vote -H "Authorization: Bearer <TOKEN>" -H 'Content-Type: application/json' -d '{"optionId":"padel"}'
```
4. Update README met volledige route lijst.

---

Extra: als je endpointnamen anders wilt houden, lever dan een mappingstabel frontend->backend en zorg dat frontend compatibel wordt bijgewerkt.
