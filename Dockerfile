# Используем официальный Node.js образ
FROM node:18-alpine AS base

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем PostgreSQL клиент для healthcheck
RUN apk add --no-cache postgresql-client

# Копируем файлы зависимостей
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Генерируем Prisma клиент
RUN npx prisma generate

# Этап сборки
FROM node:18-alpine AS builder
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем все зависимости (включая dev)
RUN npm ci

# Генерируем Prisma клиент
RUN npx prisma generate

# Копируем исходный код
COPY . .

# Устанавливаем переменные окружения для сборки (заглушки)
ENV OPENAI_API_KEY=dummy_key_for_build
ENV NEXTAUTH_SECRET=dummy_secret_for_build
ENV NEXTAUTH_URL=http://localhost:3000
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy

# Собираем приложение
RUN npm run build

# Финальный этап
FROM node:18-alpine AS runner
WORKDIR /app

# Устанавливаем PostgreSQL клиент
RUN apk add --no-cache postgresql-client

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем необходимые файлы из этапа сборки
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Копируем скрипт инициализации
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Переключаемся на пользователя nextjs
USER nextjs

# Открываем порт
EXPOSE 3000

# Используем entrypoint скрипт
ENTRYPOINT ["./docker-entrypoint.sh"]

# Запускаем приложение
CMD ["node", "server.js"]