# Создание векторных баз данных на PostgreSQL

## 📋 Обзор

Этот проект создает две векторные базы данных на удаленном PostgreSQL сервере:

1. **vnd** - для внутренних нормативных документов (ВНД)
2. **npa** - для правовых норм (НПА РК)

## 🔧 Параметры подключения

```
Сервер: <YOUR_DB_HOST>:5433
Пользователь: postgres
Пароль: <YOUR_DB_PASSWORD>
```

## ⚠️ ВАЖНО: Требуется pgvector

Для работы векторных баз необходимо расширение **pgvector** на сервере PostgreSQL.

### Проверка наличия pgvector

```bash
psql -h <YOUR_DB_HOST> -p 5433 -U <user> -d postgres -c "SELECT * FROM pg_available_extensions WHERE name LIKE '%vector%';"
```

Если расширение отсутствует, см. инструкции в файле `install_pgvector_instructions.md`

## 🚀 Варианты создания баз данных

### Вариант 1: Python скрипт (рекомендуется)

```bash
# Установите зависимости
pip install psycopg2-binary pgvector

# Запустите скрипт
python create_vector_databases_simple.py
```

**Что делает скрипт:**
- ✅ Создает базы данных `vnd` и `npa`
- ✅ Создает все необходимые таблицы
- ✅ Настраивает векторные индексы (IVFFlat)
- ✅ Настраивает полнотекстовый поиск (GIN + tsvector)
- ✅ Создает триггеры для автоматической индексации
- ✅ Проверяет корректность установки

### Вариант 2: SQL команды вручную

Если Python скрипт не работает, используйте SQL файл:

```bash
psql -h <YOUR_DB_HOST> -p 5433 -U <user> -f create_databases_manual.sql
```

## 📊 Структура базы "vnd"

### Таблицы:

1. **documents** - метаданные документов
   - `id` (UUID) - уникальный идентификатор
   - `filename` - имя файла
   - `title` - название документа
   - `lang` - язык
   - `sha256` - хеш файла
   - `page_count` - количество страниц

2. **sections** - секции документов с векторами
   - `id` (UUID)
   - `document_id` - ссылка на документ
   - `section_label` - номер секции
   - `title` - заголовок
   - `text` - текст секции
   - `embedding` vector(1024) - векторное представление

3. **subsections** - подсекции с векторами
   - `id` (UUID)
   - `document_id` - ссылка на документ
   - `section_id` - ссылка на секцию
   - `title` - заголовок
   - `text` - текст
   - `embedding` vector(1024) - векторное представление

### Индексы:

- IVFFlat векторные индексы для быстрого поиска по косинусному сходству
- B-tree индексы для связей между таблицами

### Пример поиска:

```sql
-- Поиск похожих секций
SELECT 
    s.title,
    s.text,
    d.filename,
    1 - (s.embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
FROM sections s
JOIN documents d ON s.document_id = d.id
ORDER BY s.embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

## 📊 Структура базы "npa"

### Таблицы:

1. **document_metadata** - метаданные НПА
   - `id` (VARCHAR) - идентификатор документа
   - `title` - название акта
   - `doc_type` - тип документа
   - `doc_number` - номер
   - `adoption_date` - дата принятия
   - `status` - статус
   - `source_url` - ссылка на источник

2. **content_chunks** - чанки контента с векторами
   - `id` (SERIAL)
   - `doc_id` - ссылка на документ
   - `metadata` - метаданные чанка
   - `chunk` - текст чанка
   - `chunk_tsv` (tsvector) - для полнотекстового поиска
   - `embedding` vector(1024) - векторное представление

### Индексы:

- IVFFlat для семантического поиска
- GIN для полнотекстового поиска (BM25)
- B-tree для связей

### Триггеры:

- Автоматическое обновление `chunk_tsv` при вставке/обновлении

### Пример гибридного поиска:

```sql
-- BM25 поиск
SELECT doc_id, chunk, 
       ts_rank_cd(chunk_tsv, plainto_tsquery('russian', 'налог')) AS score
FROM content_chunks
WHERE chunk_tsv @@ plainto_tsquery('russian', 'налог')
ORDER BY score DESC
LIMIT 10;

-- Векторный поиск
SELECT doc_id, chunk,
       1 - (embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
FROM content_chunks
ORDER BY similarity DESC
LIMIT 10;
```

## 🔌 Строки подключения

После успешного создания баз:

```python
# База ВНД
VND_DSN = "postgresql://<user>:<YOUR_DB_PASSWORD>@<YOUR_DB_HOST>:5433/vnd"

# База НПА
NPA_DSN = "postgresql://<user>:<YOUR_DB_PASSWORD>@<YOUR_DB_HOST>:5433/npa"
```

## 📝 Обновление существующих скриптов

### Для internal_search.py (ВНД):

```python
# Обновите переменную окружения или в коде:
DB_DSN = "postgresql://<user>:<YOUR_DB_PASSWORD>@<YOUR_DB_HOST>:5433/vnd"
```

### Для rag_npa.py (НПА):

```python
# Обновите переменную окружения или в коде:
NPA_DB_DSN = "postgresql://<user>:<YOUR_DB_PASSWORD>@<YOUR_DB_HOST>:5433/npa"
```

## 📦 Файлы проекта

- `create_vector_databases_simple.py` - основной скрипт для создания БД
- `create_databases_manual.sql` - SQL команды для ручного создания
- `install_pgvector_instructions.md` - инструкции по установке pgvector
- `README_DATABASES.md` - этот файл с документацией

## 🔍 Проверка работы

После создания баз данных:

```bash
# Подключитесь к базе vnd
psql -h <YOUR_DB_HOST> -p 5433 -U <user> -d vnd

# Проверьте таблицы
\dt

# Проверьте индексы
\di

# То же для npa
\c npa
\dt
\di
```

## ⚡ Производительность

### Рекомендации:

1. **IVFFlat индексы** настроены на 100 списков (подходит для до 100К векторов)
2. Для больших объемов данных увеличьте `lists`:
   ```sql
   CREATE INDEX ... WITH (lists = 1000);  -- для 1М+ векторов
   ```

3. **Maintenance** - периодически запускайте:
   ```sql
   VACUUM ANALYZE sections;
   VACUUM ANALYZE subsections;
   VACUUM ANALYZE content_chunks;
   ```

## 🆘 Проблемы и решения

### Ошибка: "extension vector is not available"

➡️ Установите pgvector на сервере (см. `install_pgvector_instructions.md`)

### Ошибка подключения

➡️ Проверьте доступность сервера:
```bash
telnet <YOUR_DB_HOST> 5433
```

### Медленный поиск

➡️ Убедитесь, что индексы созданы:
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'sections';
```

## 📈 Следующие шаги

1. ✅ Установите pgvector (если требуется)
2. ✅ Создайте базы данных
3. ✅ Загрузите данные из CSV файлов
4. ✅ Обновите connection strings в скриптах
5. ✅ Протестируйте поиск

## 📞 Контакты

При возникновении проблем проверьте логи PostgreSQL или обратитесь к администратору сервера.
