/**
 * Тест утилиты text-sanitizer
 * Запуск: node test-text-sanitizer.js
 */

// Импортируем функцию (в реальности используйте TypeScript)
function sanitizeTextForTTS(text) {
  if (!text) return ''

  let cleaned = text

  // 1. Удаляем Markdown заголовки
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '')

  // 2. Удаляем жирный текст и курсив
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1')
  cleaned = cleaned.replace(/__(.+?)__/g, '$1')
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1')
  cleaned = cleaned.replace(/_(.+?)_/g, '$1')

  // 3. Удаляем зачёркнутый текст
  cleaned = cleaned.replace(/~~(.+?)~~/g, '$1')

  // 4. Удаляем ссылки
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // 5. Удаляем маркеры списков
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '')

  // 6. Удаляем нумерацию списков
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '')

  // 7. Удаляем блоки цитат
  cleaned = cleaned.replace(/^>\s+/gm, '')

  // 8. Удаляем горизонтальные линии
  cleaned = cleaned.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '')

  // 9. Удаляем inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1')

  // 10. Удаляем блоки кода
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '')

  // 11. Заменяем двоеточие с пробелом
  cleaned = cleaned.replace(/:\s+/g, ': ')

  // 12. Удаляем множественные пробелы
  cleaned = cleaned.replace(/\s{2,}/g, ' ')

  // 13. Удаляем множественные переносы строк
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // 14. Заменяем переносы строк на точку с пробелом
  cleaned = cleaned.replace(/\n+/g, '. ')

  // 15. Удаляем множественные точки
  cleaned = cleaned.replace(/\.{2,}/g, '.')

  // 16. Удаляем точку перед запятой
  cleaned = cleaned.replace(/\.\s*([,;.])/g, '$1')

  // 17. Убираем пробелы перед знаками препинания
  cleaned = cleaned.replace(/\s+([.,;:!?])/g, '$1')

  // 18. Добавляем пробел после знаков препинания
  cleaned = cleaned.replace(/([.,;:!?])([^\s\d])/g, '$1 $2')

  // 19. Убираем пробелы в начале и конце
  cleaned = cleaned.trim()

  // 20. Удаляем двойные пробелы
  cleaned = cleaned.replace(/\s{2,}/g, ' ')

  return cleaned
}

// Тесты
console.log('🧪 Тестирование text-sanitizer\n')

// Тест 1: Жирный текст
const test1 = '**ПУНКТ ПОВЕСТКИ ДНЯ:** Утверждение изменений'
console.log('Тест 1: Жирный текст')
console.log('Вход:', test1)
console.log('Выход:', sanitizeTextForTTS(test1))
console.log('Ожидается: ПУНКТ ПОВЕСТКИ ДНЯ: Утверждение изменений')
console.log('')

// Тест 2: Заголовки
const test2 = '### Краткое заключение\n\n**Текст**'
console.log('Тест 2: Заголовки')
console.log('Вход:', test2)
console.log('Выход:', sanitizeTextForTTS(test2))
console.log('Ожидается: Краткое заключение. Текст')
console.log('')

// Тест 3: Списки
const test3 = '**Риски:**\n\n- Риск 1\n- Риск 2\n- Риск 3'
console.log('Тест 3: Списки')
console.log('Вход:', test3)
console.log('Выход:', sanitizeTextForTTS(test3))
console.log('Ожидается: Риски: Риск 1. Риск 2. Риск 3')
console.log('')

// Тест 4: Ссылки
const test4 = 'Документ доступен по [ссылке](https://example.com).'
console.log('Тест 4: Ссылки')
console.log('Вход:', test4)
console.log('Выход:', sanitizeTextForTTS(test4))
console.log('Ожидается: Документ доступен по ссылке.')
console.log('')

// Тест 5: Английский текст
const test5 = '**AGENDA ITEM:** Adjustments\n\n**DECISION:** FOR'
console.log('Тест 5: Английский текст')
console.log('Вход:', test5)
console.log('Выход:', sanitizeTextForTTS(test5))
console.log('Ожидается: AGENDA ITEM: Adjustments. DECISION: FOR')
console.log('')

// Тест 6: Комплексный
const test6 = `### Заключение

**ПУНКТ ПОВЕСТКИ ДНЯ:** Утверждение изменений

**ГОЛОСУЮ:** ЗА

**Обоснование:**

- Пункт 1
- Пункт 2

Ссылка на [документ](https://example.com).`

console.log('Тест 6: Комплексный')
console.log('Вход:\n' + test6)
console.log('')
console.log('Выход:', sanitizeTextForTTS(test6))
console.log('')
console.log('✅ Все тесты завершены!')
