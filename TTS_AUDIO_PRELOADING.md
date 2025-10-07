# TTS Audio Preloading - Complete Implementation

## Задача

Генерировать аудио для всех трёх вкладок (VND, Legal, Summary) **во время анализа документа**, чтобы пользователь мог сразу слушать результаты без ожидания генерации.

## Преимущества

**До (без предзагрузки):**
1. Анализ документа: 90-120 секунд
2. Пользователь открывает результаты
3. Нажимает "🔊 Озвучить"
4. **Ждёт генерацию аудио: 30-40 секунд** ⏳
5. Слушает

**После (с предзагрузкой):**
1. Анализ документа: 90-120 секунд
2. **Параллельная генерация 3 аудио: 30-40 секунд** (фоном)
3. Пользователь открывает результаты
4. Нажимает "🔊 Озвучить"
5. **Мгновенно начинает слушать!** ⚡

**Экономия времени: 30-40 секунд на каждой вкладке!**

## Архитектура

### 1. Обновлённый интерфейс `AnalysisResult`

```typescript
interface AnalysisResult {
  vnd: string
  np: string
  summary: string
  fileName?: string
  timestamp?: Date
  language?: 'ru' | 'kk' | 'en'
  audioUrls?: {
    vnd?: string      // Предзагруженное аудио для VND
    np?: string       // Предзагруженное аудио для Legal
    summary?: string  // Предзагруженное аудио для Summary
  }
}
```

### 2. Preloader (`src/lib/tts-preloader.ts`)

```typescript
export async function preloadTTSAudio(
  texts: { vnd: string, np: string, summary: string },
  lang: 'kk' | 'ru' | 'en',
  onProgress?: (progress: PreloadProgress) => void
): Promise<PreloadResult>
```

**Функциональность:**
- Генерирует 3 аудио **параллельно** (Promise.all)
- Очищает тексты от Markdown перед генерацией
- Поддерживает progress callbacks
- Обрабатывает ошибки для каждой вкладки отдельно
- Возвращает Blob URLs

**Пример использования:**
```typescript
const audioUrls = await preloadTTSAudio(
  {
    vnd: vndResult,
    np: npResult,
    summary: summaryResult
  },
  'kk',
  (progress) => {
    console.log(`Progress: ${progress.current}/3 - ${progress.step}`)
  }
)

// Result:
// {
//   vnd: "blob:http://localhost:3001/abc123...",
//   np: "blob:http://localhost:3001/def456...",
//   summary: "blob:http://localhost:3001/ghi789..."
// }
```

### 3. useTTS Hook Extension

**Новый метод `playFromUrl()`:**
```typescript
const tts = useTTS(...)

// Воспроизведение предзагруженного аудио
tts.playFromUrl(audioUrl, text)

// Вместо генерации нового
tts.play(text) // Старый способ
```

**Преимущества:**
- Мгновенное воспроизведение (нет запроса к API)
- Поддержка pause/resume/stop
- Совместимость с существующей логикой

### 4. Интеграция в процесс анализа

```typescript
// После получения всех результатов анализа
setAnalysisStep('audio-preload')

const audioUrls = await preloadTTSAudio(
  { vnd: vndResult, np: npResult, summary: summaryResult },
  language,
  (progress) => setAudioPreloadProgress(progress)
)

const analysisWithMetadata = {
  ...results,
  audioUrls // ✅ Сохраняем URL-ы
}

setAnalysisResult(analysisWithMetadata)
setAnalysisStep('complete')
```

### 5. Обновлённый UI Flow

**Прогресс-бар:**
- 0%: Upload
- 25%: VND Analysis
- 50%: Legal Analysis  
- 75%: Summary Generation
- **90%: 🎵 Audio Preload** (NEW!)
- 100%: Complete

**Новый шаг в списке:**
```tsx
<StepRow
  title="🎵 Генерация аудио"
  active={analysisStep === 'audio-preload'}
  done={analysisStep === 'complete'}
  idle={...}
/>
```

### 6. handleTTSClick Logic

```typescript
const handleTTSClick = () => {
  // Получаем предзагруженное аудио для текущей вкладки
  const preloadedUrl = analysisResult?.audioUrls?.[activeTab]
  
  if (preloadedUrl) {
    console.log('🎵 Using preloaded audio')
    tts.playFromUrl(preloadedUrl, currentTabText) // ⚡ Мгновенно!
  } else {
    console.log('🎤 Generating new audio')
    tts.play(currentTabText) // Fallback на генерацию
  }
}
```

## Логи в консоли

### Во время анализа:

```
[VND] 🎵 Starting audio preload...
[TTS Preloader] 🎬 Starting preload for 3 tabs
[TTS Preloader] 🌐 Language: kk
[TTS Preloader] 🧹 Cleaned text lengths: {vnd: 4995, np: 4850, summary: 3210}
[TTS Preloader] 🎤 Generating VND audio...
[TTS Preloader] 🎤 Generating Legal audio...
[TTS Preloader] 🎤 Generating Summary audio...

// 30-40 секунд спустя...

[TTS Preloader] ✅ VND audio ready
[TTS Preloader] ✅ Legal audio ready
[TTS Preloader] ✅ Summary audio ready
[TTS Preloader] 🎉 Preload complete: 3 / 3 successful
[VND] ✅ Audio preload complete: {vnd: "blob:...", np: "blob:...", summary: "blob:..."}
```

### При нажатии кнопки TTS:

```
[VND] 🎵 TTS Click: {
  isPlaying: false,
  isPaused: false,
  hasPreloadedUrl: true,  // ✅
  activeTab: 'vnd'
}
[VND] 🎵 Using preloaded audio
[useTTS] 🎵 Playing from preloaded URL
[useTTS] ▶️ Preloaded audio playing  // ⚡ Мгновенно!
```

## Обработка ошибок

### Если одна из генераций упала:

```typescript
const audioUrls = {
  vnd: "blob:...",
  np: undefined,        // ❌ Ошибка генерации
  summary: "blob:...",
  errors: {
    np: Error("Generation failed")
  }
}
```

**Fallback:** При клике на Legal вкладке будет генерация в реальном времени:
```typescript
if (preloadedUrl) {
  tts.playFromUrl(preloadedUrl, text) // ✅ Для VND и Summary
} else {
  tts.play(text) // 🎤 Fallback для Legal
}
```

## Управление памятью

### Blob URLs

```typescript
// Создание
audioUrl = URL.createObjectURL(blob)  // "blob:http://localhost:3001/..."

// Очистка (при unmount компонента)
useEffect(() => {
  return () => {
    if (analysisResult?.audioUrls) {
      revokeAudioUrls(analysisResult.audioUrls)
    }
  }
}, [analysisResult])
```

### Размер в памяти

- Каждое аудио: ~2MB (MP3, 48kbps)
- 3 вкладки: ~6MB
- Кэш useTTS: дополнительно
- **Итого: ~10-15MB RAM**

## Производительность

### Параллельная генерация

**Promise.all vs Последовательная:**

```typescript
// ❌ Последовательная (120 секунд)
await generateVND()   // 40 сек
await generateLegal() // 40 сек
await generateSummary() // 40 сек

// ✅ Параллельная (40 секунд)
await Promise.all([
  generateVND(),
  generateLegal(),
  generateSummary()
])
```

**Экономия: 80 секунд!**

### Общее время анализа

| Этап | Без предзагрузки | С предзагрузкой |
|------|-----------------|----------------|
| Анализ документа | 90-120 сек | 90-120 сек |
| Генерация аудио | - | +30-40 сек (параллельно) |
| **Итого до результатов** | **90-120 сек** | **120-160 сек** |
| Клик "Озвучить" | +30-40 сек ⏳ | Мгновенно! ⚡ |
| **Итого до прослушивания** | **120-160 сек** | **120-160 сек** |

**Вывод:** Общее время одинаковое, но UX значительно лучше!

## Преимущества UX

1. **🚀 Мгновенное воспроизведение**
   - Пользователь не ждёт после клика
   - Кнопка реагирует сразу

2. **🔄 Быстрое переключение вкладок**
   - Вкладка 1 → играет сразу
   - Вкладка 2 → играет сразу
   - Вкладка 3 → играет сразу

3. **💾 Кэширование работает**
   - Возврат на вкладку → из кэша
   - Никаких повторных генераций

4. **📊 Прогресс виден пользователю**
   - "🎵 Генерация аудио" в списке шагов
   - Прогресс-бар 90%
   - Пользователь понимает, что происходит

## Тестирование

### Сценарий 1: Успешная предзагрузка

1. Загрузить документ
2. Запустить анализ
3. Дождаться шага "🎵 Генерация аудио" (90%)
4. Открыть результаты (100%)
5. Нажать "🔊 Озвучить" → **мгновенно играет** ✅
6. Переключить вкладку → нажать "🔊 Озвучить" → **мгновенно играет** ✅

### Сценарий 2: Ошибка генерации

1. Отключить TTS API (симуляция)
2. Запустить анализ
3. Дождаться результатов
4. Нажать "🔊 Озвучить" → **fallback на live генерацию** ✅

### Сценарий 3: Повторное использование

1. Загрузить документ 1 → прослушать
2. Загрузить документ 2 → прослушать
3. Вернуться к документу 1 (из localStorage) → **аудио нет, нужна генерация** ⚠️

**Note:** localStorage не поддерживает Blob URLs, поэтому при перезагрузке страницы предзагрузка не работает.

## Ограничения

1. **Не работает после перезагрузки страницы**
   - Blob URLs не сохраняются в localStorage
   - Fallback на live генерацию

2. **Размер памяти**
   - ~10-15MB RAM
   - Может быть проблемой на старых устройствах

3. **Время общего анализа увеличивается**
   - +30-40 секунд
   - Но UX лучше (пользователь не ждёт после клика)

## Возможные улучшения

### 1. IndexedDB Storage

```typescript
// Сохранение Blob в IndexedDB
await db.audioCache.put({
  key: `${documentHash}-${tab}`,
  blob: audioBlob,
  timestamp: Date.now()
})

// Восстановление после перезагрузки
const cached = await db.audioCache.get(`${documentHash}-vnd`)
if (cached && Date.now() - cached.timestamp < 3600000) { // 1 час
  const url = URL.createObjectURL(cached.blob)
  tts.playFromUrl(url, text)
}
```

### 2. Progressive Preload

```typescript
// Предзагружать только активную вкладку сразу
await preloadTTSAudio({ [activeTab]: result[activeTab] }, lang)

// Остальные вкладки - в фоне с низким приоритетом
setTimeout(() => {
  preloadTTSAudio({ 
    ...otherTabs 
  }, lang)
}, 2000)
```

### 3. Compression

```typescript
// Использовать более низкий bitrate
const audioUrl = await ttsClient.generateSpeechURL(text, lang, {
  bitrate: '32kbps' // Вместо 48kbps
})

// Размер: ~1.3MB вместо ~2MB
```

## Статус

✅ **Полностью реализовано и готово к тестированию**

### Файлы:
- `src/lib/tts-preloader.ts` - Preloader утилита
- `src/hooks/useTTS.ts` - Добавлен `playFromUrl()`
- `src/app/virtual-director/page.tsx` - Интеграция в процесс анализа

### Проверить:
1. Анализ документа → шаг "🎵 Генерация аудио" появляется
2. Результаты готовы → нажать "🔊 Озвучить" → мгновенно играет
3. Переключение вкладок → мгновенное воспроизведение
4. Консоль браузера → логи подтверждают использование preloaded audio

---

**Дата:** 6 октября 2025 г.
