import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { vndResult, npResult } = await request.json()
    
    if (!vndResult || !npResult) {
      return NextResponse.json(
        { error: 'Для формирования итогового заключения необходимо предоставить результаты ВНД и НП анализа' }, 
        { status: 400 }
      )
    }

    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `Ты виртуальный директор компании. На основе результатов анализа ВНД и НП принимай решения по вопросам повестки дня.

Твой ответ должен содержать:
1. Название вопроса/Тема повестки дня
2. Решение виртуального директора: ЗА или ПРОТИВ
3. Краткое обоснование (1-2 предложения)
4. Подробное обоснование по вопросу

Формат ответа:
**ТЕМА ПОВЕСТКИ ДНЯ:** [название вопроса]

**РЕШЕНИЕ ВИРТУАЛЬНОГО ДИРЕКТОРА:** ЗА/ПРОТИВ

**КРАТКОЕ ОБОСНОВАНИЕ:** [1-2 предложения с основной причиной решения]

**ОБОСНОВАНИЕ ПО ВОПРОСУ:** [подробный анализ с учетом мнений ВНД и НП, риски, возможности, рекомендации]`
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `На основе следующих анализов прими решение как виртуальный директор:

ВНД Анализ:
${vndResult}

НП Анализ:
${npResult}

Проанализируй документ и прими решение ЗА или ПРОТИВ по рассматриваемому вопросу. Следуй указанному формату ответа.`
            }
          ]
        }
      ],
      max_output_tokens: 2048,
      temperature: 0.2
    })

    const result = response.output_text || 'Ошибка получения итогового анализа'

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error) {
    console.error('Ошибка формирования итогового заключения:', error)

    if (error instanceof OpenAI.APIError) {
      const status = error.status ?? 500
      const message = error.error?.message || 'Ошибка при формировании итогового заключения'
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ error: 'Ошибка при формировании итогового заключения' }, { status: 500 })
  }
}