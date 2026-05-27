# Backend Prompt - Rollen en Rechten SportPortal

Doel: Implementeer backend endpoints en autorisatie voor drie rollen: klant, trainer, beheerder.
De frontend is bijgewerkt naar capability-based toegang en verwacht onderstaande contracten.

## 1. Autorisatie model

Rollen:
- customer
- trainer
- admin

JWT claims minimaal:
- sub (user id)
- role
- email

Middelware:
- authenticate: valideert bearer token
- authorizeRole(roles[]): laat alleen opgegeven rollen toe
- authorizeCapability(capability): optioneel als capabilities server-side worden gebruikt

Belangrijk:
- Trainer mag nooit admin endpoints kunnen aanroepen
- Customer mag nooit trainer/admin endpoints kunnen aanroepen
- Admin mag alle admin endpoints aanroepen

## 2. Klant endpoints

GET /api/customer/profile
- Rollen: customer, admin
- Response:
  {
    "id": "u-100",
    "email": "lid@sportportal.nl",
    "role": "customer",
    "fullName": "Voornaam Achternaam",
    "memberSince": "2024",
    "city": "Rotterdam",
    "mfaEnabled": true
  }

GET /api/customer/categories
- Rollen: customer, admin
- Response: array
  [
    { "id": "kracht", "label": "Krachttraining", "joined": true }
  ]

PATCH /api/customer/categories/:categoryId
- Rollen: customer, admin
- Body:
  { "joined": true }
- Response:
  {
    "id": "kracht",
    "label": "Krachttraining",
    "joined": true
  }
- Opmerking:
  - Frontend verwacht velden in een van deze vormen:
    - id of categoryId of slug
    - label of name of title
    - joined of isJoined of is_joined
  - Gebruik bij voorkeur: id, label, joined

GET /api/customer/lessons/my
- Rollen: customer, admin
- Per item (nieuw, backward compatible):
  - trainerId: string | null
  - trainerName: string (fallback "Onbekend")
  - time: string | null (HH:mm)

GET /api/customer/lessons/available
- Rollen: customer, admin
- Per item (nieuw, backward compatible):
  - trainerId: string | null
  - trainerName: string (fallback "Onbekend")
  - time: string | null (HH:mm)

POST /api/customer/lessons/:lessonId/subscribe
- Rollen: customer, admin

POST /api/customer/lessons/:lessonId/unsubscribe
- Rollen: customer, admin

GET /api/voting/overview
- Rollen: customer, trainer, admin
- Doel: data voor de stempagina
- Response voorbeeld:
  {
    "options": [
      {
        "id": "opt-zaalvoetbal",
        "title": "Zaalvoetbal",
        "location": "Sporthal Centrum",
        "time": "Woensdag 20:00",
        "players": "10-14 spelers"
      }
    ],
    "votes": {
      "opt-zaalvoetbal": 12,
      "opt-padel": 8
    },
    "deadline": "2026-05-01T18:00:00Z",
    "userVote": "opt-padel"
  }

POST /api/voting/vote
- Rollen: customer, trainer, admin
- Body:
  { "optionId": "opt-padel" }
- Gedrag:
  - upsert stem van gebruiker (een gebruiker heeft maximaal 1 actieve stem per poll)
  - retourneer 200 of 204

## 3. Trainer endpoints

GET /api/trainer/sessions
- Rollen: trainer, admin
- Response: array van sessies
  [
    {
      "id": "tr-1",
      "title": "HIIT Fundamentals",
      "date": "Dinsdag 19:00",
      "time": "19:00",
      "location": "Zaal 2",
      "trainerId": "u-200",
      "trainerName": "Mila Jansen",
      "participants": ["Noah", "Mila"]
    }
  ]

POST /api/trainer/sessions
- Rollen: trainer, admin
- Body:
  {
    "title": "Nieuwe training",
    "date": "Vrijdag 17:30",
    "location": "Studio 1"
  }

PATCH /api/trainer/sessions/:sessionId
- Rollen: trainer, admin
- Body:
  {
    "title": "Aangepaste titel",
    "date": "Woensdag 19:00",
    "location": "Zaal 3"
  }
- Alleen eigenaar-trainer of admin mag updaten

GET /api/trainer/sessions/:sessionId/participants
- Rollen: trainer, admin
- Alleen eigenaar-trainer of admin

GET /api/trainer/polls
- Rollen: trainer, admin
- Doel: alle polls zichtbaar voor trainer-dashboard
- Response voorbeeld:
  [
    {
      "id": "poll-1",
      "title": "Activiteit van de week",
      "description": "Kies de activiteit voor vrijdag",
      "closesAt": "2026-05-01T18:00:00Z",
      "isActive": true,
      "totalVotes": 18,
      "options": [
        { "id": "opt-1", "title": "Zaalvoetbal" },
        { "id": "opt-2", "title": "Padel Mix" }
      ]
    }
  ]

POST /api/trainer/polls
- Rollen: trainer, admin
- Doel: nieuwe poll aanmaken vanuit trainer-dashboard
- Body voorbeeld:
  {
    "title": "Activiteit van de week",
    "description": "Optionele toelichting",
    "closesAt": "2026-05-01T18:00:00Z",
    "options": ["Zaalvoetbal", "Padel Mix", "Bootcamp"]
  }
- Validatie:
  - title verplicht
  - minimaal 2 opties
- Response:
  {
    "id": "poll-2",
    "title": "Activiteit van de week",
    "description": "Optionele toelichting",
    "closesAt": "2026-05-01T18:00:00Z",
    "totalVotes": 0,
    "options": [
      { "id": "opt-a", "title": "Zaalvoetbal" },
      { "id": "opt-b", "title": "Padel Mix" }
    ]
  }

GET /api/trainer/polls/:pollId/votes
- Rollen: trainer, admin
- Doel: inzien wie gestemd heeft en waarop
- Response voorbeeld:
  {
    "pollId": "poll-1",
    "voters": [
      {
        "id": "vote-11",
        "userName": "Noah van Dijk",
        "optionTitle": "Padel Mix",
        "votedAt": "2026-04-20T18:43:00Z"
      }
    ]
  }

DELETE /api/trainer/polls/:pollId
- Rollen: trainer, admin
- Doel: poll verwijderen vanuit trainer-dashboard
- Rechten:
  - trainer mag alleen eigen polls verwijderen
  - admin mag alle polls verwijderen
- Response:
  - 204 No Content of 200 met status payload

POST /api/trainer/polls/:pollId/activate
- Rollen: trainer, admin
- Doel: bepaal welke poll zichtbaar is op de stempagina
- Rechten:
  - trainer mag alleen eigen poll actief zetten
  - admin mag elke poll actief zetten
- Gedrag:
  - precies 1 actieve poll tegelijk per club/tenant/context
  - zet gekozen poll op actief
  - zet vorige actieve poll op inactief
- Response:
  {
    "status": "activated",
    "pollId": "poll-1"
  }

## 4. Admin endpoints

GET /api/admin/overview
- Rollen: admin

GET /api/admin/users
- Rollen: admin

POST /api/admin/users
- Rollen: admin
- Doel: nieuwe trainer of admin aanmaken
- Body voorbeeld:
  {
    "name": "Mila Jansen",
    "email": "mila@sportportal.nl",
    "role": "trainer",
    "status": "active",
    "temporaryPassword": "optioneel-als-invite-wordt-gebruikt"
  }
- Toegestane role waarden voor deze endpoint: trainer, admin
- Response:
  {
    "id": "u-200",
    "name": "Mila Jansen",
    "email": "mila@sportportal.nl",
    "role": "trainer",
    "status": "active"
  }
- Aanbevolen backend gedrag:
  - valideer uniqueness van e-mail
  - hash password of verstuur invite-link als temporaryPassword ontbreekt
  - log dit als security/audit event

GET /api/admin/trainers
- Rollen: admin
- Response: array met trainer records
  [
    { "id": "t-1", "name": "Mila Jansen", "email": "mila@sportportal.nl", "role": "trainer" }
  ]

GET /api/admin/activities
- Rollen: admin
- (Aanbevolen consistentie) Per item ook:
  - trainerId: string | null
  - trainerName: string
  - time: string | null

GET /api/admin/votes
- Rollen: admin

PATCH /api/admin/activities/:activityId/status
- Rollen: admin
- Body:
  { "status": "published" }

PATCH /api/admin/activities/:activityId/trainer
- Rollen: admin
- Body:
  { "trainerId": "t-1" }
- Response bevat geupdate activiteit inclusief coach/trainer data

PATCH /api/admin/users/:userId
- Rollen: admin
- Voor profiel/rol/status updates
- Body voorbeeld:
  {
    "role": "trainer",
    "status": "active"
  }
- Toegestane role waarden: customer, trainer, admin
- Toegestane status waarden: active, inactive, suspended
- Gebruik deze endpoint ook om een bestaande customer naar trainer/admin te promoveren of een trainer terug te zetten.

DELETE /api/admin/users/:userId
- Rollen: admin

POST /api/admin/users/:userId/mfa/reset
- Rollen: admin
- Reset MFA secret/challenges voor gebruiker

## 5. Security eisen

- Rate limiting op login en MFA endpoints
- Audit log voor admin-acties:
  - user create
  - user update/delete
  - mfa reset
  - activity status update
  - trainer koppeling
- Input validatie op alle body en path velden
- Eenduidige errors:
  {
    "error": "FORBIDDEN",
    "message": "Geen toegang tot deze resource"
  }

## 6. Database model (minimaal)

users:
- id
- email
- password_hash
- role (customer/trainer/admin)
- status
- mfa_enabled
- mfa_secret (encrypted)

activities:
- id
- title
- capacity
- status
- trainer_id (FK users.id)

sessions:
- id
- trainer_id (FK users.id)
- title
- date_time_text of datetime
- location

session_participants:
- session_id
- user_id

votes:
- id
- activity_id
- user_id
- created_at

polls:
- id
- title
- description
- closes_at
- created_by (FK users.id)

poll_options:
- id
- poll_id
- title

poll_votes:
- id
- poll_id
- option_id
- user_id
- voted_at

categories:
- id
- label

user_categories:
- user_id
- category_id
- joined_at

## 7. Frontend verwachtingen

Frontend gebruikt deze API client methods:
- adminApi.getTrainers
- adminApi.assignTrainerToActivity
- adminApi.updateUser
- adminApi.deleteUser
- adminApi.resetUserMfa
- trainerApi.updateSession
- trainerApi.getPolls
- trainerApi.createPoll
- trainerApi.getPollVoters
- trainerApi.deletePoll
- trainerApi.setActivePoll
- votingApi.getOverview
- votingApi.submitVote

Geen mock fallback in frontend:
- Als data ontbreekt moet backend geldige lege responses geven, niet 500.
- Gebruik voor lege datasets:
  - [] voor lijsten (bijv. polls, sessions, categories)
  - {} voor key-value vote totals
  - null voor optionele waarden zoals deadline of userVote

Alle responses: Content-Type application/json
Gebruik consistente id velden en stuur statuscodes correct terug (200/201/204/400/401/403/404/409/500).
