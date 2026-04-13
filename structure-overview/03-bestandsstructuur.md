# Bestandsstructuur (Website)

Overzicht van de actieve website-structuur in deze workspace.

```text
sportportal/
  src/
    App.jsx
    main.jsx
    components/
      auth/
      account/
      admin/
      dashboard/
      trainer/
      voting/
      layout/
      ui/
    services/
      apiClient.js
    utils/
      auth.js
  public/
  ops/
  structure-overview/
  package.json
  vite.config.js
  index.html
```

## Belangrijke routes-definitie

- Router setup: `src/App.jsx`
- Rolgebaseerde navigatie: `src/components/layout/TopNav.jsx`
- API contracten (incl. MFA): `src/services/apiClient.js`
