# SportPortal Frontend

Dit is de frontend applicatie voor de SportPortal, een platform voor het beheren van sportlessen, activiteiten en gebruikersrechten.

## 🚀 Tech Stack

- **Framework:** [React](https://reactjs.org/) (met Vite)
- **Styling:** Vanilla CSS
- **State Management:** React Hooks & Context API
- **API Client:** Fetch API met gecentraliseerde services

## 🛠️ Installatie & Gebruik

1. **Clone de repository**
2. **Installeer afhankelijkheden:**
   ```bash
   npm install
   ```
3. **Start de development server:**
   ```bash
   npm run dev
   ```
4. **Build voor productie:**
   ```bash
   npm run build
   ```

## 📂 Project Structuur

- `src/components/`: Herbruikbare UI componenten en pagina-onderdelen.
- `src/services/`: API client en communicatie met de backend.
- `src/hooks/`: Custom React hooks.
- `src/context/`: AuthContext voor sessiebeheer.

## 🔐 Beveiliging

- Gebruikt JWT tokens voor authenticatie.
- Ondersteuning voor Multi-Factor Authentication (MFA).
- Device-level verificatie via MAC-adres controle (backend-afhankelijk).

---

© 2026 SportPortal Team
