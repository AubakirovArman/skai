# Многоязычная поддержка AI Аватара

## 📝 Обзор изменений

Страница AI аватара (`/avatar`) теперь полностью интегрирована с глобальной системой языков приложения. Язык аватара автоматически синхронизируется с выбранным языком в навигационном меню.

## 🎯 Реализованные функции

### 1. **Глобальная синхронизация языка**
- Аватар использует `useLanguage()` hook из `@/contexts/language-context`
- Язык автоматически меняется при переключении в навигационном меню
- Поддерживаемые языки: Русский (ru), Казахский (kk), Английский (en)

### 2. **Многоязычная озвучка (TTS)**
- **Русский (ru)**: `ru-RU-SvetlanaNeural`
- **Казахский (kk)**: `kk-KZ-AigulNeural`
- **Английский (en)**: `en-US-AriaNeural`

Голос аватара автоматически меняется в зависимости от выбранного языка.

### 3. **Распознавание речи (STT)**
Микрофон автоматически распознаёт речь на выбранном языке:
- **Русский**: `ru-RU`
- **Казахский**: `kk-KZ`
- **Английский**: `en-US`

### 4. **Языковые инструкции для AI**
Каждый запрос к ассистенту автоматически дополняется инструкцией на соответствующем языке:

```typescript
LANG_INSTRUCTIONS = {
  ru: "[ИНСТРУКЦИЯ: Ответь на РУССКОМ языке...]",
  kk: "[НҰСҚАУЛЫҚ: ҚАЗАҚ тілінде жауап беріңіз...]",
  en: "[INSTRUCTION: Respond in ENGLISH language...]"
}
```

### 5. **Локализованные приветствия**
При подключении аватар приветствует пользователя на выбранном языке:
- **Русский**: "Здравствуйте! Я виртуальный ассистент. Чем могу помочь?"
- **Казахский**: "Сәлеметсіз бе! Мен виртуалды ассистентпін. Қалай көмектесе аламын?"
- **Английский**: "Hello! I am a virtual assistant. How can I help you?"

### 6. **Полная локализация UI**
Все элементы интерфейса переведены:
- Заголовки и кнопки
- Статусы подключения
- Сообщения об ошибках
- Placeholder текст
- Системные уведомления

## 🔧 Техническая архитектура

### Конфигурация голосов
```typescript
const VOICE_CONFIG: Record<Language, {
  voice: string;
  xmlLang: string;
  speechRecognitionLang: string;
}> = {
  ru: { voice: 'ru-RU-SvetlanaNeural', xmlLang: 'ru-RU', speechRecognitionLang: 'ru-RU' },
  kk: { voice: 'kk-KZ-AigulNeural', xmlLang: 'kk-KZ', speechRecognitionLang: 'kk-KZ' },
  en: { voice: 'en-US-AriaNeural', xmlLang: 'en-US', speechRecognitionLang: 'en-US' }
}
```

### Ключевые функции

#### `speak(text: string)`
Озвучивает текст с использованием голоса, соответствующего текущему языку:
```typescript
const voiceConfig = VOICE_CONFIG[language]
const ssml = `<speak xml:lang="${voiceConfig.xmlLang}">
  <voice name="${voiceConfig.voice}">${text}</voice>
</speak>`
```

#### `startSpeechRecognition()`
Распознаёт речь на текущем языке:
```typescript
const voiceConfig = VOICE_CONFIG[language]
speechConfig.speechRecognitionLanguage = voiceConfig.speechRecognitionLang
```

#### `sendQuestion(question: string)`
Добавляет языковую инструкцию к запросу:
```typescript
const languageInstruction = LANG_INSTRUCTIONS[language]
const messageWithLanguage = `${languageInstruction}\n\n${question}`
```

## 📋 Изменённые файлы

### `/src/app/avatar/page.tsx`
**Основные изменения:**
1. ✅ Удалён локальный `avatarLanguage` state
2. ✅ Добавлен импорт `useLanguage` hook
3. ✅ Все функции используют глобальный `language`
4. ✅ Удалены локальные кнопки переключения языка
5. ✅ Добавлены константы `VOICE_CONFIG`, `LANG_INSTRUCTIONS`, `GREETINGS`, `UI_TEXT`
6. ✅ Обновлены функции: `speak()`, `sendQuestion()`, `startSpeechRecognition()`, `connectAvatar()`

## 🎮 Использование

### Для пользователя:
1. Откройте страницу `/avatar`
2. Переключите язык в навигационном меню (правый верхний угол)
3. Аватар автоматически переключится на выбранный язык:
   - Интерфейс будет переведён
   - Голос аватара изменится
   - Распознавание речи будет на новом языке
   - AI будет отвечать на новом языке

### Для разработчика:
Язык аватара всегда синхронизирован с глобальным контекстом:
```typescript
const { language } = useLanguage() // 'ru' | 'kk' | 'en'
```

## 🔍 Логирование

Все языковые операции логируются в консоль:
- `🔊 Speaking with voice: ru-RU-SvetlanaNeural, Language: ru`
- `👋 Greeting with voice: kk-KZ-AigulNeural, Language: kk`
- `🎤 Starting speech recognition with language: en-US`
- `🌍 Язык аватара: ru`

## 🧪 Тестирование

1. Запустите сервер avatar-chat-test: `cd avatar-chat-test && node server.js`
2. Запустите Next.js dev server: `npm run dev`
3. Откройте `/avatar`
4. Проверьте переключение языков через навигационное меню
5. Убедитесь, что:
   - ✅ UI переводится
   - ✅ Голос меняется
   - ✅ Микрофон распознаёт новый язык
   - ✅ AI отвечает на новом языке

## 📚 Связанные файлы

- `/src/contexts/language-context.tsx` - Глобальный языковой контекст
- `/src/components/language-switch.tsx` - Компонент переключения языка в навигации
- `/avatar-chat-test/public/js/chat.js` - Референсная реализация (оригинал)

## 🎉 Результат

Теперь AI аватар полностью интегрирован с глобальной системой языков приложения. Пользователь может переключать язык один раз в навигационном меню, и весь интерфейс, включая аватар, автоматически адаптируется.

---

**Дата реализации:** 14 октября 2025  
**Версия:** 1.0  
**Статус:** ✅ Готово к использованию
