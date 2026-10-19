# syntax=docker/dockerfile:1
# Um único container: a API serve também o frontend (mesma origem, sem CORS).
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @saturbank/web exec vite build && pnpm --filter @saturbank/api build \
  && pnpm --filter @saturbank/api deploy --prod --legacy /out \
  && cp -r apps/api/dist /out/dist && cp -r apps/web/dist /out/web

FROM node:22-alpine
ENV NODE_ENV=production PORT=3000 WEB_DIST=/app/web
WORKDIR /app
COPY --from=build /out ./
# Sem root (OWASP A02)
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/api/v1/saude || exit 1
# Aplica as migrações e sobe o servidor
CMD ["sh", "-c", "node dist/migrar.js && node dist/server.js"]
