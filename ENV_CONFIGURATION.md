# 🔐 Конфигурация переменных окружения

## Обзор

Приложение SKAI использует переменные окружения для хранения конфиденциальной информации и настроек конфигурации. Это обеспечивает безопасность и гибкость при развертывании.

## 📁 Файлы конфигурации

### `.env.example`
Шаблон конфигурации с примерами значений. Коммитится в Git.

### `.env.local` 
Файл с реальными значениями для локальной разработки. **НЕ коммитится в Git!**

### `.env`
Файл с примерами для документации. Можно использовать как резервный шаблон.

## 🚀 Быстрый старт

1. **Копировать шаблон:**
   ```bash
   cp .env.example .env.local
   ```

2. **Заполнить реальными значениями:**
   ```bash
   nano .env.local
   ```

3. **Запустить приложение:**
   ```bash
   npm run dev
   ```

## 📝 Описание переменных

### AlemLLM API Configuration

#### `ALEMLLM_API_URL`
- **Описание:** Базовый URL для AlemLLM API
- **Значение по умолчанию:** `<YOUR_ALEMLLM_API_URL>`
- **Обязательно:** Да
- **Пример:**
  ```env
  ALEMLLM_API_URL="<YOUR_ALEMLLM_API_URL>"
  ```

#### `ALEMLLM_MODEL`
- **Описание:** Название модели AlemLLM для использования
- **Значение по умолчанию:** `astanahub/alemllm`
- **Обязательно:** Да
- **Пример:**
  ```env
  ALEMLLM_MODEL="astanahub/alemllm"
  ```

---

### PostgreSQL Vector Databases - VND

#### `VND_DB_HOST`
- **Описание:** Хост PostgreSQL сервера с базой ВНД (Внутренние Нормативные Документы)
- **Значение по умолчанию:** `localhost`
- **Обязательно:** Да
- **Пример:**
  ```env
  VND_DB_HOST="<YOUR_DB_HOST>"
  ```

#### `VND_DB_PORT`
- **Описание:** Порт PostgreSQL сервера с базой ВНД
- **Значение по умолчанию:** `5432`
- **Обязательно:** Нет
- **Пример:**
  ```env
  VND_DB_PORT="5433"
  ```

#### `VND_DB_NAME`
- **Описание:** Название базы данных ВНД
- **Значение по умолчанию:** `vnd`
- **Обязательно:** Да
- **Пример:**
  ```env
  VND_DB_NAME="vnd"
  ```

#### `VND_DB_USER`
- **Описание:** Имя пользователя для подключения к базе ВНД
- **Значение по умолчанию:** `postgres`
- **Обязательно:** Да
- **Пример:**
  ```env
  VND_DB_USER="<your-username>"
  ```

#### `VND_DB_PASSWORD`
- **Описание:** Пароль для подключения к базе ВНД
- **Значение по умолчанию:** (пусто)
- **Обязательно:** Да
- **Пример:**
  ```env
  VND_DB_PASSWORD="your-secure-password"
  ```

---

### PostgreSQL Vector Databases - NPA

#### `NPA_DB_HOST`
- **Описание:** Хост PostgreSQL сервера с базой НПА (Нормативно-Правовые Акты)
- **Значение по умолчанию:** `localhost`
- **Обязательно:** Да
- **Пример:**
  ```env
  NPA_DB_HOST="<YOUR_DB_HOST>"
  ```

#### `NPA_DB_PORT`
- **Описание:** Порт PostgreSQL сервера с базой НПА
- **Значение по умолчанию:** `5432`
- **Обязательно:** Нет
- **Пример:**
  ```env
  NPA_DB_PORT="5433"
  ```

#### `NPA_DB_NAME`
- **Описание:** Название базы данных НПА
- **Значение по умолчанию:** `npa`
- **Обязательно:** Да
- **Пример:**
  ```env
  NPA_DB_NAME="npa"
  ```

#### `NPA_DB_USER`
- **Описание:** Имя пользователя для подключения к базе НПА
- **Значение по умолчанию:** `postgres`
- **Обязательно:** Да
- **Пример:**
  ```env
  NPA_DB_USER="<your-username>"
  ```

#### `NPA_DB_PASSWORD`
- **Описание:** Пароль для подключения к базе НПА
- **Значение по умолчанию:** (пусто)
- **Обязательно:** Да
- **Пример:**
  ```env
  NPA_DB_PASSWORD="your-secure-password"
  ```

---

### Embedding Service

#### `EMBEDDING_SERVICE_URL`
- **Описание:** URL сервиса генерации эмбеддингов (Python FastAPI)
- **Значение по умолчанию:** `http://localhost:8001`
- **Обязательно:** Да
- **Пример:**
  ```env
  EMBEDDING_SERVICE_URL="http://localhost:8001"
  ```

---

### NextAuth Configuration

#### `NEXTAUTH_SECRET`
- **Описание:** Секретный ключ для шифрования JWT токенов (минимум 32 символа)
- **Значение по умолчанию:** (нет)
- **Обязательно:** Да
- **Генерация:**
  ```bash
  openssl rand -base64 32
  ```
- **Пример:**
  ```env
  NEXTAUTH_SECRET="your-random-secret-key-min-32-chars"
  ```

#### `NEXTAUTH_URL`
- **Описание:** Базовый URL приложения для NextAuth
- **Значение по умолчанию:** `http://localhost:3000`
- **Обязательно:** Да
- **Примеры:**
  ```env
  # Development
  NEXTAUTH_URL="http://localhost:3000"
  
  # Production
  NEXTAUTH_URL="https://your-domain.com"
  ```

---

### Application Settings

#### `NODE_ENV`
- **Описание:** Режим работы Node.js приложения
- **Значения:** `development`, `production`, `test`
- **Значение по умолчанию:** `development`
- **Обязательно:** Нет
- **Пример:**
  ```env
  # Development
  NODE_ENV="development"
  
  # Production
  NODE_ENV="production"
  ```

---

## 🔒 Безопасность

### Важные правила:

1. **Никогда не коммитьте `.env.local`** в Git
2. **Используйте сильные пароли** для баз данных
3. **Генерируйте уникальный `NEXTAUTH_SECRET`** для каждой установки
4. **Используйте HTTPS** в продакшене для `NEXTAUTH_URL`
5. **Ограничьте доступ** к файлам `.env.local` на сервере

### Проверка безопасности:

```bash
# Проверить, что .env.local не в Git
git status

# Проверить права доступа на сервере
ls -la .env.local
# Должно быть: -rw------- (600)

# Установить правильные права
chmod 600 .env.local
```

---

## 🌍 Развертывание

### Локальная разработка

```bash
# 1. Скопировать шаблон
cp .env.example .env.local

# 2. Заполнить значениями
nano .env.local

# 3. Запустить
npm run dev
```

### Production сервер

```bash
# 1. Создать .env.local на сервере
nano .env.local

# 2. Заполнить production значениями
# - Изменить NODE_ENV на "production"
# - Использовать production URL для NEXTAUTH_URL
# - Использовать сильные пароли

# 3. Установить права доступа
chmod 600 .env.local
chown your-app-user:your-app-user .env.local

# 4. Собрать приложение
npm run build

# 5. Запустить
npm run start
```

### Docker

При использовании Docker, переменные окружения можно передать через:

1. **docker-compose.yml:**
   ```yaml
   environment:
     - ALEMLLM_API_URL=${ALEMLLM_API_URL}
     - VND_DB_HOST=${VND_DB_HOST}
     # ... остальные переменные
   ```

2. **.env файл для Docker:**
   ```bash
   docker-compose --env-file .env.local up
   ```

---

## 🧪 Тестирование конфигурации

### Проверка подключений

```bash
# Проверить сервис эмбеддингов
curl http://localhost:8001/health

# Проверить подключение к VND базе
psql -h $VND_DB_HOST -p $VND_DB_PORT -U $VND_DB_USER -d $VND_DB_NAME -c "SELECT 1"

# Проверить подключение к NPA базе
psql -h $NPA_DB_HOST -p $NPA_DB_PORT -U $NPA_DB_USER -d $NPA_DB_NAME -c "SELECT 1"
```

### Проверка переменных в приложении

Создайте тестовый скрипт:

```typescript
// test-env.ts
console.log('Environment Configuration:')
console.log('ALEMLLM_API_URL:', process.env.ALEMLLM_API_URL)
console.log('ALEMLLM_MODEL:', process.env.ALEMLLM_MODEL)
console.log('VND_DB_HOST:', process.env.VND_DB_HOST)
console.log('NPA_DB_HOST:', process.env.NPA_DB_HOST)
console.log('EMBEDDING_SERVICE_URL:', process.env.EMBEDDING_SERVICE_URL)
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
console.log('NODE_ENV:', process.env.NODE_ENV)
```

Запустите:
```bash
npx tsx test-env.ts
```

---

## 📚 Дополнительная информация

### Приоритет переменных окружения

Next.js загружает переменные окружения в следующем порядке (от высшего к низшему приоритету):

1. `process.env`
2. `.env.$(NODE_ENV).local`
3. `.env.local` (не используется для test окружения)
4. `.env.$(NODE_ENV)`
5. `.env`

### Использование в коде

```typescript
// В серверных компонентах и API routes
const apiUrl = process.env.ALEMLLM_API_URL

// В клиентских компонентах (требуется префикс NEXT_PUBLIC_)
const publicVar = process.env.NEXT_PUBLIC_SOME_VAR
```

### Ссылки

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [PostgreSQL Connection](https://node-postgres.com/features/connecting)
- [NextAuth Configuration](https://next-auth.js.org/configuration/options)

---

**Последнее обновление:** 5 октября 2025
**Версия:** 1.0.0
