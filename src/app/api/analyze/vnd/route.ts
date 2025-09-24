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
Проанализируй предоставленный документ на предмет соответствия или нарушения внутренних нормативных документов.
Дай подробный анализ с конкретными ссылками на нормативы.
Укажи потенциальные риски и рекомендации.`
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Проанализируй следующий документ на предмет соответствия ВНД:\n\n${documentContent}`
            }
          ]
        }
      ],
      tools: [{
        type: "file_search",
        vector_store_ids: [VND_VECTOR_STORE_ID]
      }],
      max_output_tokens: 4096,
      temperature: 0.2
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