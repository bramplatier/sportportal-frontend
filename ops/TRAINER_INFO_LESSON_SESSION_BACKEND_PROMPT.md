# Backend Prompt - Trainerinfo meesturen bij Lessons/Sessions

Doel: stuur in alle lesson/session responses expliciet trainerinformatie mee, zodat frontend naast locatie ook trainernaam en tijd kan tonen.

## Scope endpoints

1. GET /api/customer/lessons/available
2. GET /api/customer/lessons/my
3. GET /api/trainer/sessions
4. (optioneel consistent) GET /api/admin/activities

## Vereiste responsevelden per item

Voeg per lesson/session item toe (backward compatible, bestaande velden blijven):
- trainerId: string | null
- trainerName: string
- time: string | null (HH:mm, afgeleid van starts_at/session_date indien geen expliciet time veld)

Fallback regels:
- trainerName fallback altijd "Onbekend" als geen bruikbare naam beschikbaar is
- time = null als niet af te leiden

## Voorbeeld gewenst item

{
  "id": "uuid",
  "title": "Neon Night Run",
  "date": "2026-04-23T09:21:54.275Z",
  "time": "11:21",
  "location": "Buitenbaan",
  "trainerId": "uuid-or-null",
  "trainerName": "Mila Jansen"
}

## Implementatie-eisen

### SQL/JOIN logica lessons endpoints

Gebruik trainer-resolutie via:
- COALESCE(lessons.trainer_id, lessons.created_by)

Join naar users op resolved trainer id.

Pseudo-SQL:

SELECT
  l.id,
  l.title,
  l.starts_at AS date,
  TO_CHAR(l.starts_at, 'HH24:MI') AS time,
  l.location,
  COALESCE(l.trainer_id, l.created_by) AS trainer_id,
  COALESCE(
    NULLIF(u.name, ''),
    NULLIF(split_part(u.email, '@', 1), ''),
    'Onbekend'
  ) AS trainer_name,
  ... bestaande velden ...
FROM lessons l
LEFT JOIN users u ON u.id = COALESCE(l.trainer_id, l.created_by)
...

### SQL/JOIN logica trainer sessions endpoint

Join trainer_sessions.created_by naar users voor trainerName.

Pseudo-SQL:

SELECT
  s.id,
  s.title,
  s.session_date AS date,
  TO_CHAR(s.session_date, 'HH24:MI') AS time,
  s.location,
  s.created_by AS trainer_id,
  COALESCE(
    NULLIF(u.name, ''),
    NULLIF(split_part(u.email, '@', 1), ''),
    'Onbekend'
  ) AS trainer_name,
  ... bestaande velden ...
FROM trainer_sessions s
LEFT JOIN users u ON u.id = s.created_by
...

### Admin activities endpoint (optioneel maar aanbevolen)

Zelfde velden toevoegen voor consistentie:
- trainerId
- trainerName
- time

## Backward compatibility (verplicht)

- Bestaande velden blijven exact aanwezig.
- Geen breaking rename van bestaande keys.
- Nieuwe velden alleen toevoegen.

## Auth en regressie-eis

- Geen wijziging aan auth-flow tenzij strikt noodzakelijk.
- Bestaande rechten op endpoints moeten gelijk blijven.
- Geen 401/403 regressies op dashboard calls.

## Acceptatiecriteria

1. Trainer ziet in dashboard per les/sessie:
- tijd
- locatie
- trainernaam

2. Responses blijven 200 voor geldige rollen:
- customer/trainer/admin waar van toepassing

3. Unit/smoke test minimaal voor:
- les met trainer_id
- les zonder trainer_id maar met created_by
- les zonder beide (trainerName fallback = "Onbekend")

## Test checklist backend

1. GET /api/customer/lessons/available bevat trainerId/trainerName/time
2. GET /api/customer/lessons/my bevat trainerId/trainerName/time
3. GET /api/trainer/sessions bevat trainerId/trainerName/time
4. (optioneel) GET /api/admin/activities bevat trainerId/trainerName/time
5. trainerName fallback werkt correct op alle varianten
6. bestaande clients breken niet op response shape

## Samenvatting voor backend team

"Frontend is aangepast om trainerName/trainerId/time te lezen, met backward compatibility. Voeg deze velden toe op lessons/sessions endpoints via COALESCE join naar users en behoud alle bestaande velden en auth-gedrag."