import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const LEGAL_VECTOR_STORE_ID = "vs_68d3c37c53148191b13805651dff5aa3"

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
              text: `Ты эксперт по нормативным правам (НП) и правовому регулированию.
Проанализируй предоставленный документ на предмет соответствия правовым нормам и требованиям.
Дай подробный правовой анализ с ссылками на соответствующие нормативные акты.
Укажи правовые риски и рекомендации по соблюдению требований.`
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Проанализируй следующий документ на предмет соответствия правовым нормам:\n\n${documentContent}`
            }
          ]
        }
      ],
      tools: [{
        type: "file_search",
        vector_store_ids: [LEGAL_VECTOR_STORE_ID]
      }],
      max_output_tokens: 4096,
      temperature: 0.2
    })

    const result = response.output_text || 'Ошибка получения результата НП анализа'

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error) {
    console.error('Ошибка НП анализа:', error)

    if (error instanceof OpenAI.APIError) {
      const status = error.status ?? 500
      const message = error.error?.message || 'Ошибка при анализе НП'
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ error: 'Ошибка при анализе НП' }, { status: 500 })
  }
}