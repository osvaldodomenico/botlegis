FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p /app/uploads
EXPOSE 8000
CMD ["sh", "-c", "npx prisma migrate resolve --applied 20260514030000_add_dobradas 2>/dev/null || true; npx prisma migrate deploy; node dist/main"]
