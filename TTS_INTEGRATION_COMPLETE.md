# 🎤 TTS Integration Complete - Виртуальный директор

## ✅ Что реализовано

Полная интеграция Text-to-Speech в страницу Виртуального директора с поддержкой:
- ✅ Озвучка активной вкладки (Итоговое решение / Анализ ВНД / Анализ НПА)
- ✅ Воспроизведение / Пауза / Продолжение
- ✅ Автоматическое определение языка (русский/казахский)
- ✅ Переключение между вкладками (авто-стоп текущей озвучки)
- ✅ Красивая анимированная кнопка с состояниями

## 📁 Созданные файлы

### 1. **`src/lib/tts-client.ts`** - TTS API клиент
- Класс для работы с TTS API
- Генерация аудио из текста
- Поддержка казахского и русского языков
- Логирование для отладки

### 2. **`src/hooks/useTTS.ts`** - React Hook для TTS
- Управление состоянием TTS (idle/loading/playing/paused/error)
- Play / Pause / Stop / Toggle функции
- Автоопределение языка по тексту
- Автоматическая очистка ресурсов
- Event callbacks (onPlay, onPause, onEnd, onError)

### 3. **`src/components/tts-button.tsx`** - UI компонент кнопки
- Анимированная кнопка с Framer Motion
- 5 состояний: idle / loading / playing / paused / error
- Иконки для каждого состояния
- Пульсирующий эффект при воспроизведении
- Tooltip подсказки

### 4. **Обновлен `src/app/virtual-director/page.tsx`**
- Интеграция useTTS hook
- Кнопка озвучки в результатах анализа
- Автоматическое определение текста активной вкладки
- Остановка озвучки при переключении вкладок

### 5. **Обновлены `.env.local` и `.env.example`**
- Добавлена переменная `NEXT_PUBLIC_TTS_API_URL`

## 🎯 Как это работает

### Пользовательский сценарий:

1. **Загрузка документа** → Анализ → Получение результатов
2. **Клик на кнопку "🔊 Озвучить"**
   - Генерируется аудио для текущей вкладки
   - Начинается воспроизведение
   - Кнопка меняется на "⏸ Пауза"
3. **Клик на "Пауза"**
   - Аудио ставится на паузу
   - Кнопка меняется на "▶ Продолжить"
4. **Клик на "Продолжить"**
   - Аудио продолжается с места остановки
5. **Переключение вкладки**
   - Текущая озвучка останавливается
   - Можно озвучить новую вкладку

### Техническая реализация:

```typescript
// 1. Hook инициализация
const tts = useTTS({
  onError: (error) => alert('Ошибка озвучки')
})

// 2. Получение текста активной вкладки
const currentTabText = useMemo(() => {
  switch (activeTab) {
    case 'summary': return analysisResult.summary
    case 'vnd': return analysisResult.vnd
    case 'np': return analysisResult.np
  }
}, [analysisResult, activeTab])

// 3. Обработка клика
const handleTTSClick = () => {
  // Toggle play/pause или start new
  tts.toggle(currentTabText)
}

// 4. Остановка при смене вкладки
useEffect(() => {
  if (tts.isPlaying || tts.isPaused) {
    tts.stop()
  }
}, [activeTab])
```

## 🔧 API Reference

### useTTS Hook

```typescript
const tts = useTTS({
  autoDetectLanguage?: boolean  // default: true
  onPlay?: () => void
  onPause?: () => void
  onEnd?: () => void
  onError?: (error: Error) => void
})

// Возвращает:
{
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'
  currentText: string
  currentLang: 'kk' | 'ru'
  isPlaying: boolean
  isPaused: boolean
  isLoading: boolean
  isError: boolean
  play: (text?: string, lang?: 'kk' | 'ru') => Promise<void>
  pause: () => void
  stop: () => void
  toggle: (text?: string, lang?: 'kk' | 'ru') => Promise<void>
}
```

### TTSButton Component

```typescript
<TTSButton
  onClick={() => {}}
  isPlaying={boolean}
  isPaused={boolean}
  isLoading={boolean}
  isError={boolean}
  className={string}  // optional
/>
```

## 🌐 Автоопределение языка

Логика определения языка в `useTTS.ts`:

```typescript
const detectLanguage = (text: string): 'kk' | 'ru' => {
  // Казахские символы: ә, ғ, қ, ң, ө, ұ, ү, һ, і
  const kazakhChars = /[әғқңөұүһі]/i
  return kazakhChars.test(text) ? 'kk' : 'ru'
}
```

**Примеры:**
- `"Привет, мир!"` → `ru`
- `"Сәлем, қалайсың?"` → `kk`
- `"Hello world"` → `ru` (fallback)

## 🎨 UI Состояния кнопки

| Состояние | Иконка | Текст | Цвет |
|-----------|--------|-------|------|
| idle | ▶️ | 🔊 Озвучить | Белый/Граница золотая |
| loading | ⏳ (spinner) | Генерация... | Серый |
| playing | ⏸ | Пауза | Золотой + пульсация |
| paused | ▶️ | Продолжить | Белый/Граница золотая |
| error | ⚠️ | Ошибка | Красный |

## 🧪 Тестирование

### 1. Проверка базовой функциональности

```bash
# Запустить Next.js
npm run dev

# Перейти на страницу виртуального директора
# http://localhost:3000/virtual-director

# Загрузить документ и получить анализ
# Проверить:
# ✓ Кнопка "🔊 Озвучить" появляется
# ✓ Клик на кнопку → начинается воспроизведение
# ✓ Клик еще раз → пауза
# ✓ Клик еще раз → продолжение
# ✓ Переключение вкладки → остановка озвучки
```

### 2. Проверка автоопределения языка

```javascript
// В консоли браузера:
const detectLanguage = (text) => {
  const kazakhChars = /[әғқңөұүһі]/i
  return kazakhChars.test(text) ? 'kk' : 'ru'
}

console.log(detectLanguage("Сәлем"))  // "kk"
console.log(detectLanguage("Привет"))  // "ru"
```

### 3. Проверка состояний

- [ ] Loading: показывается spinner
- [ ] Playing: кнопка золотая с пульсацией
- [ ] Paused: кнопка с иконкой play
- [ ] Error: кнопка красная с предупреждением

## 🔍 Troubleshooting

### Проблема: Кнопка не появляется

**Причина:** Next.js не перезагрузился после добавления файлов

**Решение:**
```bash
# Остановить Next.js (Ctrl+C)
# Запустить снова
npm run dev
```

### Проблема: Ошибка "TTS API error"

**Причина:** TTS API недоступен или неправильный URL

**Проверка:**
```bash
curl -X POST "https://tts.sk-ai.kz/api/tts" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test","lang":"ru"}'
```

**Решение:**
- Проверить `NEXT_PUBLIC_TTS_API_URL` в `.env.local`
- Проверить доступность API

### Проблема: Аудио не воспроизводится

**Причина:** Браузер блокирует autoplay

**Решение:** 
- Пользователь должен кликнуть на кнопку (не autoplay)
- Проверить консоль браузера на ошибки
- Попробовать в режиме инкогнито

### Проблема: Неправильное определение языка

**Причина:** Текст не содержит специфичных символов

**Решение:**
- Указать язык явно: `tts.play(text, 'kk')`
- Улучшить логику определения в `useTTS.ts`

## 📊 Performance

### Метрики:

- **Генерация аудио:** 1-3 секунды
- **Размер аудио:** ~1 KB на символ текста
- **Качество:** 48 kbps, 24 kHz, Mono
- **Формат:** MP3

### Оптимизация:

1. **Кэширование** (будущее улучшение):
```typescript
const cache = new Map<string, Blob>()

const getCachedAudio = (text: string) => {
  const hash = sha256(text)
  return cache.get(hash)
}
```

2. **Chunking для длинных текстов** (будущее):
```typescript
const chunkText = (text: string, maxLength = 2000) => {
  // Split по предложениям
  // Генерировать аудио для каждого chunk
  // Объединять аудио
}
```

## 🚀 Следующие шаги

### Планируемые улучшения:

1. **Прогресс-бар воспроизведения**
   - Показать сколько осталось
   - Перемотка по клику

2. **Скорость воспроизведения**
   - Кнопки 0.75x / 1x / 1.25x / 1.5x

3. **Скачивание аудио**
   - Кнопка "Скачать MP3"

4. **Кэширование**
   - Сохранять сгенерированное аудио
   - Не генерировать повторно

5. **Chunking для длинных текстов**
   - Разбивать на части
   - Плавные переходы

## 📚 Связанные документы

- [TTS_API_TESTING.md](./TTS_API_TESTING.md) - Результаты тестирования API
- [test_tts_api.py](./test_tts_api.py) - Python скрипт для тестов
- [test_tts_api.sh](./test_tts_api.sh) - Bash скрипт для тестов

---

**Реализовано:** 6 октября 2025  
**Версия:** 1.0  
**Статус:** ✅ Готово к использованию
