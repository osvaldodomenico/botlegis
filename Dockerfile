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
COPY --from=builder /app/stickers ./stickers
RUN mkdir -p /app/uploads /app/stickers
EXPOSE 8000
CMD ["sh", "-c", "npx prisma migrate resolve --applied 20260514030000_add_dobradas 2>/dev/null || true; npx prisma migrate resolve --rolled-back 20260617000000_openai_model_gpt4o 2>/dev/null || true; npx prisma migrate resolve --rolled-back 20260518010000_add_bot_memory_fields 2>/dev/null || true; npx prisma migrate deploy && node dist/main"]
