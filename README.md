# 🎯 SKAI — независимый (цифровой) член СД

[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](.)
![AlemLLM](https://img.shields.io/badge/LLM-AlemLLM-blue)
[![PostgreSQL](https://img.shields.io/badge/Vector%20DB-PostgreSQL-orange)](.)
[![Next.js](https://img.shields.io/badge/Framework-Next.js%2015-black)](https://nextjs.org)

SKAI — это система искусственного интеллекта для поддержки принятия решений советом директоров АО «Самрук-Қазына». Проект представляет собой веб-приложение на Next.js с интегрированными ИИ-ассистентами для работы с внутренними документами и нормативно-правовыми актами Казахстана.

## 🚀 Что нового (v2.0.0)

**🔐 Полная миграция на безопасную конфигурацию:**
- ✅ Все пароли и API ключи перенесены в `.env.local`
- ✅ AlemLLM API вместо OpenAI
- ✅ PostgreSQL + pgvecto.rs для векторного поиска
- ✅ BAAI/bge-m3 embeddings
- ✅ 7 новых документов с полной документацией

## 📋 Быстрая навигация по документации

### 🎯 Для быстрого старта
- **[CHEATSHEET.md](./CHEATSHEET.md)** (4 KB) - ⚡ Шпаргалка с командами
- **[QUICKSTART.md](./QUICKSTART.md)** (2 KB) - 🚀 Быстрый старт за 3 шага
- **[SETUP_COMPLETE.md](./SETUP_COMPLETE.md)** (9 KB) - ✅ Сводка по настройке

### 🔧 Для разработчиков
- **[README_ALEMLLM.md](./README_ALEMLLM.md)** (10 KB) - 📖 Полная техническая документация
- **[ENV_CONFIGURATION.md](./ENV_CONFIGURATION.md)** (10 KB) - ⚙️ Описание всех переменных окружения
- **[SECURITY.md](./SECURITY.md)** (8 KB) - 🔐 Правила безопасности
- **[EMBEDDING_SERVICE_GUIDE.md](./EMBEDDING_SERVICE_GUIDE.md)** (15 KB) - 🎯 Руководство по Embedding Service

### 🚀 Для DevOps
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** (25 KB) - 🌍 Полное руководство по развертыванию
- **[ENV_MIGRATION_REPORT.md](./ENV_MIGRATION_REPORT.md)** (11 KB) - 📊 Отчет о миграции

### 📚 История разработки
- **[SUCCESS_REPORT.md](./SUCCESS_REPORT.md)** (9 KB) - ✅ Отчет об успешном тестировании
- **[MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md)** (10 KB) - 📋 Завершение миграции OpenAI→AlemLLM
- **[ALEMLLM_INTEGRATION.md](./ALEMLLM_INTEGRATION.md)** (9 KB) - 🔗 Интеграция AlemLLM
- **[STATUS_REPORT.md](./STATUS_REPORT.md)** (7 KB) - 📊 Статус проекта

## Описание проекта

SKAI функционирует как независимый цифровой член совета директоров, предоставляя экспертные консультации и аналитику на основе:

- **🗄️ Векторных баз данных** - PostgreSQL с pgvecto.rs для семантического поиска
- **🤖 AlemLLM** - казахстанская языковая модель для генерации ответов
- **📚 Внутренние документы (ВНД)** - корпоративные нормативные документы
- **⚖️ Законодательство (НПА)** - нормативно-правовые акты Казахстана

## Основные возможности

### 🤖 ИИ-Ассистенты

1. **Виртуальный директор** (`/vnd`)
   - Стратегическое планирование бизнеса
   - Управленческие решения
   - Анализ внутренних документов

2. **Нормативно-правовые акты** (`/np`)
   - Консультации по законодательству Казахстана
   - Анализ правовых документов
   - Актуальная нормативная информация

### 🔍 Ключевые функции

- **Поиск по документам** - быстрый поиск и анализ информации в базе документов
- **ИИ-консультации** - получение экспертных рекомендаций на основе анализа
- **Актуальная информация** - работа с актуальными версиями документов

## 🛠️ Технологический стек

### Backend & AI
- **AlemLLM API** - Казахстанская языковая модель (astanahub/alemllm)
- **PostgreSQL 15+** - Реляционная база данных
- **pgvecto.rs v0.4.0** - Векторное расширение для PostgreSQL
- **BAAI/bge-m3** - Multilingual embeddings (1024-dim)
- **Python FastAPI** - Микросервис генерации эмбеддингов

### Frontend
- **Next.js 15** - React фреймворк с App Router
- **TypeScript** - Типобезопасность
- **Tailwind CSS** - Утилитарные стили
- **shadcn/ui** - UI компоненты
- **Framer Motion** - Анимации

### Infrastructure
- **PM2** - Process manager для Node.js
- **Nginx** - Reverse proxy (production)
- **Docker** - Контейнеризация (опционально)

## ⚡ Быстрая установка

### Вариант 1: Локальная разработка (3 шага)

```bash
# 1. Настроить конфигурацию
cp .env.example .env.local
nano .env.local  # Заполнить реальными значениями

# 2. Запустить embedding service (терминал 1)
python3 embedding-service.py

# 3. Запустить Next.js (терминал 2)
npm install && npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

**Подробнее:** [QUICKSTART.md](./QUICKSTART.md)

### Вариант 2: Production развертывание

Полное руководство по установке на сервере (Ubuntu/macOS):
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - пошаговая инструкция

## 🔐 Безопасность и конфигурация

### Переменные окружения

Все чувствительные данные хранятся в `.env.local`:

```bash
# Скопировать шаблон
cp .env.example .env.local

# Проверить конфигурацию
node test-env-config.mjs
# Должно показать: ✅ 15/15 variables configured
```

**Подробнее:**
- [ENV_CONFIGURATION.md](./ENV_CONFIGURATION.md) - описание всех 15 переменных
- [SECURITY.md](./SECURITY.md) - правила безопасности

## 📁 Структура проекта

```
skai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── vnd/              # ВНД чат
│   │   │   ├── np/               # НПА чат
│   │   │   └── analyze/
│   │   │       ├── vnd/          # ВНД анализ
│   │   │       ├── np/           # НПА анализ
│   │   │       └── summary/      # Итоговое заключение
│   │   ├── vnd/                  # Страница ВНД
│   │   ├── np/                   # Страница НПА
│   │   └── virtual-director/     # Виртуальный директор
│   ├── components/               # UI компоненты
│   └── lib/
│       ├── alemllm.ts            # AlemLLM клиент
│       ├── vector-db.ts          # PostgreSQL клиент
│       └── embedding-client.ts   # Embedding сервис клиент
├── embedding-service.py          # Python FastAPI сервис
├── .env.local                    # Конфигурация (НЕ в Git!)
├── .env.example                  # Шаблон конфигурации
└── docs/                         # Документация (16 файлов)
```

## 🔌 API Endpoints

### Чат-боты
- `POST /api/vnd` - ВНД чат (внутренние документы)
- `POST /api/np` - НПА чат (законодательство)

### Анализ документов
- `POST /api/analyze/vnd` - Анализ по ВНД
- `POST /api/analyze/np` - Анализ по НПА
- `POST /api/analyze/summary` - Итоговое заключение

### Embedding сервис
- `POST /embed` - Генерация эмбеддингов (порт 8001)
- `GET /health` - Health check

**Примеры:** См. [CHEATSHEET.md](./CHEATSHEET.md)

## 🧪 Тестирование

```bash
# Проверить конфигурацию
node test-env-config.mjs

# Проверить embedding service
curl http://localhost:8001/health

# Проверить API endpoints
curl -X POST http://localhost:3000/api/vnd \
  -H "Content-Type: application/json" \
  -d '{"query":"Что такое совет директоров?"}'
```

**Полные тесты:** [SUCCESS_REPORT.md](./SUCCESS_REPORT.md)

## 📊 Производительность

- **Векторный поиск:** ~100ms (5-10 результатов)
- **AlemLLM ответ:** ~3-5s (зависит от длины)
- **Общее время:** ~5-8s на запрос
- **Embedding генерация:** ~200ms на запрос

## 🤝 Разработка

### Стандарты кода
- TypeScript strict mode
- ESLint + Prettier
- Компонентная архитектура
- Environment-based конфигурация

### Безопасность
- 🔐 Все пароли в `.env.local`
- 🔐 `.env.local` в `.gitignore`
- 🔐 Валидация на входе/выходе
- 🔐 HTTPS на production

### Документация
- 📖 16 markdown файлов (~130 KB)
- 📊 Полное описание API
- 🎯 Руководства для всех ролей
- ⚡ Шпаргалки и чеклисты

## 🆘 Помощь и поддержка

### Проблемы?
1. Проверьте [CHEATSHEET.md](./CHEATSHEET.md)
2. Прочитайте [SECURITY.md](./SECURITY.md) - раздел Troubleshooting
3. Проверьте логи: `pm2 logs` или `npm run dev`

### Документация
- 🎯 **Начать работу:** [QUICKSTART.md](./QUICKSTART.md)
- 🔧 **Настроить:** [ENV_CONFIGURATION.md](./ENV_CONFIGURATION.md)
- 🚀 **Развернуть:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- 📖 **Изучить:** [README_ALEMLLM.md](./README_ALEMLLM.md)

## 📜 Лицензия

© 2025 АО «Самрук-Қазына». Проект разработан для внутреннего использования.

---

**Версия:** 2.0.0 | **Дата:** 5 октября 2025 | **Статус:** Production Ready ✅
