# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Beveiligde Nginx configuratie
RUN printf 'server {\n\
  listen 80;\n\
  # Beveiligingsheaders\n\
  add_header X-Frame-Options "DENY" always;\n\
  add_header X-Content-Type-Options "nosniff" always;\n\
  add_header X-XSS-Protection "1; mode=block" always;\n\
  add_header Referrer-Policy "no-referrer-when-downgrade" always;\n\
  add_header Content-Security-Policy "default-src \x27self\x27; script-src \x27self\x27 \x27unsafe-inline\x27; style-src \x27self\x27 \x27unsafe-inline\x27; img-src \x27self\x27 data:; font-src \x27self\x27 data:; connect-src \x27self\x27;" always;\n\
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;\n\
  \n\
  location / {\n\
    root /usr/share/nginx/html;\n\
    index index.html index.htm;\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
