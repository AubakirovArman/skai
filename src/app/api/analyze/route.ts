import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const VND_VECTOR_STORE_ID = "vs_68ca35e446f88191b4aaf4101e259c37"
const LEGAL_VECTOR_STORE_ID = "vs_68ca362ea4208191b5724a0e7bb83b21"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const content = formData.get('content') as string

    if (!file && !content) {
      return NextResponse.json({ error: 'Файл или содержимое обязательны' }, { status: 400 })
    }

    let documentContent = content

    // Если загружен файл, извлекаем содержимое
    if (file) {
      const fileBuffer = await file.arrayBuffer()
      const fileContent = Buffer.from(fileBuffer).toString('utf-8')
      documentContent = fileContent
    }

    // ВНД анализ с использованием Responses API
    const vndResponse = await openai.responses.create({
      model: "gpt-5",
      instructions: `Ты эксперт по внутренним нормативным документам (ВНД). 
      Проанализируй предоставленный документ на предмет соответствия или нарушения внутренних нормативных документов.
      Дай подробный анализ с конкретными ссылками на нормативы.
      Укажи потенциальные риски и рекомендации.`,
      input: `Проанализируй следующий документ на предмет соответствия ВНД:\n\n${documentContent}`,
      tools: [{ 
        type: "file_search",
        vector_store_ids: [VND_VECTOR_STORE_ID]
      }]
    })
    console.log('1')
    // НП анализ с использованием Responses API
    const npResponse = await openai.responses.create({
      model: "gpt-5",
      instructions: `Ты эксперт по нормативным правам (НП) и правовому регулированию.
      Проанализируй предоставленный документ на предмет соответствия правовым нормам и требованиям.
      Дай подробный правовой анализ с ссылками на соответствующие нормативные акты.
      Укажи правовые риски и рекомендации по соблюдению требований.`,
      input: `Проанализируй следующий документ на предмет соответствия правовым нормам:\n\n${documentContent}`,
      tools: [{ 
        type: "file_search",
        vector_store_ids: [LEGAL_VECTOR_STORE_ID]
      }]
    })
    console.log('2')

    const vndResult = vndResponse.output_text || 'Ошибка получения результата ВНД анализа'
    const npResult = npResponse.output_text || 'Ошибка получения результата НП анализа'
    console.log('3')

    // Создаем итоговый анализ с использованием Responses API
    const summaryResponse = await openai.responses.create({
      model: "gpt-5",
      instructions: `Ты виртуальный директор компании. На основе результатов анализа ВНД и НП принимай решения по вопросам повестки дня. 

Твой ответ должен содержать:
1. Название вопроса/Тема повестки дня
2. Решение виртуального директора: ЗА или ПРОТИВ
3. Краткое обоснование (1-2 предложения)
4. Подробное обоснование по вопросу

Формат ответа:
**ТЕМА ПОВЕСТКИ ДНЯ:** [название вопроса]

**РЕШЕНИЕ ВИРТУАЛЬНОГО ДИРЕКТОРА:** ЗА/ПРОТИВ

**КРАТКОЕ ОБОСНОВАНИЕ:** [1-2 предложения с основной причиной решения]

**ОБОСНОВАНИЕ ПО ВОПРОСУ:** [подробный анализ с учетом мнений ВНД и НП, риски, возможности, рекомендации]`,
      input: `На основе следующих анализов прими решение как виртуальный директор:

ВНД Анализ:
${vndResult}

НП Анализ:
${npResult}

Проанализируй документ и прими решение ЗА или ПРОТИВ по рассматриваемому вопросу. Следуй указанному формату ответа.`
    })
    console.log('5')

    const summaryResult = summaryResponse.output_text || 'Ошибка получения итогового анализа'

    return NextResponse.json({
      success: true,
      analysis: {
        vnd: vndResult,
        np: npResult,
        summary: summaryResult
      }
    })

  } catch (error) {
    console.error('Ошибка анализа:', error)
    return NextResponse.json({ error: 'Ошибка при анализе документа' }, { status: 500 })
  }
}