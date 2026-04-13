# SportPortal URL Overzicht

Dit bestand toont welke routes users kunnen bereiken en onder welke voorwaarden.

## Publiek

- `/` -> redirect naar `/login`
- `/login` -> user login (incl. MFA stap als backend dit vereist)
- `/admin-login` -> admin login (incl. MFA stap)
- `/register` -> account aanmaken

## Ingelogde users

- `/dashboard` -> dashboard
- `/account` -> profiel + categorieen + MFA setup/disable
- `/activiteiten` -> stempagina

## Rol-gebaseerd

- `/trainer` -> alleen rollen `trainer` en `admin`
- `/admin` -> alleen rol `admin`

## Fallback

- `*` -> redirect naar `/login`

## Navigatie in UI

Topnavigatie toont op basis van rol:
- Altijd: Dashboard, Profiel, Stempagina
- Alleen trainer/admin: Trainer
- Alleen admin: Admin
