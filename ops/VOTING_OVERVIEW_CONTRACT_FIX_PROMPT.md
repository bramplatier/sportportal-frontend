# Backend Prompt - Voting Overview Contract Fix (SportPortal)

Doel: fix de response van GET /api/voting/overview zodat de frontend correct werkt zonder fallback.

## Probleem dat nu zichtbaar is

In de frontend zie je:
- "Geen actieve poll beschikbaar" terwijl er wel opties zichtbaar zijn
- Opties tonen "- | - | -"

Dit betekent meestal:
- options worden wel teruggestuurd
- maar deadline/closesAt ontbreekt of is ongeldig
- en velden location/time/players ontbreken per optie

## Endpoint dat gefixt moet worden

### GET /api/voting/overview

Rollen:
- customer
- trainer
- admin

### Verplichte response-structuur

Geef altijd een JSON object terug met exact deze kernvelden:

{
  "options": [
    {
      "id": "opt-zaalvoetbal",
      "title": "Zaalvoetbal",
      "location": "Sporthal Centrum",
      "time": "Woensdag 20:00",
      "players": "10-14 spelers"
    },
    {
      "id": "opt-spinning",
      "title": "Spinning Marathon",
      "location": "Studio 3",
      "time": "Donderdag 19:30",
      "players": "12-18 spelers"
    }
  ],
  "votes": {
    "opt-zaalvoetbal": 12,
    "opt-spinning": 8
  },
  "deadline": "2026-05-01T18:00:00Z",
  "userVote": "opt-spinning"
}

## Contractregels

1. options
- Moet altijd een array zijn (mag leeg zijn: []).
- Elk item moet minimaal bevatten:
  - id
  - title
- Voor correcte UI ook aanleveren:
  - location
  - time
  - players

2. votes
- Moet altijd een object/map zijn (mag leeg zijn: {}).
- Keys moeten overeenkomen met option ids.
- Values moeten integers zijn.

3. deadline
- Moet een geldige ISO datetime string zijn als er een actieve poll is.
- Als er geen actieve poll is: deadline = null.
- Gebruik bij voorkeur veldnaam deadline.

4. userVote
- Optie id waarop de huidige user gestemd heeft, of null.

## POST endpoint (consistentie)

### POST /api/voting/vote

Body:
{
  "optionId": "opt-spinning"
}

Backend gedrag:
- Upsert stem voor de ingelogde gebruiker (1 actieve stem per actieve poll).
- Als user opnieuw op zelfde optie stemt: idempotent verwerken.
- Als user naar andere optie wisselt: oude stem vervangen.

Response:
- 200 of 204
- Bij fout altijd JSON:
  {
    "error": "SOME_CODE",
    "message": "Duidelijke foutmelding"
  }

## Waarom dit nodig is voor huidige frontend

Frontend gebruikt strict backend-driven rendering (geen mock/fallback).
Bij missende velden zie je nu precies deze effecten:
- Geen deadline => "Geen actieve poll beschikbaar"
- Missende option metadata => "- | - | -"

## Implementatie-checklist backend

1. Zorg dat GET /api/voting/overview altijd dezelfde shape terugstuurt.
2. Map databasevelden naar:
- closes_at -> deadline
- option_name/title -> title
- extra metadata -> location/time/players
3. Verifieer dat votes-map keys exact matchen met option ids.
4. Test met een user die al gestemd heeft en een user die nog niet gestemd heeft.

## Verwachte statuscodes

- 200 OK bij succesvolle overview
- 200/204 bij succesvolle vote submit
- 400 bij ongeldige optionId
- 401 bij niet ingelogd
- 403 bij geen stemrecht
- 404 bij geen actieve poll of onbekende optie
- 500 bij serverfout