# Backend Endpoints Prompt - Admin Panel & Trainer Dashboard

Dit document beschrijft alle API endpoints die benodigd zijn voor het Admin Panel en Trainer Dashboard. Deze endpoints vervangen de mock data in het frontend.

## Admin Panel Endpoints

### 1. GET `/api/admin/overview`
**Doel**: Haalt overview statistieken op voor het admin dashboard

**Response (200 OK)**:
```json
{
  "totalUsers": 148,
  "activeLessons": 12,
  "votesToday": 67,
  "mfaEnabled": 83
}
```

### 2. GET `/api/admin/users`
**Doel**: Haalt alle gebruikers op met hun details

**Response (200 OK)**:
```json
[
  {
    "id": "u-101",
    "name": "Noah van Dijk",
    "email": "noah@sportportal.nl",
    "role": "member",
    "mfaEnabled": true,
    "status": "active"
  },
  {
    "id": "u-102",
    "name": "Mila Jansen",
    "email": "mila@sportportal.nl",
    "role": "coach",
    "mfaEnabled": false,
    "status": "active"
  }
]
```

**Mogelijke status waarden**: `active`, `pending`, `inactive`, `suspended`
**Mogelijke role waarden**: `member`, `coach`, `trainer`, `admin`

### 3. GET `/api/admin/activities`
**Doel**: Haalt alle activiteiten/lessen op

**Response (200 OK)**:
```json
[
  {
    "id": "a-21",
    "title": "Neon Night Run",
    "coach": "Mila Jansen",
    "capacity": 25,
    "enrolled": 21,
    "status": "published"
  },
  {
    "id": "a-22",
    "title": "Power Hyrox Drill",
    "coach": "Mike Bos",
    "capacity": 16,
    "enrolled": 9,
    "status": "draft"
  }
]
```

**Mogelijke status waarden**: `published`, `draft`, `archived`, `cancelled`

### 4. GET `/api/admin/votes`
**Doel**: Haalt stemdata op van huidige dag

**Response (200 OK)**:
```json
[
  {
    "id": "v-91",
    "activity": "Zaalvoetbal",
    "votes": 39,
    "trend": "+7%"
  },
  {
    "id": "v-92",
    "activity": "Padel Mix",
    "votes": 25,
    "trend": "+3%"
  }
]
```

### 5. PATCH `/api/admin/activities/{activityId}/status`
**Doel**: Update de status van een activiteit (bijv. publish/unpublish)

**Request Body**:
```json
{
  "status": "published"
}
```

**Response (200 OK)**:
```json
{
  "id": "a-21",
  "title": "Neon Night Run",
  "status": "published"
}
```

### 6. POST `/api/admin/users/{userId}/approve`
**Doel**: Keurt een pending gebruiker goed (status verandert van 'pending' naar 'active')

**Request Body**: (leeg)

**Response (200 OK)**:
```json
{
  "id": "u-103",
  "name": "Bram Peters",
  "status": "active"
}
```

---

## Trainer Dashboard Endpoints

### 1. GET `/api/trainer/sessions`
**Doel**: Haalt alle trainingen/sessies op van de huidige trainer

**Response (200 OK)**:
```json
[
  {
    "id": "tr-1",
    "title": "HIIT Fundamentals",
    "date": "Dinsdag 19:00",
    "location": "Zaal 2",
    "participants": ["Noah", "Mila", "Bram", "Lina"]
  },
  {
    "id": "tr-2",
    "title": "Padel Technique",
    "date": "Donderdag 18:30",
    "location": "Baan 3",
    "participants": ["Tobias", "Sara", "Ruben"]
  }
]
```

**Vereiste**: Authenticated request (bearer token in Authorization header)

### 2. POST `/api/trainer/sessions`
**Doel**: Creëert een nieuwe trainings/les sessie

**Request Body**:
```json
{
  "title": "Nieuwe training",
  "date": "Vrijdag 17:30",
  "location": "Studio 1"
}
```

**Response (201 Created)**:
```json
{
  "id": "tr-new",
  "title": "Nieuwe training",
  "date": "Vrijdag 17:30",
  "location": "Studio 1",
  "participants": []
}
```

### 3. GET `/api/trainer/sessions/{sessionId}/participants`
**Doel**: Haalt alle deelnemers van een specifieke sessie op

**Response (200 OK)**:
```json
{
  "sessionId": "tr-1",
  "sessionTitle": "HIIT Fundamentals",
  "participants": [
    {
      "name": "Noah",
      "email": "noah@sportportal.nl"
    },
    {
      "name": "Mila",
      "email": "mila@sportportal.nl"
    }
  ]
}
```

---

## Algemene Richtlijnen

### Authentication
- Alle requests moeten voorzien zijn van een `Authorization: Bearer <token>` header
- Het token wordt opgeslagen in `localStorage` onder key `sportportal:token`

### Error Handling
Bij errors kunnen de volgende HTTP status codes gebruikt worden:
- `400 Bad Request` - Ongeldige input
- `401 Unauthorized` - Token ontbreekt of is ongeldig
- `403 Forbidden` - Gebruiker heeft geen toestemming
- `404 Not Found` - Resource niet gevonden
- `500 Internal Server Error` - Server fout

Error response format:
```json
{
  "error": "Foutbeschrijving",
  "message": "Details over wat er fout ging"
}
```

### Response Format
- Alle responses moeten JSON zijn
- `Content-Type: application/json`

### API Base URL
- Frontend verwacht de API op het pad dat geconfigureerd is via `VITE_API_BASE_URL`
- Default: `/api` (relativo pad, proxy via nginx/vite)

---

## Frontend Implementation

De frontend implementatie:
- Alle API calls gaan via `src/services/apiClient.js`
- Mock data wordt gebruikt als fallback wanneer API calls falen
- Error messages worden displayed aan de admin/trainer
- Data wordt gecacht tot refresh of Apollo cache update
