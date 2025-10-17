# 🎵 TTS Audio Generator Script

Скрипт для генерации аудио из текста с использованием TTS API `https://tts.sk-ai.kz/api/tts`

## 📋 Использование

```bash
node scripts/generate-tts.js <input-file> <language> [output-file]
```

## 📝 Параметры

- **input-file** - путь к текстовому файлу с текстом для озвучки
- **language** - язык озвучки (`ru`, `kk`, `en`)
- **output-file** - (опционально) имя выходного файла (по умолчанию: `output.mp3`)

## 🌐 Поддерживаемые языки

- `ru` - Русский
- `kk` - Қазақша (Казахский)
- `en` - English (Английский)

## 💡 Примеры

### 1. Базовое использование (файл сохранится как output.mp3)
```bash
node scripts/generate-tts.js text.txt kk
```

### 2. С указанием имени выходного файла
```bash
node scripts/generate-tts.js my-text.txt ru my-audio.mp3
```

### 3. Генерация на английском
```bash
node scripts/generate-tts.js document.txt en speech.mp3
```

### 4. Относительные и абсолютные пути
```bash
# Относительный путь
node scripts/generate-tts.js ./texts/greeting.txt kk greeting.mp3

# Абсолютный путь
node scripts/generate-tts.js /Users/user/Documents/text.txt ru /Users/user/Downloads/audio.mp3
```

## 📂 Формат входного файла

Входной файл должен быть текстовым файлом в кодировке UTF-8. Примеры:

**text-ru.txt:**
```
Добрый день! Это тестовое сообщение для генерации речи.
```

**text-kk.txt:**
```
Сәлем! Бұл сөйлеуді жасау үшін сынақ хабарламасы.
```

**text-en.txt:**
```
Hello! This is a test message for speech generation.
```

## 🎯 Вывод

Скрипт сохраняет аудио файл **в текущей директории**, откуда был запущен (в `process.cwd()`).

Пример:
```bash
# Запуск из корня проекта
cd /Users/user/project
node scripts/generate-tts.js text.txt kk audio.mp3
# Результат: /Users/user/project/audio.mp3

# Запуск из другой директории
cd /Users/user/Desktop
node /path/to/project/scripts/generate-tts.js text.txt ru speech.mp3
# Результат: /Users/user/Desktop/speech.mp3
```

## 🔧 Технические детали

- **API Endpoint:** `https://tts.sk-ai.kz/api/tts`
- **Метод:** POST
- **Формат запроса:**
  ```json
  {
    "text": "текст для озвучки",
    "lang": "kk"
  }
  ```
- **Формат ответа:** MP3 аудио (binary)

## ⚠️ Ограничения

- Максимальная длина текста зависит от API (обычно ~5000 символов)
- Для очень длинных текстов рекомендуется разбивать на части
- Файл перезаписывается, если уже существует

## 🐛 Устранение неполадок

### Ошибка: файл не найден
```
❌ Ошибка: файл "text.txt" не найден
```
**Решение:** Проверьте путь к файлу, используйте абсолютный путь или убедитесь, что файл существует.

### Ошибка: неподдерживаемый язык
```
❌ Ошибка: неподдерживаемый язык "es"
```
**Решение:** Используйте только `ru`, `kk` или `en`.

### Ошибка: пустой файл
```
❌ Ошибка: файл пустой
```
**Решение:** Убедитесь, что входной файл содержит текст.

### Ошибка API
```
❌ Ошибка при генерации TTS: HTTP 500
```
**Решение:** Проверьте доступность TTS API или попробуйте позже.

## 📊 Примерный размер файлов

- Короткий текст (1 предложение): ~20-30 KB
- Средний текст (1 абзац): ~50-100 KB
- Длинный текст (страница): ~200-500 KB

---

**Автор:** SKAI Team  
**Версия:** 1.0.0  
**Дата:** Октябрь 2025
