# SportPortal Frontend

React + Vite frontend op basis van de SportPortal requirements.

## Development

1. Installeer dependencies:
   npm install
2. Start lokaal:
   npm run dev

## Production Build

npm run build

Output staat in de dist map.

## Deploy

### Optie A: Vercel (aanbevolen)

1. Installeer Vercel CLI (eenmalig):
   npm i -g vercel
2. Deploy:
   vercel --prod

SPA-routes worden afgehandeld via vercel.json.

### Optie B: Netlify

1. Build lokaal:
   npm run build
2. Deploy map dist via Netlify UI of CLI:
   netlify deploy --prod --dir=dist

SPA-routes worden afgehandeld via public/_redirects.

### Optie C: Linux server met systemd (auto restart)

Voor een eigen Linux server (bijv. `10.10.10.20`) kun je de frontend als `systemd` service draaien.

1. Eenmalig installeren:
   ./ops/install-systemd-service.sh
2. Status bekijken:
   sudo systemctl status sportportal.service
3. Logs volgen:
   sudo journalctl -u sportportal.service -f

Deze service:
- start automatisch na reboot
- herstart automatisch bij crash (`Restart=always`)
- draait op poort `4173`
\n\nLast Pipeline Test: Tue Mar 31 12:40:58 PM CEST 2026
\n\nRunner Group Fix Test: Tue Mar 31 12:43:19 PM CEST 2026
