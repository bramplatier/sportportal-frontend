# Backend Fix Prompt - Voting werkt niet (SportPortal)

Doel: fix de voting endpoints zodat stemmen echt worden opgeslagen en direct terugkomen in de frontend.
Frontend is aangepast naar strict backend-driven gedrag zonder mock/fallback data.

## Waar de frontend naar luistert

Frontend API client (bron): src/services/apiClient.js

- GET /api/voting/overview
- POST /api/voting/vote

Frontend voting pagina (bron): src/components/voting/VotingPage.jsx

Belangrijk:
- Geen lokale fallback data meer.
- Geen "optimistic" fake increment meer.
- Na POST /api/voting/vote haalt frontend direct opnieuw GET /api/voting/overview op.
- Als payload ongeldig is of endpoint faalt, toont frontend alleen:
  "Er is iets misgegaan. Neem contact op met de systeembeheerder."

## Vereiste contracten

### 1) GET /api/voting/overview

Response moet altijd JSON object zijn met minimaal:

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

Validatie-eisen backend:
- options moet een array zijn (leeg mag: []).
- votes moet een object/map zijn (leeg mag: {}).
- deadline mag null zijn.
- userVote mag null zijn.
- keys in votes moeten overeenkomen met option ids.

### 2) POST /api/voting/vote

Request body:
{
  "optionId": "opt-padel"
}

Gedrag backend:
- check dat optionId bestaat in actieve poll.
- stem upserten voor ingelogde gebruiker (max 1 stem per actieve poll).
- idempotent op herhaald stemmen op dezelfde optie.
- als gebruiker naar andere optie switcht, oude stem vervangen.

Response:
- 200 met status body of 204 zonder body is beide ok.
- bij fout altijd nette JSON error met message.

## Waarom stemmen nu mogelijk "niet werken"

Waarschijnlijke oorzaken:
- overview payload mist options of votes in juiste shape.
- optionId uit frontend matcht niet met option ids in actieve poll.
- vote endpoint schrijft wel, maar overview leest uit andere tabel/scope (inconsistent read model).
- deadline/state logic markeert poll als gesloten terwijl backend nog open toont (of andersom).

## Debug checklist backend

1. Log op POST /api/voting/vote:
- user id
- actieve poll id
- ontvangen optionId
- resultaat (insert/update)

2. Log op GET /api/voting/overview:
- user id
- actieve poll id
- options count
- votes map
- userVote

3. Verifieer database consistency:
- 1 actieve poll context voor overview
- poll_options ids exact gelijk aan vote optionId values
- userVote teruggegeven uit dezelfde poll

## Error contract

Bij fouten altijd:
{
  "error": "SOME_CODE",
  "message": "Duidelijke foutmelding"
}

Statuscodes:
- 400 ongeldige input (bijv. onbekende optionId)
- 401 niet ingelogd
- 403 geen stemrecht
- 404 actieve poll/optie niet gevonden
- 409 conflict in stemstatus
- 500 onverwachte serverfout

## Samenvatting voor backend team

"Frontend luistert uitsluitend naar GET /api/voting/overview en POST /api/voting/vote.
Er is geen mock/fallback data meer. Als jullie responses niet exact de juiste shape hebben, toont frontend direct een foutmelding in plaats van data.
Fix daarom eerst contract-consistentie van options, votes, userVote en stem-upsert gedrag."