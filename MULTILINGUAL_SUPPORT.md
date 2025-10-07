# 🌍 Поддержка мультиязычности (i18n)

## Обзор

Система SKAI поддерживает три языка интерфейса и анализа:
- 🇷🇺 **Русский (ru)** - язык по умолчанию
- 🇰🇿 **Казахский (kk)** - полная поддержка
- 🇬🇧 **Английский (en)** - полная поддержка

## 🎯 Как это работает

### 1. Язык интерфейса

Пользователь выбирает язык в интерфейсе, который сохраняется в:
- **localStorage**: `skai-language`
- **React Context**: `LanguageContext`

```typescript
// src/contexts/language-context.tsx
export type Language = 'ru' | 'kk' | 'en'

const { language, setLanguage } = useLanguage()
// language: 'ru' | 'kk' | 'en'
```

### 2. Язык анализа

Когда пользователь нажимает "Начать анализ", система:

1. **Запоминает язык интерфейса**
2. **Передаёт его во все API endpoints**:
   ```typescript
   // Frontend: src/app/virtual-director/page.tsx
   await fetch('/api/analyze/vnd', {
     body: JSON.stringify({
       documentContent: text,
       language: language // 'ru' | 'kk' | 'en'
     })
   })
   ```

3. **Backend генерирует ответ на этом языке**:
   ```typescript
   // Backend: src/app/api/analyze/vnd/route.ts
   const { documentContent, language = 'ru' } = await request.json()
   
   // Выбирает промпт на нужном языке
   const prompts = languageInstructions[language]
   const result = await alemllm.complete(prompts.user, prompts.system)
   ```

### 3. Язык озвучки (TTS)

TTS автоматически использует тот же язык, что и интерфейс:

```typescript
// src/app/virtual-director/page.tsx
const tts = useTTS({
  language: language // Передаём язык интерфейса
})
```

**⚠️ Важно**: TTS API поддерживает только `kk` и `ru`. Если язык интерфейса `en`, система автоматически использует русский для озвучки.

## 📁 Файлы системы

### 1. Контекст языка

**`src/contexts/language-context.tsx`**
```typescript
export type Language = 'ru' | 'kk' | 'en'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ru')
  
  // Загружает из localStorage при инициализации
  useEffect(() => {
    const saved = localStorage.getItem('skai-language') as Language
    if (saved) setLanguage(saved)
  }, [])
  
  // Сохраняет при изменении
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('skai-language', lang)
  }
  
  return <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage }}>
}
```

### 2. Переводы интерфейса

**`src/locales/index.ts`**
```typescript
export const translations = {
  ru: {
    home: homeTranslations.ru,
    navigation: navigationTranslations.ru,
    virtualDirector: virtualDirectorTranslations.ru,
    chat: chatTranslations.ru,
    auth: authTranslations.ru
  },
  kk: { /* казахские переводы */ },
  en: { /* английские переводы */ }
}
```

**Использование:**
```typescript
const { language } = useLanguage()
const t = translations[language].virtualDirector

return <h1>{t.title}</h1>
```

### 3. API Endpoints с поддержкой языка

#### **VND Анализ** (`src/app/api/analyze/vnd/route.ts`)

```typescript
export async function POST(request: NextRequest) {
  const { documentContent, language = 'ru' } = await request.json()
  
  const languageInstructions = {
    ru: {
      system: `Ты эксперт-аналитик по корпоративным документам...`,
      user: `Контекст ВНД:\n${context}\n\nДокумент:\n${doc}\n\nАнализ:`
    },
    kk: {
      system: `Сіз корпоративтік құжаттар бойынша сарапшы...`,
      user: `ІНҚ контексті:\n${context}\n\nҚұжат:\n${doc}\n\nТалдау:`
    },
    en: {
      system: `You are an expert analyst on corporate documents...`,
      user: `ICD context:\n${context}\n\nDocument:\n${doc}\n\nAnalysis:`
    }
  }
  
  const prompts = languageInstructions[language]
  const result = await alemllm.complete(prompts.user, prompts.system)
  
  return NextResponse.json({ success: true, result })
}
```

#### **NPA Анализ** (`src/app/api/analyze/np/route.ts`)

Аналогично VND, но с промптами для правового анализа:
- **ru**: `Ты профессиональный юрист-аналитик по законодательству РК...`
- **kk**: `Сіз ҚР заңнамасы бойынша кәсіби заңгер...`
- **en**: `You are a professional legal analyst on the legislation of RK...`

#### **Summary** (`src/app/api/analyze/summary/route.ts`)

Объединяет результаты VND и NPA и генерирует итоговое заключение на выбранном языке:
- **ru**: `**ПУНКТ ПОВЕСТКИ ДНЯ:** ... **РЕШЕНИЕ:** ЗА | ПРОТИВ | ВОЗДЕРЖАЛСЯ`
- **kk**: `**КҮН ТӘРТІБІНІҢ ТАРМАҒЫ:** ... **ШЕШІМ:** ЖАҚ | ҚАРСЫ | БЕЙТАРАП`
- **en**: `**AGENDA ITEM:** ... **DECISION:** FOR | AGAINST | ABSTAINED`

### 4. TTS Hook с поддержкой языка

**`src/hooks/useTTS.ts`**

```typescript
export type TTSLanguage = 'kk' | 'ru' | 'en'

interface UseTTSOptions {
  language?: TTSLanguage // Язык из интерфейса
  autoDetectLanguage?: boolean // По умолчанию false
  onPlay?: () => void
  onPause?: () => void
  onEnd?: () => void
  onError?: (error: Error) => void
}

export function useTTS(options: UseTTSOptions = {}) {
  const { language, autoDetectLanguage = false } = options
  
  // Приоритет языков:
  // 1. Явно переданный язык в play(text, lang)
  // 2. Язык из options (язык интерфейса)
  // 3. Автоопределение (если включено)
  // 4. По умолчанию 'ru'
  
  const getEffectiveLanguage = (text: string, explicitLang?: TTSLanguage) => {
    if (explicitLang === 'kk' || explicitLang === 'ru') return explicitLang
    if (explicitLang === 'en') return 'ru' // Fallback для английского
    
    if (language === 'kk' || language === 'ru') return language
    if (language === 'en') return 'ru' // Fallback для английского
    
    if (autoDetectLanguage) return detectLanguage(text)
    
    return 'ru'
  }
  
  // ...
}
```

**Использование:**
```typescript
// В компоненте
const { language } = useLanguage()
const tts = useTTS({
  language: language // Передаём язык интерфейса
})

// TTS автоматически использует правильный язык
await tts.play(analysisResult.summary)
```

## 🔄 Поток данных

```
┌─────────────────────────────────────────────────────────────┐
│  1. Пользователь выбирает язык в UI                         │
│     setLanguage('en')                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Язык сохраняется                                        │
│     localStorage.setItem('skai-language', 'en')             │
│     LanguageContext.language = 'en'                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Пользователь загружает документ (на любом языке!)       │
│     uploadDocument('Протокол на русском.pdf')               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Нажимает "Start Analysis" (интерфейс на английском)     │
│     handleStartAnalysis()                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Frontend передаёт язык интерфейса в API                 │
│     POST /api/analyze/vnd                                   │
│     { documentContent: "...", language: "en" }              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Backend генерирует ответ на английском                  │
│     prompts = languageInstructions['en']                    │
│     result = "**ICD: KEY FINDINGS:** ..."                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Frontend показывает результат на английском             │
│     analysisResult.vnd = "**ICD: KEY FINDINGS:** ..."       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Пользователь нажимает "🔊 Voice Over"                   │
│     tts.play(analysisResult.vnd)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  9. TTS использует язык интерфейса                          │
│     language = 'en' → fallback to 'ru' (TTS не знает 'en')  │
│     POST /api/tts { text: "...", lang: "ru" }               │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Примеры использования

### Пример 1: Русский интерфейс → Русский анализ

```typescript
// 1. Пользователь выбирает русский
setLanguage('ru')

// 2. Загружает документ на любом языке
uploadDocument('Протокол.pdf')

// 3. Нажимает "Начать анализ"
// → API получает language: 'ru'
// → Генерирует ответ: "**ВНД: КЛЮЧЕВЫЕ ВЫВОДЫ:** ..."
// → TTS озвучивает на русском (lang: 'ru')
```

### Пример 2: Казахский интерфейс → Казахский анализ

```typescript
// 1. Пользователь выбирает казахский
setLanguage('kk')

// 2. Загружает документ на любом языке
uploadDocument('Protocol.docx')

// 3. Нажимает "Талдауды бастау"
// → API получает language: 'kk'
// → Генерирует ответ: "**ІНҚ: НЕГІЗГІ ҚОРЫТЫНДЫЛАР:** ..."
// → TTS озвучивает на казахском (lang: 'kk')
```

### Пример 3: Английский интерфейс → Английский анализ + Русская озвучка

```typescript
// 1. Пользователь выбирает английский
setLanguage('en')

// 2. Загружает документ на любом языке
uploadDocument('Minutes.pdf')

// 3. Нажимает "Start Analysis"
// → API получает language: 'en'
// → Генерирует ответ: "**ICD: KEY FINDINGS:** ..."
// → TTS озвучивает на русском (lang: 'ru', т.к. 'en' не поддерживается)
//   Console: "[useTTS] ⚠️ English TTS not supported, falling back to Russian"
```

## ⚙️ Настройка переводов

### Добавление нового перевода в интерфейс

1. **Обновите файл локализации**:

```typescript
// src/locales/virtual-director.ts
export const virtualDirectorTranslations = {
  ru: {
    title: "Виртуальный директор",
    startAnalysis: "Начать анализ",
    // ...
  },
  kk: {
    title: "Виртуалды директор",
    startAnalysis: "Талдауды бастау",
    // ...
  },
  en: {
    title: "Virtual Director",
    startAnalysis: "Start Analysis",
    // ...
  }
}
```

2. **Используйте в компоненте**:

```typescript
const { language } = useLanguage()
const t = translations[language].virtualDirector

return (
  <button onClick={handleStartAnalysis}>
    {t.startAnalysis}
  </button>
)
```

### Добавление нового языка анализа

Если нужно добавить новый язык (например, узбекский `uz`):

1. **Обновите тип языка**:
```typescript
// src/contexts/language-context.tsx
export type Language = 'ru' | 'kk' | 'en' | 'uz'
```

2. **Добавьте переводы интерфейса**:
```typescript
// src/locales/index.ts
export const translations = {
  // ... существующие
  uz: {
    home: homeTranslations.uz,
    // ...
  }
}
```

3. **Добавьте промпты в API endpoints**:
```typescript
// src/app/api/analyze/vnd/route.ts
const languageInstructions = {
  // ... существующие
  uz: {
    system: `Siz korporativ hujjatlar bo'yicha mutaxassis...`,
    user: `IND konteksti:\n${context}\n\nHujjat:\n${doc}\n\nTahlil:`
  }
}
```

4. **Если TTS поддерживает новый язык, обновите типы**:
```typescript
// src/hooks/useTTS.ts
export type TTSLanguage = 'kk' | 'ru' | 'en' | 'uz'

// И обновите getEffectiveLanguage для поддержки нового языка
```

## 🐛 Решение проблем

### Проблема: Анализ на русском, хотя выбран английский

**Причина**: Язык не передаётся в API запрос.

**Решение**: Проверьте, что в `handleStartAnalysis` передаётся `language`:
```typescript
await fetch('/api/analyze/vnd', {
  body: JSON.stringify({
    documentContent: text,
    language: language // ← Должен быть здесь!
  })
})
```

### Проблема: TTS озвучивает на русском, хотя выбран казахский

**Причина**: Язык не передаётся в TTS hook.

**Решение**: Проверьте инициализацию TTS:
```typescript
const tts = useTTS({
  language: language // ← Должен быть здесь!
})
```

### Проблема: TTS озвучивает на английском (ошибка)

**Причина**: TTS API не поддерживает английский.

**Ожидаемое поведение**: Система должна автоматически использовать русский. Проверьте логи:
```
[useTTS] ⚠️ English TTS not supported, falling back to Russian
[TTS Proxy] 🌐 Language: ru
```

## 📊 Поддерживаемые комбинации

| Язык интерфейса | Язык анализа | Язык TTS | Статус |
|-----------------|--------------|----------|--------|
| 🇷🇺 Русский     | ✅ Русский    | ✅ Русский | ✅ Полностью работает |
| 🇰🇿 Казахский   | ✅ Казахский  | ✅ Казахский | ✅ Полностью работает |
| 🇬🇧 Английский  | ✅ Английский | ⚠️ Русский (fallback) | ⚠️ Работает с предупреждением |

## 🚀 Будущие улучшения

1. **Добавить английскую озвучку**:
   - Интегрировать TTS сервис с поддержкой английского
   - Или использовать альтернативный сервис (Google TTS, Azure TTS)

2. **Автоопределение языка документа**:
   ```typescript
   const detectDocumentLanguage = (text: string): Language => {
     // Используем ML модель для определения языка
     // И предлагаем пользователю выбрать язык анализа
   }
   ```

3. **Многоязычный анализ**:
   ```typescript
   // Позволить анализировать документ на одном языке
   // И генерировать ответ на другом
   {
     documentLanguage: 'ru',
     analysisLanguage: 'en'
   }
   ```

4. **Параллельные переводы**:
   ```typescript
   // Показывать результаты на нескольких языках одновременно
   {
     results: {
       ru: "ВНД: КЛЮЧЕВЫЕ ВЫВОДЫ: ...",
       kk: "ІНҚ: НЕГІЗГІ ҚОРЫТЫНДЫЛАР: ...",
       en: "ICD: KEY FINDINGS: ..."
     }
   }
   ```

## ✅ Checklist для разработчиков

При добавлении новой функции проверьте:

- [ ] Интерфейс переведён на все 3 языка (ru/kk/en)
- [ ] API endpoints поддерживают параметр `language`
- [ ] Промпты созданы на всех языках
- [ ] TTS hook получает язык из контекста
- [ ] Добавлены логи для отладки языка
- [ ] Протестировано на всех языках
- [ ] Документация обновлена

---

**Дата создания:** 6 октября 2025  
**Версия:** 1.0  
**Статус:** ✅ Полностью реализовано
