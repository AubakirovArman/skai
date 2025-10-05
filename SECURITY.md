# 🔐 Безопасность и конфигурация

## ⚠️ ВАЖНО: Защита конфиденциальных данных

### Файлы с чувствительной информацией

**НЕ коммитить в Git:**
- ✅ `.env.local` - содержит реальные пароли и ключи
- ✅ `.env.docker` - содержит Docker конфигурацию (если есть)

**Можно коммитить:**
- ✅ `.env.example` - шаблон без реальных значений
- ✅ `.env` - пример конфигурации для документации

### Что было изменено для безопасности

#### 1. Все чувствительные данные перенесены в `.env.local`

**До (хардкод в коде):**
```typescript
// ❌ Плохо - пароли в коде
const VND_CONFIG = {
  host: '<YOUR_DB_HOST>',
  password: '<YOUR_DB_PASSWORD>',
}
```

**После (из переменных окружения):**
```typescript
// ✅ Хорошо - из env
const VND_CONFIG = {
  host: process.env.VND_DB_HOST,
  password: process.env.VND_DB_PASSWORD,
}
```

#### 2. Обновленные файлы

- [x] `src/lib/alemllm.ts` - AlemLLM API URL и модель из env
- [x] `src/lib/vector-db.ts` - Параметры PostgreSQL из env
- [x] `src/lib/embedding-client.ts` - URL сервиса эмбеддингов из env
- [x] `.env.local` - Реальные значения (не в Git)
- [x] `.env.example` - Шаблон для новых разработчиков
- [x] `.gitignore` - Защита `.env.local` от коммита

#### 3. Переменные окружения

Все конфиденциальные данные теперь в `.env.local`:

```bash
# AlemLLM API
ALEMLLM_API_URL="<YOUR_ALEMLLM_API_URL>"
ALEMLLM_MODEL="astanahub/alemllm"

# PostgreSQL VND Database
VND_DB_HOST="<YOUR_DB_HOST>"
VND_DB_PORT="5433"
VND_DB_NAME="vnd"
VND_DB_USER="<your-username>"
VND_DB_PASSWORD="your-secure-password"

# PostgreSQL NPA Database
NPA_DB_HOST="<YOUR_DB_HOST>"
NPA_DB_PORT="5433"
NPA_DB_NAME="npa"
NPA_DB_USER="<your-username>"
NPA_DB_PASSWORD="your-secure-password"

# Embedding Service
EMBEDDING_SERVICE_URL="http://localhost:8001"

# NextAuth
NEXTAUTH_SECRET="your-random-32-char-secret"
NEXTAUTH_URL="http://localhost:3000"
```

## 🚀 Быстрый старт для новых разработчиков

### 1. Клонировать репозиторий
```bash
git clone <repo-url>
cd skai
```

### 2. Создать `.env.local` из шаблона
```bash
cp .env.example .env.local
```

### 3. Заполнить реальными значениями
```bash
nano .env.local
# Получить реальные пароли от команды
```

### 4. Проверить конфигурацию
```bash
node test-env-config.mjs
```

### 5. Установить зависимости и запустить
```bash
npm install
npm run dev
```

## 🔒 Правила безопасности

### Для разработчиков

1. **Никогда не коммитьте `.env.local`**
   ```bash
   # Проверка перед коммитом
   git status
   # .env.local НЕ должен быть в списке
   ```

2. **Не делитесь паролями в чатах**
   - Используйте безопасные каналы (1Password, LastPass, Bitwarden)
   - Или передавайте лично

3. **Регулярно меняйте пароли**
   - Особенно после ухода сотрудника
   - После подозрения на утечку

4. **Используйте сильные пароли**
   ```bash
   # Генерация случайного пароля
   openssl rand -base64 32
   ```

### Для DevOps

1. **На production сервере**
   ```bash
   # Установить правильные права доступа
   chmod 600 .env.local
   chown app-user:app-user .env.local
   
   # Проверить, что файл не читается другими
   ls -la .env.local
   # Должно быть: -rw------- 1 app-user app-user
   ```

2. **Резервное копирование**
   ```bash
   # Backup конфигурации (зашифрованный)
   gpg -c .env.local
   # Сохранить .env.local.gpg в безопасное место
   ```

3. **Логирование**
   - Не логировать пароли
   - Не выводить переменные окружения в логи
   - Использовать `***` для скрытия секретов

### Для администраторов БД

1. **Создать отдельного пользователя для приложения**
   ```sql
   -- Вместо использования postgres superuser
   CREATE USER skai_app WITH PASSWORD 'strong-password';
   GRANT CONNECT ON DATABASE vnd TO skai_app;
   GRANT CONNECT ON DATABASE npa TO skai_app;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO skai_app;
   ```

2. **Ограничить доступ по IP**
   ```conf
   # pg_hba.conf
   host  vnd  skai_app  10.0.0.0/8  scram-sha-256
   host  npa  skai_app  10.0.0.0/8  scram-sha-256
   ```

## 📝 Проверочный чеклист

### Перед коммитом в Git

- [ ] `.env.local` НЕ в списке `git status`
- [ ] `.env.example` содержит только примеры, без реальных данных
- [ ] Пароли не hardcoded в коде
- [ ] API ключи берутся из `process.env`
- [ ] Логи не содержат секретов

### Перед деплоем

- [ ] `.env.local` создан на сервере
- [ ] Все переменные заполнены
- [ ] `node test-env-config.mjs` показывает 15/15 ✅
- [ ] Права доступа `chmod 600 .env.local`
- [ ] `NODE_ENV="production"` установлен
- [ ] `NEXTAUTH_URL` указывает на production домен
- [ ] Все сервисы доступны (PostgreSQL, Embedding service, AlemLLM)

### Периодическая проверка

- [ ] Аудит доступа к базам данных
- [ ] Ротация паролей (каждые 90 дней)
- [ ] Проверка логов на утечки
- [ ] Обновление зависимостей (`npm audit`)
- [ ] Проверка SSL сертификатов

## 🆘 Что делать при утечке

### Если пароль/ключ попал в Git

1. **Немедленно сменить пароль/ключ**
2. **Удалить из Git истории**
   ```bash
   # Использовать git-filter-repo или BFG
   git filter-repo --path .env.local --invert-paths
   git push --force
   ```
3. **Уведомить команду**
4. **Проверить логи доступа к БД**

### Если подозрение на компрометацию

1. **Заблокировать доступ**
2. **Сменить все пароли**
3. **Проверить логи на аномалии**
4. **Провести аудит безопасности**

## 📚 Дополнительная информация

- [ENV_CONFIGURATION.md](./ENV_CONFIGURATION.md) - Полное описание всех переменных
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Руководство по развертыванию
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

**Последнее обновление:** 5 октября 2025
**Версия:** 1.0.0
