# Интеграция AlemLLM и PostgreSQL векторных баз

## 🎉 Что было сделано

Все три API endpoint успешно переведены на использование:
- ✅ **AlemLLM API** вместо OpenAI
- ✅ **PostgreSQL векторные базы** (VND и NPA) вместо OpenAI vector stores
- ✅ **BAAI/bge-m3 эмбеддинги** через локальный микросервис

## 📁 Созданные файлы

### Библиотеки

1. **`src/lib/alemllm.ts`** - Клиент для AlemLLM API
   - URL: `<YOUR_ALEMLLM_API_URL>/chat/completions`
   - Модель: `astanahub/alemllm`

2. **`src/lib/vector-db.ts`** - Утилиты для PostgreSQL векторных БД
   - VND: `<YOUR_DB_HOST>:5433/vnd`
   - NPA: `<YOUR_DB_HOST>:5433/npa`

3. **`src/lib/embedding-client.ts`** - TypeScript клиент для embedding сервиса
   - URL: `http://localhost:8001`

4. **`src/lib/embedding-service.py`** - Python микросервис для генерации эмбеддингов
   - Модель: BAAI/bge-m3
   - Размерность: 1024

### API Endpoints

5. **`src/app/api/analyze/vnd/route.ts`** - Анализ по ВНД
   - Использует searchVND() для поиска по внутренним документам
   - Контекстный анализ с alemllm

6. **`src/app/api/analyze/np/route.ts`** - Анализ по НПА
   - Использует searchNPA() для гибридного поиска (BM25 + Dense + Sparse)
   - Правовой анализ с alemllm

7. **`src/app/api/analyze/summary/route.ts`** - Итоговое заключение
   - Объединяет результаты ВНД и НПА
   - Генерирует решение виртуального директора

## 🚀 Как запустить

### 1. Установите зависимости

```bash
# Python зависимости для embedding сервиса
pip install fastapi uvicorn sentence-transformers torch

# Node.js зависимости (уже установлены)
npm install
```

### 2. Запустите embedding сервис

```bash
# В отдельном терминале
cd /Users/armanaubakirov/cks2/2/sk
python src/lib/embedding-service.py
```

Сервис запустится на `http://localhost:8001`

### 3. Запустите Next.js приложение

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:3000`

## 🧪 Тестирование

### Проверка health check

```bash
# Проверка embedding сервиса
curl http://localhost:8001/health

# Проверка AlemLLM API
curl -X POST "<YOUR_ALEMLLM_API_URL>/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "astanahub/alemllm",
    "messages": [{"role": "user", "content": "Test"}]
  }'
```

### Проверка векторных баз

```bash
# Подключение к VND базе
psql -h <YOUR_DB_HOST> -p 5433 -U <your-user> -d vnd

# В psql:
SELECT COUNT(*) FROM sections;
SELECT COUNT(*) FROM subsections;
\q

# Подключение к NPA базе
psql -h <YOUR_DB_HOST> -p 5433 -U <your-user> -d npa

# В psql:
SELECT COUNT(*) FROM content_chunks;
SELECT COUNT(*) FROM document_metadata;
\q
```

## 📊 Архитектура

```
┌─────────────────────────────────────────────┐
│         Next.js Frontend (port 3000)        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│           API Routes (/api/analyze)         │
│  ├─ /vnd    - ВНД анализ                    │
│  ├─ /np     - НПА анализ                    │
│  └─ /summary- Итоговое заключение           │
└─────┬──────────────┬──────────────┬─────────┘
      │              │              │
      ▼              ▼              ▼
┌──────────┐  ┌─────────────┐  ┌──────────────┐
│ AlemLLM  │  │  Embedding  │  │  PostgreSQL  │
│   API    │  │   Service   │  │  Vector DBs  │
│ (remote) │  │ (local:8001)│  │   (remote)   │
└──────────┘  └─────────────┘  └──────────────┘
```

## 🔧 Конфигурация

### Переменные окружения (опционально)

Создайте файл `.env.local`:

```bash
# Embedding Service
EMBEDDING_SERVICE_URL=http://localhost:8001

# PostgreSQL (уже в коде, но можно вынести)
VND_DB_HOST=<YOUR_DB_HOST>
VND_DB_PORT=5433
VND_DB_NAME=vnd
VND_DB_USER=postgres
VND_DB_PASSWORD=<YOUR_DB_PASSWORD>

NPA_DB_HOST=<YOUR_DB_HOST>
NPA_DB_PORT=5433
NPA_DB_NAME=npa
NPA_DB_USER=postgres
NPA_DB_PASSWORD=<YOUR_DB_PASSWORD>

# AlemLLM API (уже в коде)
ALEMLLM_API_URL=<YOUR_ALEMLLM_API_URL>
```

## 🐛 Возможные проблемы и решения

### 1. Embedding сервис недоступен

**Ошибка:** "Сервис эмбеддингов недоступен"

**Решение:**
```bash
python src/lib/embedding-service.py
```

### 2. Ошибка подключения к PostgreSQL

**Ошибка:** "Ошибка БД ВНД/НПА"

**Проверка:**
```bash
telnet <YOUR_DB_HOST> 5433
```

**Возможные причины:**
- Сервер недоступен
- Неправильные credentials
- Firewall блокирует порт

### 3. AlemLLM API недоступен

**Ошибка:** "Ошибка AlemLLM"

**Проверка:**
```bash
curl <YOUR_ALEMLLM_API_URL>/health
```

### 4. Модель BAAI/bge-m3 не загружена

**Ошибка при старте embedding сервиса**

**Решение:**
```bash
# Модель загрузится автоматически при первом запуске
# Требуется ~2GB свободного места
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"
```

## 📈 Производительность

### Время ответа (примерное)

- **Генерация эмбеддингов:** 100-500ms (зависит от длины текста)
- **Поиск в векторной БД:** 10-50ms
- **AlemLLM генерация:** 5-30 секунд (зависит от длины ответа)
- **Полный анализ (3 этапа):** 20-90 секунд

### Оптимизация

1. **Кэширование эмбеддингов** - можно добавить Redis
2. **Batch обработка** - объединять запросы к embedding сервису
3. **Connection pooling** - уже реализован в `vector-db.ts`

## 📚 Документация

### Полезные ссылки

- [AlemLLM API docs](<YOUR_ALEMLLM_BASE_URL>/docs)
- [BAAI/bge-m3 model](https://huggingface.co/BAAI/bge-m3)
- [pgvecto.rs docs](https://docs.pgvecto.rs/)
- [PostgreSQL vector databases README](./docs/README.md)

### Структура промптов

Все промпты оптимизированы для получения структурированных ответов:

- **ВНД анализ:** Фокус на внутренние стандарты компании
- **НПА анализ:** Фокус на законодательство РК
- **Summary:** Объединение + решение виртуального директора

## ✅ Checklist миграции

- [x] Создан AlemLLM клиент
- [x] Созданы утилиты для PostgreSQL
- [x] Создан embedding микросервис
- [x] Обновлен VND endpoint
- [x] Обновлен NPA endpoint  
- [x] Обновлен Summary endpoint
- [ ] Протестирован полный flow
- [ ] Добавлен мониторинг ошибок
- [ ] Настроено логирование

## 🎯 Следующие шаги

1. **Тестирование** - протестировать все три этапа анализа
2. **Мониторинг** - добавить логирование запросов
3. **Оптимизация** - добавить кэширование, если нужно
4. **Документация** - обновить пользовательскую документацию

---

**Создано:** 5 января 2025  
**Версия:** 1.0  
**Статус:** ✅ Готово к тестированию
