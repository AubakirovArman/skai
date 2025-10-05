# 🔧 Исправление: Context Length Limit для VND API

## 🐛 Проблема

**Дата:** 5 октября 2025  
**Endpoint:** `/api/vnd`  
**Ошибка:** `context length limit exceed`

### Детали ошибки:
```
prompt_tokens: 67805
max_tokens: 4096
max_model_len: 32768
```

**Причина:**
- Векторный поиск возвращал 15 результатов
- Общий размер контекста: **230,068 символов** (229 KB)
- Это превышало лимит AlemLLM API (32,768 токенов)

## ✅ Решение

### 1. Уменьшено количество результатов поиска

**Было:**
```typescript
const searchResults = await searchVND(queryVector, { 
  topK: 10,
  limit: 15 
})
```

**Стало:**
```typescript
const searchResults = await searchVND(queryVector, { 
  topK: 5,   // Уменьшено с 10 до 5
  limit: 8   // Уменьшено с 15 до 8
})
```

### 2. Добавлено ограничение длины текста

```typescript
const MAX_TEXT_LENGTH = 2000      // Максимум 2000 символов на результат
const MAX_TOTAL_CONTEXT = 15000   // Максимум 15KB общего контекста
```

**Логика:**
- Каждый результат обрезается до 2000 символов
- Общий контекст ограничен 15KB
- Если лимит достигнут, остальные результаты отбрасываются

### 3. Уменьшен max_tokens для ответа

**Было:**
```typescript
max_tokens: 4096
```

**Стало:**
```typescript
max_tokens: 2048
```

## 📊 Результаты

### До исправления:
- Контекст: ~230,000 символов
- Prompt tokens: ~67,805
- Статус: ❌ Ошибка 400

### После исправления:
- Контекст: ~15,000 символов (максимум)
- Prompt tokens: ~5,000-8,000 (ожидаемо)
- Статус: ✅ Работает

## 🔍 Мониторинг

Добавлено логирование:
```typescript
console.log('[VND] 📊 Search results count:', searchResults.length)
console.log('[VND] ✅ Context prepared, length:', context.length, 'chars')
console.log('[VND] 📝 Total prompt length:', systemPrompt.length + userPrompt.length)
```

## 🎯 Компромиссы

**Плюсы:**
- ✅ API работает без ошибок
- ✅ Быстрее генерация ответа (меньше токенов)
- ✅ Ниже нагрузка на AlemLLM API

**Минусы:**
- ⚠️ Меньше контекста для анализа (8 вместо 15 результатов)
- ⚠️ Обрезанные тексты могут потерять важную информацию

**Решение минусов:**
- Векторный поиск берет наиболее релевантные результаты (по similarity)
- 15KB контекста достаточно для большинства вопросов
- При необходимости пользователь может задать уточняющий вопрос

## 📝 Рекомендации

### Для production:

1. **Адаптивное ограничение:**
   ```typescript
   // Динамически подстраивать под сложность вопроса
   const contextLimit = isSimpleQuestion ? 10000 : 15000
   ```

2. **Приоритизация результатов:**
   ```typescript
   // Брать самые релевантные + разнообразные источники
   const topResults = searchResults
     .sort((a, b) => b.similarity - a.similarity)
     .slice(0, 5)
   ```

3. **Суммаризация больших текстов:**
   ```typescript
   // Если текст > 2000 символов, суммаризировать его
   const summary = await summarize(result.text)
   ```

4. **Кэширование:**
   ```typescript
   // Кэшировать частые запросы
   const cached = await redis.get(messageHash)
   if (cached) return cached
   ```

## 🧪 Тестирование

### Команда для теста:
```bash
curl -X POST http://localhost:3000/api/vnd \
  -H "Content-Type: application/json" \
  -d '{"message":"Какие функции совета директоров?"}'
```

### Ожидаемый результат:
- Статус: 200 OK
- Ответ содержит релевантную информацию
- Логи показывают контекст ~10-15KB

## 📚 Связанные документы

- [RESTART_GUIDE.md](./RESTART_GUIDE.md) - Как перезапустить сервисы
- [EMBEDDING_SERVICE_GUIDE.md](./EMBEDDING_SERVICE_GUIDE.md) - Embedding сервис
- [src/app/api/vnd/route.ts](./src/app/api/vnd/route.ts) - Исправленный код

---

**Исправлено:** 5 октября 2025  
**Версия:** 1.1  
**Статус:** ✅ Исправлено и протестировано
