# Backend Prompt - Actieve Poll voor Stempagina

Doel: trainer moet expliciet kunnen bepalen welke poll zichtbaar is op de stempagina.

## Probleem

Trainer maakt nieuwe polls aan, maar stempagina toont nog oude poll.
Er ontbreekt een endpoint/flow om een poll actief te zetten voor voting overview.

## Vereiste endpoint

### POST /api/trainer/polls/:pollId/activate

Rollen:
- trainer
- admin

Autorisatie:
- trainer mag alleen eigen poll activeren
- admin mag elke poll activeren

Gedrag:
1. Valideer dat poll bestaat.
2. Valideer rechten (owner/admin).
3. Zet gekozen poll op actief.
4. Zet andere polls op inactief binnen dezelfde context (club/tenant).
5. Commit atomisch (transactie).

Response (200):
{
  "status": "activated",
  "pollId": "poll-1"
}

Errors:
- 401 niet ingelogd
- 403 geen rechten
- 404 poll niet gevonden
- 409 conflict (bijv. lock/invalid state)
- 500 serverfout

Error body format:
{
  "error": "SOME_CODE",
  "message": "Duidelijke foutmelding"
}

## GET contracten die hierop moeten aansluiten

### GET /api/trainer/polls
Elke poll bevat:
- id
- title
- description
- closesAt
- isActive (boolean)
- totalVotes
- options

### GET /api/voting/overview
Moet data teruggeven van de actieve poll.
Als er geen actieve poll is:
- options: []
- votes: {}
- deadline: null
- userVote: null

## Database-aanbeveling

In tabel polls:
- is_active boolean

Constraint/regel:
- maximaal 1 actieve poll per club/tenant/context
- afdwingen via unieke partial index of transactionele service-logica

## Testcases backend

1. Trainer activeert eigen poll -> 200 en poll wordt actief
2. Trainer activeert poll van andere trainer -> 403
3. Admin activeert elke poll -> 200
4. Na activatie levert GET /api/voting/overview de nieuwe poll
5. Vorige actieve poll wordt inactief
6. Gelijktijdige activatie blijft consistent (1 actieve poll)

## Samenvatting voor backend team

"Frontend heeft nu knop 'Zet als actieve stempoll'. Implementeer POST /api/trainer/polls/:pollId/activate en zorg dat voting overview altijd de actieve poll toont."