# Retail Store Backend — one image, SERVICE env selects which server (main|cart|checkout|auth|admin)
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# Dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# App
COPY src ./src/
COPY services ./services/
COPY data ./data/
COPY assets ./assets/
RUN mkdir -p uploads

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--", "./entrypoint.sh"]
