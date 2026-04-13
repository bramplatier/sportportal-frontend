# Route Diagrammen

## 1) Router en redirects

```mermaid
flowchart TD
  A[/] --> B[/login]
  C[/login] --> D{Auth OK?}
  D -- Nee --> C
  D -- Ja, MFA nodig --> E[/api/auth/mfa/verify stap/]
  D -- Ja, MFA niet nodig --> F[/dashboard]
  E --> F

  G[/register] --> C

  F --> H[/account]
  F --> I[/activiteiten]
  F --> J{Rol trainer/admin?}
  J -- Ja --> K[/trainer]
  J -- Nee --> F

  F --> L{Rol admin?}
  L -- Ja --> M[/admin]
  L -- Nee --> F

  N[Onbekende route *] --> C
```

## 2) Autorisatie matrix

```mermaid
graph LR
  U[Guest] -->|kan| L1[/login]
  U -->|kan| L2[/register]
  U -->|kan| L3[/admin-login]

  C[Customer] -->|kan| R1[/dashboard]
  C -->|kan| R2[/account]
  C -->|kan| R3[/activiteiten]

  T[Trainer] -->|kan| R1
  T -->|kan| R2
  T -->|kan| R3
  T -->|kan| R4[/trainer]

  A[Admin] -->|kan| R1
  A -->|kan| R2
  A -->|kan| R3
  A -->|kan| R4
  A -->|kan| R5[/admin]
```
