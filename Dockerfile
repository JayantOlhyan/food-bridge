# Stage 1: Build the React + Vite frontend
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
RUN npm ci

COPY client ./client
RUN npm run build

# Stage 2: Production runtime (Express API + Static SPA)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV SERVE_STATIC=true

COPY package.json package-lock.json ./
COPY client/package.json ./client/
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY --from=builder /app/client/dist ./client/dist

RUN addgroup -S foodbridge && adduser -S foodbridge -G foodbridge \
  && chown -R foodbridge:foodbridge /app
USER foodbridge

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1

CMD ["node", "server/index.js"]
