import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const VND_VECTOR_STORE_ID = "vs_68d3c32dc9f88191b1fb329f214672c6"
const LEGAL_VECTOR_STORE_ID = "vs_68d3c37c53148191b13805651dff5aa3"

type AnalysisStage = 'vnd' | 'np' | 'summary' | 'full'

async function analyzeVND(documentContent: string) {
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
      max_output_tokens: 16384,
      temperature: 0.2
  })

  return response.output_text || 'Ошибка получения результата ВНД анализа'
}

async function analyzeNP(documentContent: string) {
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
      max_output_tokens: 16384,
      temperature: 0.2
  })

  return response.output_text || 'Ошибка получения результата НП анализа'
}

async function buildSummary(vndResult: string, npResult: string) {
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
      max_output_tokens: 16384,
      temperature: 0.2
  })

  return response.output_text || 'Ошибка получения итогового анализа'
}

function extractDocumentContentFromFormData(file: File | null, content: string | null) {
  if (!file && !content) {
    return { documentContent: '', error: 'Файл или содержимое обязательны' }
  }

  if (content && content.trim().length > 0) {
    return { documentContent: content }
  }

  if (file) {
    return file.arrayBuffer().then((buffer) => {
      const fileContent = Buffer.from(buffer).toString('utf-8')
      if (!fileContent.trim()) {
        return { documentContent: '', error: 'Не удалось прочитать содержимое файла' }
      }
      return { documentContent: fileContent }
    })
  }

  return { documentContent: '', error: 'Файл или содержимое обязательны' }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let stage: AnalysisStage = 'full'
    let documentContent = ''
    let vndResult = ''
    let npResult = ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      stage = (body.stage as AnalysisStage) ?? 'full'
      documentContent = body.documentContent ?? ''
      vndResult = body.vndResult ?? ''
      npResult = body.npResult ?? ''
    } else {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const content = formData.get('content') as string | null
      const result = await extractDocumentContentFromFormData(file, content)

      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      documentContent = result.documentContent
      stage = (formData.get('stage') as AnalysisStage) ?? 'full'
      vndResult = (formData.get('vndResult') as string) ?? ''
      npResult = (formData.get('npResult') as string) ?? ''
    }

    if (stage === 'vnd' || stage === 'np' || stage === 'full') {
      if (!documentContent || !documentContent.trim()) {
        return NextResponse.json({ error: 'Содержимое документа обязательно' }, { status: 400 })
      }
    }

    switch (stage) {
      case 'vnd': {
        const vnd = await analyzeVND(documentContent)
        return NextResponse.json({ success: true, result: vnd })
      }
      case 'np': {
        const np = await analyzeNP(documentContent)
        return NextResponse.json({ success: true, result: np })
      }
      case 'summary': {
        if (!vndResult || !npResult) {
          return NextResponse.json({ error: 'Для формирования итогового заключения необходимо предоставить результаты ВНД и НП анализа' }, { status: 400 })
        }
        const summary = await buildSummary(vndResult, npResult)
        return NextResponse.json({ success: true, result: summary })
      }
      case 'full':
      default: {
        const vnd = await analyzeVND(documentContent)
        const np = await analyzeNP(documentContent)
        const summary = await buildSummary(vnd, np)

        return NextResponse.json({
          success: true,
          analysis: {
            vnd,
            np,
            summary,
          },
        })
      }
    }
  } catch (error) {
    console.error('Ошибка анализа:', error)

    if (error instanceof OpenAI.APIError) {
      const status = error.status ?? 500
      const message = error.error?.message || 'Ошибка при анализе документа'
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ error: 'Ошибка при анализе документа' }, { status: 500 })
  }
}