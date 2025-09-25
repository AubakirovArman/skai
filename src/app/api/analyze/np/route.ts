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
              text: `Ты эксперт по нормативным правам актам (НПА) и правовому регулированию.
Задача: провести углублённый правовой анализ текста на соответствие законам, подзаконным актам, отраслевым нормам и стандартам.

СТРОГО придерживайся следующей Markdown-структуры (не добавляй других заголовков):

**НПА: КЛЮЧЕВЫЕ ВЫВОДЫ:**
- <3-5 основных тезисов по сути правовой оценки>

**НПА: СООТВЕТСТВИЯ:**
- <Акт / статья / пункт — краткое подтверждение соответствия + чем оно подкреплено>

**НПА: НАРУШЕНИЯ / РИСК НЕСОБЛЮДЕНИЯ:**
- <Акт / статья — суть нарушения — возможное последствие (штраф, судебный риск и т.п.)>
- Если явных признаков нарушения нет — строка "- Существенных признаков нарушения не обнаружено".

**НПА: ПРАВОВЫЕ РИСКИ:**
- <Риск — вероятность (низкая/средняя/высокая) — влияние (низкое/среднее/высокое) — краткое описание последствий>

**НПА: РЕКОМЕНДАЦИИ ПО СООТВЕТСТВИЮ:**
- <Действие — цель — приоритет/срок>

**ИСТОЧНИКИ НПА:**
- <Название акта / статья / пункт — короткая цитата или формулировка; название акта выделяй жирным>

ТРЕБОВАНИЯ:
- Не выдумывай номера статей. Если модель не уверена в точном номере — укажи уровень (например: **Трудовое законодательство**) без конкретной статьи.
- Используй жирное выделение для названий актов в источниках.
- Пиши подробно, избегай общих формулировок.
`
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Проанализируй следующий документ на предмет соответствия нормам НП и верни ответ в указанной структуре:\n\n${documentContent}`
            }
          ]
        }
      ],
      tools: [{
        type: "file_search",
        vector_store_ids: [LEGAL_VECTOR_STORE_ID]
      }],
      max_output_tokens: 16384,
      temperature: 0.4
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