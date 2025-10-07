# English TTS Fallback to Russian

## Проблема

TTS API (https://tts.sk-ai.kz/api/tts) поддерживает только 2 языка:
- ✅ Казахский (kk)
- ✅ Русский (ru)
- ❌ Английский (en) - **НЕ поддерживается**

## Решение

Реализован автоматический fallback с английского на русский язык.

### Где работает fallback:

1. **`src/hooks/useTTS.ts`** - `getEffectiveLanguage()`
   ```typescript
   if (explicitLang === 'en') {
     console.log('[useTTS] ⚠️ English TTS not supported, falling back to Russian')
     return 'ru'
   }
   ```

2. **`src/lib/tts-preloader.ts`** - `preloadTTSAudio()`
   ```typescript
   const effectiveLang: 'kk' | 'ru' = lang === 'en' ? 'ru' : lang
   if (lang === 'en') {
     console.log('[TTS Preloader] ⚠️ English not supported, using Russian')
   }
   ```

3. **`src/app/virtual-director/page.tsx`** - `handleTTSClick()`
   ```typescript
   if (language === 'en' && !tts.isPlaying && !tts.isPaused) {
     console.log('[VND] ⚠️ English TTS not supported, using Russian voice')
   }
   ```

## Как это работает

### Сценарий: Пользователь выбрал английский интерфейс

1. **Анализ документа:**
   - Интерфейс: English
   - Результаты анализа: на английском языке ✅
   - Предзагрузка аудио: использует русский голос 🇷🇺

2. **Логи в консоли:**
   ```
   [TTS Preloader] 🌐 Language: en
   [TTS Preloader] ⚠️ English not supported, using Russian
   [TTS Preloader] 🎤 Generating VND audio...
   [TTS Proxy] 🌐 Language: ru  ← Использует русский!
   ```

3. **Воспроизведение:**
   - Текст на экране: английский ✅
   - Голос озвучки: русский 🇷🇺
   - Пользователь слышит русское произношение английских слов

## Логи в консоли

### При предзагрузке:
```
[VND] 🎵 Starting audio preload...
[TTS Preloader] 🎬 Starting preload for 3 tabs
[TTS Preloader] 🌐 Language: en
[TTS Preloader] ⚠️ English not supported, using Russian
[TTS Proxy] 🌐 Language: ru
```

### При нажатии кнопки TTS:
```
[VND] ⚠️ English TTS not supported, using Russian voice
[VND] 🎵 Using preloaded audio
[useTTS] 🎵 Playing from preloaded URL
```

### В useTTS hook:
```
[useTTS] ⚠️ English TTS not supported, falling back to Russian
[useTTS] 🌐 Using language: ru
```

## Почему это нормально

1. **API ограничение:**
   - TTS API не поддерживает английский
   - Мы не можем это изменить со стороны клиента

2. **Русский - лучший fallback:**
   - Русский и английский используют латиницу/кириллицу
   - Русский голос может произносить английские слова (с акцентом)
   - Казахский голос хуже справляется с английским

3. **UX приемлем:**
   - Пользователь видит текст на английском ✅
   - Слышит озвучку с акцентом (но понятно)
   - Лучше, чем вообще без озвучки

## Альтернативные решения

### Вариант 1: Использовать Google TTS / AWS Polly
```typescript
// Добавить проверку языка
if (lang === 'en') {
  // Использовать внешний TTS сервис
  return await googleTTS.generate(text, 'en-US')
} else {
  // Использовать SK-AI TTS
  return await skaiTTS.generate(text, lang)
}
```

**Минусы:**
- Дополнительные затраты
- Нужна интеграция с внешними сервисами
- Разные голоса для разных языков

### Вариант 2: Предупреждение пользователю
```typescript
if (language === 'en') {
  toast.warning('English TTS is not supported. Using Russian voice.')
}
```

**Минусы:**
- Раздражает пользователя
- Очевидно при первом прослушивании

### Вариант 3: Отключить TTS для английского
```typescript
if (language === 'en') {
  return (
    <div className="text-sm text-gray-500">
      🔇 Audio not available for English
    </div>
  )
}
```

**Минусы:**
- Пользователь вообще не может слушать
- Хуже, чем русский fallback

## Текущее решение: Тихий fallback ✅

**Преимущества:**
- ✅ TTS работает для всех языков
- ✅ Не раздражает пользователя предупреждениями
- ✅ Логи в консоли для разработчиков
- ✅ Простая реализация
- ✅ Лучше, чем ничего

**Недостатки:**
- ⚠️ Русский акцент при озвучке английского текста
- ⚠️ Пользователь может не понять, почему голос русский

## Проверка

### Шаги:
1. Переключите интерфейс на **English**
2. Загрузите документ и запустите анализ
3. Результаты будут на английском
4. Нажмите "🔊 Speak"
5. Услышите **русский голос** с произношением английских слов

### Логи в консоли:
```
[VND] ⚠️ English TTS not supported, using Russian voice
[useTTS] ⚠️ English TTS not supported, falling back to Russian
[TTS Preloader] ⚠️ English not supported, using Russian
```

## Рекомендация

**Текущее решение оптимально** для данного проекта:
- Не требует дополнительных затрат
- Работает "из коробки"
- Пользователь получает озвучку (хоть и с акцентом)

Если в будущем потребуется полноценная английская озвучка, можно интегрировать Google TTS или AWS Polly.

---

**Дата:** 7 октября 2025 г.
