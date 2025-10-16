# Virtual Director - Demo Mode

## Описание

Функционал демо-режима для страницы Virtual Director позволяет показывать заранее заготовленные результаты анализа вместо реальных API-запросов.

## Как это работает

### Режимы работы

1. **Real Mode (Реальный режим)** - стандартный режим работы с реальными API-запросами к AlemLLM
2. **Demo Mode (Демо-режим)** - показ заготовленных данных с фиктивной загрузкой

### Демо-режим

В демо-режиме:
- ✅ Процесс анализа **фиктивный** - каждый шаг занимает по 2 секунды
- ✅ Результаты берутся из **админ-панели** (`/admin/virtual-director`)
- ✅ Поддержка **трёх языков**: ru, kk, en
- ✅ Видимый индикатор **"ДЕМО-РЕЖИМ"** в заголовке страницы
- ✅ Предзагрузка аудио работает с демо-данными

## Управление режимом

### Через админ-панель (рекомендуется)

1. Войдите в админ-панель: `http://localhost:3000/admin`
2. Откройте "Настройки Virtual Director": `http://localhost:3000/admin/virtual-director`
3. Выберите режим: "Реальный анализ" или "Режим показа (демо-данные)"
4. Заполните демо-данные для всех трёх языков
5. Нажмите "Сохранить настройки"

### Через скрипты

```bash
# Включить демо-режим с примерами данных
node scripts/set-demo-mode.js

# Вернуться к реальному режиму
node scripts/set-real-mode.js
```

## Структура демо-данных

Демо-данные хранятся в базе данных в таблице `dialog_settings` и включают:

### Results Analysis (Итоговый анализ)
- `finalConclusion` - Финальное заключение
- `agendaItem` - Пункт повестки
- `vote` - Голосование
- `briefConclusion` - Краткое заключение
- `reasoning` - Обоснование

### VND Analysis (Анализ ВНД)
- `vndKeyFindings` - Ключевые выводы
- `vndCompliance` - Соответствие
- `vndViolations` - Нарушения
- `vndRisks` - Риски
- `vndRecommendations` - Рекомендации
- `vndSources` - Источники

### NPA Analysis (Анализ НПА)
- `npaKeyFindings` - Ключевые выводы
- `npaCompliance` - Соответствие
- `npaViolations` - Нарушения
- `npaRisks` - Риски
- `npaRecommendations` - Рекомендации
- `npaSources` - Источники

## API Endpoints

### Публичный endpoint (без авторизации)
```
GET /api/virtual-director-settings
```

Возвращает:
```json
{
  "mode": "demo" | "real",
  "demoData": {
    "ru": { /* данные на русском */ },
    "kk": { /* данные на казахском */ },
    "en": { /* данные на английском */ }
  }
}
```

### Админский endpoint (требует role: admin)
```
GET  /api/admin/virtual-director-settings
POST /api/admin/virtual-director-settings
```

## Тестирование

1. Включите демо-режим: `node scripts/set-demo-mode.js`
2. Откройте: `http://localhost:3000/virtual-director`
3. В заголовке должен появиться бейдж **"ДЕМО-РЕЖИМ"** с анимацией
4. Загрузите любой файл или введите текст
5. Нажмите "Начать анализ"
6. Наблюдайте:
   - Каждый шаг занимает ~2 секунды
   - Общее время: ~10 секунд (вместо минут в реальном режиме)
   - Результаты соответствуют данным из админки
7. Проверьте все три вкладки: Summary, VND Analysis, NPA Analysis
8. Проверьте озвучивание (TTS) - должно работать с демо-данными
9. Смените язык интерфейса - демо-данные должны обновиться

## База данных

### Таблица: dialog_settings

```sql
CREATE TABLE "dialog_settings" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT UNIQUE NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Записи для Virtual Director

1. **virtual_director_mode** - режим работы ("real" или "demo")
2. **virtual_director_demo_data** - JSON с демо-данными для всех языков

## Логирование

В консоли браузера вы увидите:
- `[VD] Loaded settings:` - загруженные настройки при старте
- `[VD] 🎭 Demo mode activated` - активирован демо-режим
- `[VD] 🔬 Real mode activated` - активирован реальный режим

## Преимущества

1. 🚀 **Быстрая демонстрация** - 10 секунд вместо минут
2. 🎯 **Предсказуемые результаты** - всегда одинаковые данные для демо
3. 💰 **Экономия токенов** - не тратим токены LLM на демонстрацию
4. 🌐 **Мультиязычность** - поддержка ru/kk/en из коробки
5. ⚙️ **Гибкость** - легко переключаться между режимами

## Файлы

### Основные компоненты
- `/src/app/virtual-director/page.tsx` - страница Virtual Director с поддержкой демо-режима
- `/src/app/api/virtual-director-settings/route.ts` - публичный API для получения настроек
- `/src/app/api/admin/virtual-director-settings/route.ts` - админский API для управления
- `/src/app/admin/virtual-director/page.tsx` - админ-панель для настройки демо-данных

### Утилиты
- `/scripts/set-demo-mode.js` - активация демо-режима с примерами
- `/scripts/set-real-mode.js` - возврат к реальному режиму

### База данных
- `/prisma/migrations/20251016130330_add_dialog_settings/` - миграция таблицы настроек
