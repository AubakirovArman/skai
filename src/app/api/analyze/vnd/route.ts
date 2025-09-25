import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const VND_VECTOR_STORE_ID = "vs_68d3c32dc9f88191b1fb329f214672c6"

export async function POST(request: NextRequest) {
  try {
    const { documentContent } = await request.json()
    
    if (!documentContent || !documentContent.trim()) {
      return NextResponse.json({ error: 'Содержимое документа обязательно' }, { status: 400 })
    }

    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `Ты эксперт по внутренним нормативным документам (ВНД).
Твоя задача — провести глубокий анализ предоставленного текста на предмет соответствия внутренним политикам, регламентам, стандартам и процедурам компании.

СТРОГО придерживайся следующей Markdown-структуры (не добавляй других заголовков):

**ВНД: КЛЮЧЕВЫЕ ВЫВОДЫ:**
- <3-5 главных инсайтов, каждый в отдельной строке>

**ВНД: СООТВЕТСТВИЯ:**
- <Название документа / раздел / пункт — краткое подтверждение соответствия + чем подтверждается>

**ВНД: НАРУШЕНИЯ / НЕСООТВЕТСТВИЯ:**
- <Документ / пункт — суть отклонения + потенциальное последствие + срочность реакции>
- Если существенных несоответствий нет — используй строку "- Существенных несоответствий не выявлено".

**ВНД: РИСКИ:**
- <Риск — вероятность (низкая/средняя/высокая) — влияние (низкое/среднее/высокое) — краткое описание последствий>
- Если значимых рисков нет — "- Значимых рисков не выявлено".

**ВНД: РЕКОМЕНДАЦИИ:**
- <Конкретное действие — ответственный (если указан) — срок/приоритет>

**ИСТОЧНИКИ ВНД:**
- <Название документа / раздел / пункт — короткая цитата или формулировка, используя жирное выделение для названия документа (например: "- **Регламент по ИБ**, раздел 3.2 — обязательна двухфакторная аутентификация")>

ТРЕБОВАНИЯ:
- Используй жирное выделение (**...) для названий документов/актів внутри источников.
- Не выдумывай номера пунктов — применяй только если уверена модель; иначе укажи общий раздел.
- Пиши детально, избегай общих фраз.
`
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Проанализируй следующий документ на предмет соответствия ВНД и верни ответ в указанной структуре:\n\n${documentContent}`
            }
          ]
        }
      ],
      tools: [{
        type: "file_search",
        vector_store_ids: [VND_VECTOR_STORE_ID]
      }],
      max_output_tokens: 16384,
      temperature: 0.4
    })

    const result = response.output_text || 'Ошибка получения результата ВНД анализа'

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error) {
    console.error('Ошибка ВНД анализа:', error)

    if (error instanceof OpenAI.APIError) {
      const status = error.status ?? 500
      const message = error.error?.message || 'Ошибка при анализе ВНД'
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ error: 'Ошибка при анализе ВНД' }, { status: 500 })
  }
}