# Backend Prompt - Trainer Poll Verwijderen

Doel: implementeer het delete-endpoint voor polls zodat de trainer dashboard verwijderknop correct werkt.

## Context frontend

Frontend heeft een verwijderknop in het trainer dashboard met een confirm-dialog.
Na bevestiging wordt deze call gedaan:

DELETE /api/trainer/polls/:pollId

Frontend API bron:
- src/services/apiClient.js -> trainerApi.deletePoll({ pollId })

Frontend gedrag bron:
- src/components/trainer/TrainerPage.jsx -> deleteSelectedPoll()

## Endpoint

### DELETE /api/trainer/polls/:pollId

Rollen:
- trainer
- admin

Autorisatie:
- trainer mag alleen eigen polls verwijderen (created_by == current user id)
- admin mag alle polls verwijderen

Response:
- voorkeur: 204 No Content
- alternatief: 200 met payload
  {
    "status": "deleted",
    "pollId": "poll-123"
  }

Errors:
- 401 niet ingelogd
- 403 geen rechten om deze poll te verwijderen
- 404 poll niet gevonden
- 409 poll kan niet verwijderd worden (bijv. lock/business-rule)
- 500 serverfout

Error body format:
{
  "error": "SOME_CODE",
  "message": "Duidelijke foutmelding"
}

## Database gedrag

Tabellen (bestaand model):
- polls
- poll_options
- poll_votes

Verwijderstrategie:
1. Start transactie.
2. Verwijder poll_votes voor poll_id.
3. Verwijder poll_options voor poll_id.
4. Verwijder polls record.
5. Commit.

Opmerking:
- Als FK cascade al correct staat, mag stap 2/3 impliciet via cascade.

## Audit logging

Log event:
- action: poll_delete
- actor_user_id
- poll_id
- timestamp
- result (success/failure)

## Testcases backend

1. trainer verwijdert eigen poll -> 204
2. trainer probeert poll van andere trainer te verwijderen -> 403
3. admin verwijdert poll van trainer -> 204
4. onbekende poll id -> 404
5. na delete komt poll niet meer terug in GET /api/trainer/polls
6. poll_votes/poll_options zijn mee verwijderd of niet meer gekoppeld

## Samenvatting voor backend team

"Frontend ondersteunt nu poll verwijderen met bevestiging. Zorg dat DELETE /api/trainer/polls/:pollId autorisatie op owner/admin toepast en consistent 204/200 teruggeeft met nette JSON errors bij failures."