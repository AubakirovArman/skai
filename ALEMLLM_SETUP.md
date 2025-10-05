# AlemLLM + PostgreSQL Vector DB Integration

## 🚀 Инструкция по запуску

### 1. Запуск Embedding Service (Python)

Embedding service необходим для генерации векторов из текста.

```bash
# Установите зависимости (если еще не установлены)
pip install fastapi uvicorn sentence-transformers torch

# Запустите сервис
python src/lib/embedding-service.py
```

Сервис будет доступен на `http://localhost:8001`

### 2. Запуск Next.js приложения

```bash
# Установите зависимости
npm install

# Запустите в режиме разработки
npm run dev
```

Приложение будет доступно на `http://localhost:3000`

## 🧪 Тестирование API

### Тест 1: ВНД Анализ

```bash
curl -X POST http://localhost:3000/api/analyze/vnd \
  -H "Content-Type: application/json" \
  -d '{
    "documentContent": "Совет директоров АО Самрук-Казына рассматривает вопрос об утверждении сделки на сумму 5 млн тенге. Документ содержит финансовое обоснование и согласования департаментов."
  }'
```

### Тест 2: НПА Анализ

```bash
curl -X POST http://localhost:3000/api/analyze/np \
  -H "Content-Type: application/json" \
  -d '{
    "documentContent": "ТОО планирует заключить договор поставки оборудования с зарубежной компанией на сумму 10 млн тенге."
  }'
```

### Тест 3: Итоговое Заключение

```bash
curl -X POST http://localhost:3000/api/analyze/summary \
  -H "Content-Type: application/json" \
  -d '{
    "vndResult": "ВНД: Документ соответствует Уставу...",
    "npResult": "НПА: Сделка не противоречит законодательству..."
  }'
```

## 📊 Архитектура

```
┌─────────────────────────────────────────────┐
│          Next.js Application                │
│         (http://localhost:3000)             │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│  AlemLLM API │    │  Embedding   │
│  (alemllm.   │    │   Service    │
│   sk-ai.kz)  │    │ (localhost:  │
│              │    │     8001)    │
└──────────────┘    └──────┬───────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │   PostgreSQL    │
                  │   Vector DBs    │
                  │  <YOUR_DB_HOST> │
                  │     :5433       │
                  │                 │
                  │  ├─ vnd (ВНД)  │
                  │  └─ npa (НПА)  │
                  └─────────────────┘
```

## 🔧 Настройка переменных окружения

Создайте файл `.env.local`:

```bash
# Embedding Service
EMBEDDING_SERVICE_URL=http://localhost:8001

# PostgreSQL (уже настроены в коде)
# VND_DB_DSN=postgresql://<user>:***@<YOUR_DB_HOST>:5433/vnd
# NPA_DB_DSN=postgresql://<user>:***@<YOUR_DB_HOST>:5433/npa

# AlemLLM API (уже настроены в коде)
# ALEMLLM_API_URL=<YOUR_ALEMLLM_API_URL>
```

## 📝 Логи и отладка

### Проверка Embedding Service:

```bash
curl http://localhost:8001/health
```

Ответ должен быть:
```json
{
  "status": "healthy",
  "model": "BAAI/bge-m3",
  "device": "cpu/cuda/mps",
  "dimension": 1024
}
```

### Проверка AlemLLM API:

```bash
curl -X POST "<YOUR_ALEMLLM_API_URL>/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "astanahub/alemllm",
    "messages": [
      {"role": "user", "content": "Привет"}
    ]
  }'
```

### Проверка PostgreSQL:

```bash
psql -h <YOUR_DB_HOST> -p 5433 -U <your-user> -d vnd -c "SELECT COUNT(*) FROM sections;"
```

## ⚠️ Возможные ошибки

### 1. "Сервис эмбеддингов недоступен"

**Решение:** Убедитесь, что embedding-service запущен:
```bash
python src/lib/embedding-service.py
```

### 2. "Ошибка БД ВНД/НПА"

**Решение:** Проверьте доступность PostgreSQL сервера:
```bash
telnet <YOUR_DB_HOST> 5433
```

### 3. "Ошибка AlemLLM"

**Решение:** Проверьте доступность AlemLLM API:
```bash
curl <YOUR_ALEMLLM_API_URL>/chat/completions
```

### 4. Module not found: Can't resolve 'pg'

**Решение:** Установите зависимости:
```bash
npm install pg @types/pg
```

## 📦 Зависимости

### Python (для embedding-service.py):
```bash
pip install fastapi uvicorn sentence-transformers torch
```

### Node.js:
```bash
npm install pg @types/pg
```

## 🎯 Результаты тестирования

После запуска проверьте:
- ✅ Embedding service работает (http://localhost:8001/health)
- ✅ Next.js запущен (http://localhost:3000)
- ✅ API ВНД возвращает анализ
- ✅ API НПА возвращает анализ
- ✅ API Summary формирует заключение

## 📞 Поддержка

При возникновении проблем проверьте:
1. Логи embedding-service
2. Логи Next.js (npm run dev)
3. Network tab в браузере
4. Консоль браузера (F12)
