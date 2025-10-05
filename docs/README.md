# Векторные базы данных для поиска по документам

[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org/)
[![pgvecto.rs](https://img.shields.io/badge/pgvecto.rs-0.4.0-green.svg)](https://github.com/tensorchord/pgvecto.rs)
[![Python](https://img.shields.io/badge/Python-3.8+-yellow.svg)](https://www.python.org/)
[![Status](https://img.shields.io/badge/Status-Ready-success.svg)]()

Векторные базы данных на PostgreSQL с pgvecto.rs для семантического поиска по внутренним нормативным документам (ВНД) и правовым нормам РК (НПА).

## 🎯 Что это?

Две полнофункциональные векторные базы данных с поддержкой:
- ✅ Семантического поиска (dense векторы)
- ✅ Лексического поиска (sparse векторы)
- ✅ Полнотекстового поиска (BM25)
- ✅ Гибридного поиска с RRF
- ✅ HNSW индексов для быстрого поиска

## 🚀 Быстрый старт

```python
# Установка
pip install psycopg2-binary sentence-transformers

# Поиск по ВНД
from ВНД.internal_search import internal_doc_search
results = internal_doc_search("полномочия совета директоров")

# Поиск по НПА
from Правовые_нормы.rag_npa import legal_search
results = legal_search("налоги для ТОО")
```

**Подробнее:** [QUICKSTART.md](./QUICKSTART.md)

## 📚 Документация

| Документ | Описание |
|----------|----------|
| **[INDEX.md](./INDEX.md)** | 🗂️ Навигация по всем документам |
| **[QUICKSTART.md](./QUICKSTART.md)** | ⚡ Быстрый старт за 2 минуты |
| **[README_VECTOR_DB_USAGE.md](./README_VECTOR_DB_USAGE.md)** | 📖 Полное руководство |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | 🏛️ Архитектура и схемы |
| **[SUMMARY.md](./SUMMARY.md)** | ✅ Статус проекта |

## 🗄️ Базы данных

### vnd - Внутренние нормативные документы
```
📄 documents → 📑 sections → 📃 subsections
            (vector 1024)  (vector 1024)
```

### npa - Правовые нормы РК
```
📜 document_metadata → 📝 content_chunks
                     (dense + sparse + tsvector)
```

**Подключение:**
```python
VND_DSN = "postgresql://<YOUR_DB_USER>:<YOUR_DB_PASSWORD>@<YOUR_DB_HOST>:<YOUR_DB_PORT>/vnd"
NPA_DSN = "postgresql://<YOUR_DB_USER>:<YOUR_DB_PASSWORD>@<YOUR_DB_HOST>:<YOUR_DB_PORT>/npa"
```

## 🔧 Что нужно сделать?

1. ✅ Базы данных созданы
2. ⏳ Обновить строки подключения:
   - `ВНД/internal_search.py` (строка ~18)
   - `Правовые нормы/rag_npa.py` (функция get_npa_conn)
3. ⏳ Загрузить данные (опционально):
   ```bash
   python load_vnd_data.py
   ```

## 💡 Ключевые особенности

- **Расширение:** pgvecto.rs (vectors) v0.4.0 вместо pgvector
- **Индексы:** HNSW (быстрее чем IVFFlat)
- **Векторы:** Dense (1024) + Sparse (250002) + BM25
- **Модель:** BAAI/bge-m3 (размерность 1024)
- **Сервер:** <YOUR_DB_HOST>:<YOUR_DB_PORT>

## 📊 Статистика

```
База vnd:
  ├─ 3 таблицы (documents, sections, subsections)
  ├─ 8 индексов (2 HNSW + 6 B-tree)
  └─ Векторы: 1024 float32

База npa:
  ├─ 2 таблицы (document_metadata, content_chunks)
  ├─ 6 индексов (2 HNSW + 1 GIN + 3 B-tree)
  └─ Векторы: dense(1024) + sparse(250002)
```

## 🛠️ Скрипты

| Скрипт | Описание |
|--------|----------|
| `create_vector_databases_pgvectors.py` | ✅ Создание баз (выполнено) |
| `load_vnd_data.py` | 📥 Загрузка данных ВНД из CSV |
| `create_databases_manual.sql` | 📄 SQL для ручного создания |

## 📖 Примеры использования

### Поиск по ВНД

```python
from ВНД.internal_search import internal_doc_search

results = internal_doc_search(
    query="полномочия совета директоров",
    top_k=8,
    limit=12
)

for r in results['results']:
    print(f"[{r['similarity']:.2f}] {r['doc_title']} - {r['title']}")
    print(f"  {r['text'][:200]}...")
```

### Поиск по НПА с генерацией ответа

```python
from Правовые_нормы.rag_npa import legal_search, legal_generate_answer

# Поиск
results = legal_search("налоги для ТОО", top_k=5)

# Генерация ответа с источниками
answer = legal_generate_answer(results['query'], results['results'])
print(answer)
```

## ❓ FAQ

**Q: Нужно ли устанавливать модель эмбеддингов?**  
A: Для использования функций `internal_doc_search()` и `legal_search()` - НЕТ (создается автоматически). Для загрузки новых данных - ДА.

**Q: Какую модель использовать?**  
A: BAAI/bge-m3 (размерность 1024, поддержка русского языка)

**Q: Где хранится пароль?**  
A: В файлах документации. Для production используйте переменные окружения.

**Q: Как обновить существующий код?**  
A: Измените строки подключения (DSN) в файлах `internal_search.py` и `rag_npa.py`

**Больше вопросов:** [README_VECTOR_DB_USAGE.md - FAQ](./README_VECTOR_DB_USAGE.md#-частые-проблемы)

## 🏗️ Архитектура

```
┌─────────────────────────────────────┐
│   PostgreSQL + pgvecto.rs v0.4.0    │
│   <YOUR_DB_HOST>:<YOUR_DB_PORT>               │
├──────────────────┬──────────────────┤
│   База vnd       │   База npa       │
│   (ВНД)          │   (НПА РК)       │
└──────────────────┴──────────────────┘
         ▲                  ▲
         │                  │
         └──────────────────┘
                  │
         ┌────────┴────────┐
         │  Ваш код Python │
         │  + BAAI/bge-m3  │
         └─────────────────┘
```

**Подробнее:** [ARCHITECTURE.md](./ARCHITECTURE.md)

## 📦 Зависимости

```bash
pip install psycopg2-binary sentence-transformers torch numpy FlagEmbedding
```

## 🔐 Безопасность

⚠️ **Пароли в коде - только для разработки!**

Для production используйте:
```bash
# .env файл
VND_DB_DSN=postgresql://...
NPA_DB_DSN=postgresql://...
OPENAI_API_KEY=sk-...
```

## 📈 Производительность

- **Поиск:** ~10-50ms для top-10 результатов
- **Индексы:** HNSW (m=16, ef=64)
- **Память:** ~4KB на вектор (1024 float32)
- **Масштабирование:** до миллионов векторов

## 🤝 Участие

Проект создан для внутреннего использования. Документация и примеры открыты.

## 📄 Лицензия

Внутренний проект.

## 📞 Поддержка

1. Проверьте [INDEX.md](./INDEX.md) для навигации
2. Смотрите [Частые проблемы](./README_VECTOR_DB_USAGE.md#-частые-проблемы)
3. Читайте логи PostgreSQL

---

**Создано:** 5 января 2025  
**Версия:** 1.0  
**Статус:** ✅ Готово к использованию

**Начните с [QUICKSTART.md](./QUICKSTART.md) →**
