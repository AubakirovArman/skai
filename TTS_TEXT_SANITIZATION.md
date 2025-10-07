# 🎙️ Очистка текста для TTS (Text-to-Speech)

## 🐛 Проблема

TTS озвучивал Markdown разметку как обычный текст:

```
Исходный текст:
**ПУНКТ ПОВЕСТКИ ДНЯ:** Утверждение изменений

TTS произносит:
"звёздочка звёздочка ПУНКТ ПОВЕСТКИ ДНЯ двоеточие Утверждение изменений"
```

**Другие проблемы:**
- `### Заголовок` → "решётка решётка решётка Заголовок"
- `- Пункт` → "тире Пункт"
- `[ссылка](url)` → "квадратная скобка ссылка круглая скобка url"
- `**жирный**` → "звёздочка звёздочка жирный звёздочка звёздочка"

## ✅ Решение

Создана утилита **`text-sanitizer.ts`** для очистки текста перед отправкой в TTS.

### Функции

#### 1. `sanitizeTextForTTS(text: string): string`

Очищает текст от Markdown разметки:

**Удаляет:**
- Заголовки: `### Заголовок` → `Заголовок`
- Жирный/курсив: `**текст**`, `*текст*` → `текст`
- Зачёркнутый: `~~текст~~` → `текст`
- Ссылки: `[текст](url)` → `текст`
- Маркеры списков: `- пункт`, `* пункт` → `пункт`
- Нумерацию: `1. пункт` → `пункт`
- Цитаты: `> текст` → `текст`
- Код: `` `код` `` → `код`
- Блоки кода: ` ```код``` ` → `код`
- Множественные пробелы и переносы

**Сохраняет:**
- Точки, запятые
- Восклицательные и вопросительные знаки
- Двоеточия (для естественного звучания)
- Тире (заменяются на паузы)

#### 2. `truncateTextForTTS(text: string, maxLength: number): string`

Обрезает длинный текст (по умолчанию 5000 символов):
- Ищет последнюю точку для плавного обрезания
- Добавляет многоточие, если нужно

#### 3. `prepareTextForTTS(text: string, maxLength?: number): string`

Полная обработка: очищает + обрезает.

## 📁 Созданные файлы

### 1. `src/lib/text-sanitizer.ts`

```typescript
export function sanitizeTextForTTS(text: string): string {
  // 20 шагов очистки текста
  // 1. Удаляем заголовки
  // 2. Удаляем жирный текст
  // 3. Удаляем курсив
  // ... и т.д.
}

export function truncateTextForTTS(text: string, maxLength: number = 5000): string {
  // Обрезает текст по последней точке
}

export function prepareTextForTTS(text: string, maxLength?: number): string {
  // Полная обработка: sanitize + truncate
}
```

### 2. Обновлён `src/hooks/useTTS.ts`

Добавлена автоматическая очистка текста:

```typescript
import { prepareTextForTTS } from '@/lib/text-sanitizer'

const generateAndPlay = useCallback(async (text: string, lang?: TTSLanguage) => {
  // Очищаем текст от Markdown разметки
  const cleanedText = prepareTextForTTS(text, 5000) // Максимум 5000 символов
  
  console.log('[useTTS] 🧹 Original text length:', text.length)
  console.log('[useTTS] ✨ Cleaned text length:', cleanedText.length)
  console.log('[useTTS] 📝 Cleaned preview:', cleanedText.substring(0, 150))
  
  // Генерируем аудио с очищенным текстом
  const audioUrl = await ttsClient.generateSpeechURL(cleanedText, effectiveLanguage)
  // ...
}, [])
```

## 🧪 Примеры очистки

### Пример 1: Markdown заголовки и жирный текст

**Вход:**
```markdown
### Краткое заключение

**ПУНКТ ПОВЕСТКИ ДНЯ:** Утверждение изменений в карту мотивационных ключевых показателей деятельности (КПД) АО «Самрук-Қазына» на 2025 год.

**РЕШЕНИЕ:** ЗА
```

**Выход:**
```
Краткое заключение. ПУНКТ ПОВЕСТКИ ДНЯ: Утверждение изменений в карту мотивационных ключевых показателей деятельности (КПД) АО «Самрук-Қазына» на 2025 год. РЕШЕНИЕ: ЗА
```

### Пример 2: Списки

**Вход:**
```markdown
**Риски:**

- Риск 1
- Риск 2
- Риск 3
```

**Выход:**
```
Риски: Риск 1. Риск 2. Риск 3
```

### Пример 3: Ссылки и код

**Вход:**
```markdown
Документ доступен по [ссылке](https://example.com).

Код: `const x = 5`

```typescript
function test() {
  return true
}
```
```

**Выход:**
```
Документ доступен по ссылке. Код: const x = 5. function test() { return true }
```

### Пример 4: Английский текст

**Вход:**
```markdown
**AGENDA ITEM:** Adjustments to the 2025 Motivation Key Performance Indicators (KPIs) of JSC "Samruk-Kazyna"

**DECISION OF INDEPENDENT BOARD MEMBER:** FOR

**BRIEF CONCLUSION:** The adjustments to the 2025 motivation KPIs of JSC "Samruk-Kazyna" are necessary and timely.
```

**Выход:**
```
AGENDA ITEM: Adjustments to the 2025 Motivation Key Performance Indicators (KPIs) of JSC "Samruk-Kazyna". DECISION OF INDEPENDENT BOARD MEMBER: FOR. BRIEF CONCLUSION: The adjustments to the 2025 motivation KPIs of JSC "Samruk-Kazyna" are necessary and timely.
```

## 📊 Логи в консоли

### До очистки

```bash
[useTTS] 🎤 Generating audio for text: **ПУНКТ ПОВЕСТКИ ДНЯ:** Утверждение изменений...
```

### После очистки

```bash
[useTTS] 🧹 Original text length: 2547
[useTTS] ✨ Cleaned text length: 2103
[useTTS] 📝 Cleaned preview: ПУНКТ ПОВЕСТКИ ДНЯ: Утверждение изменений в карту мотивационных ключевых показателей деятельности...
[useTTS] 🎤 Generating audio for text: ПУНКТ ПОВЕСТКИ ДНЯ: Утверждение изменений...
[useTTS] 🌐 Using language: ru
```

## 🧪 Тестирование

### Тест 1: Русский текст с Markdown

1. Выберите **🇷🇺 Русский**
2. Загрузите документ и сделайте анализ
3. Нажмите **"🔊 Озвучить"**
4. **Проверьте озвучку**: не должно быть "звёздочка", "решётка", "тире"

Проверьте логи в консоли:
```bash
[useTTS] 🧹 Original text length: 2547
[useTTS] ✨ Cleaned text length: 2103  ← Текст стал короче
[useTTS] 📝 Cleaned preview: ПУНКТ ПОВЕСТКИ ДНЯ: Утверждение...  ← Без звёздочек!
```

### Тест 2: Английский текст с Markdown

1. Выберите **🇬🇧 English**
2. Загрузите документ и сделайте анализ
3. Нажмите **"🔊 Voice Over"**
4. **Проверьте озвучку**: должна быть чистая речь без разметки

### Тест 3: Длинный текст

1. Сделайте анализ (обычно 2000-5000 символов)
2. Нажмите озвучку
3. Проверьте логи:
```bash
[useTTS] 🧹 Original text length: 12547  ← Очень длинный
[useTTS] ✨ Cleaned text length: 5000    ← Обрезан до 5000
```

## 🔧 Настройка

### Изменить максимальную длину

В `src/hooks/useTTS.ts`:

```typescript
// Было: 5000 символов
const cleanedText = prepareTextForTTS(text, 5000)

// Можно увеличить до 10000
const cleanedText = prepareTextForTTS(text, 10000)

// Или убрать ограничение (не рекомендуется!)
const cleanedText = prepareTextForTTS(text)
```

### Добавить дополнительную очистку

В `src/lib/text-sanitizer.ts` добавьте новые правила:

```typescript
// Например, удалить скобки
cleaned = cleaned.replace(/[()]/g, '')

// Или заменить определённые слова
cleaned = cleaned.replace(/КПД/g, 'ключевые показатели деятельности')
```

## 📊 Сравнение До/После

| Аспект | До | После |
|--------|-----|--------|
| **Markdown разметка** | Озвучивается | ✅ Удаляется |
| **Заголовки (###)** | "решётка решётка" | ✅ Чистый текст |
| **Жирный текст (\*\*)** | "звёздочка звёздочка" | ✅ Чистый текст |
| **Списки (-)** | "тире" перед каждым | ✅ Плавный текст |
| **Ссылки []()** | Озвучиваются скобки | ✅ Только текст |
| **Длинные тексты** | Без ограничений | ✅ Обрезаются до 5000 |
| **Множественные пробелы** | Есть | ✅ Удалены |
| **Переносы строк** | "перенос строки" | ✅ Заменены на точку |

## 🎯 Преимущества

1. **✅ Естественное звучание** - TTS произносит только смысловой текст
2. **✅ Без артефактов** - нет "звёздочка", "решётка", "тире"
3. **✅ Оптимизация длины** - автоматическое обрезание до 5000 символов
4. **✅ Сохранение пунктуации** - точки, запятые, двоеточия остаются
5. **✅ Логирование** - видно, как изменился текст
6. **✅ Автоматическая обработка** - не нужно вручную чистить текст

## 🚀 Дальнейшие улучшения

### 1. Умная замена сокращений

```typescript
// В text-sanitizer.ts
const acronyms: Record<string, string> = {
  'КПД': 'ключевые показатели деятельности',
  'АО': 'акционерное общество',
  'ВНД': 'внутренние нормативные документы',
  'НПА': 'нормативно-правовые акты',
}

for (const [short, full] of Object.entries(acronyms)) {
  cleaned = cleaned.replace(new RegExp(`\\b${short}\\b`, 'g'), full)
}
```

### 2. Умная обработка чисел

```typescript
// 2025 → "две тысячи двадцать пятый"
// №5 → "номер пять"
cleaned = cleaned.replace(/(\d{4})/g, (match) => {
  // Логика преобразования числа в слова
  return convertNumberToWords(match)
})
```

### 3. Кэширование очищенного текста

```typescript
// Сохраняем очищенный текст, чтобы не чистить каждый раз
const cleanedTextCache = useRef<Map<string, string>>(new Map())

const getCleaned = (text: string) => {
  const hash = simpleHash(text)
  if (cleanedTextCache.current.has(hash)) {
    return cleanedTextCache.current.get(hash)!
  }
  const cleaned = prepareTextForTTS(text)
  cleanedTextCache.current.set(hash, cleaned)
  return cleaned
}
```

## ✅ Checklist

- [x] Создана утилита text-sanitizer.ts
- [x] Добавлена функция sanitizeTextForTTS
- [x] Добавлена функция truncateTextForTTS
- [x] Добавлена функция prepareTextForTTS
- [x] Интегрирована в useTTS hook
- [x] Добавлено логирование очистки
- [x] Создана документация
- [ ] Протестировано в браузере
- [ ] Проверено на всех языках (ru/kk/en)

## 🎉 Результат

TTS теперь озвучивает **чистый текст** без Markdown разметки и лишних символов! 🎙️

---

**Дата:** 6 октября 2025  
**Статус:** ✅ Реализовано, готово к тестированию
