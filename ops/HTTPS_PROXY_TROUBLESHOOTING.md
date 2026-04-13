# HTTPS Proxy Troubleshooting (Mixed Content / Timeout)

Situatie:
- Frontend draait op https://sportportal.kstouthart.nl
- Backend draait op http://10.10.10.21:3000

Wanneer frontend direct naar http://10.10.10.21:3000 callt vanaf HTTPS pagina:
- browser blokkeert mixed content
- of request timed out door netwerk/firewall

Oplossing:
- Frontend calls alleen same-origin (`/api/...`)
- Nginx proxyt `/api/*` intern naar `http://10.10.10.21:3000/*`

## Frontend env waarden

Gebruik in productie:

```env
VITE_API_BASE_URL=/api
VITE_AUTH_FALLBACK=false
```

## Deploy stappen

1. Frontend env zetten
```bash
# op frontend server (10.10.10.20)
cd /home/pindakaas/sportportal
cp .env.production.example .env.production
```

2. Frontend rebuild
```bash
npm install
npm run build
```

3. Deploy statische build en Nginx reload
```bash
sudo nginx -t
sudo systemctl reload nginx
```

4. Cache bust/hard refresh
- Browser: Ctrl+F5
- Eventueel CDN cache purge

## Nginx reverse proxy snippet

```nginx
location /api/ {
    proxy_pass http://10.10.10.21:3000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
```

## Korte testchecklist

1. Browser Network tab
- Expected register/login URL begint met:
  - `https://sportportal.kstouthart.nl/api/...`
- Niet met:
  - `http://10.10.10.21:3000/...`

2. Curl health via domein
```bash
curl -i https://sportportal.kstouthart.nl/api/health
```
Verwacht: HTTP 200

3. Register call via HTTPS domein
```bash
curl -i -X POST https://sportportal.kstouthart.nl/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"proxy-probe@example.com","password":"Demo@12345"}'
```
Verwacht: 201 of valide functionele response (maar geen mixed-content / timeout in browser)
