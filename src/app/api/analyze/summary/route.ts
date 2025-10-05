import { NextRequest, NextResponse } from 'next/server'
import { alemllm } from '@/lib/alemllm'

export async function POST(request: NextRequest) {
  try {
    const { vndResult, npResult } = await request.json()
    
    if (!vndResult || !npResult) {
      return NextResponse.json(
        { error: 'Для формирования итогового заключения необходимо предоставить результаты ВНД и НП анализа' }, 
        { status: 400 }
      )
    }

    const systemPrompt = `Ты профессиональный независимый эксперт-аналитик Совета директоров АО «Самрук-Қазына».

Структура ответа (строго):
**ПУНКТ ПОВЕСТКИ ДНЯ:** <название>
**РЕШЕНИЕ НЕЗАВИСИМОГО ЧЛЕНА СД:** ЗА | ПРОТИВ | ВОЗДЕРЖАЛСЯ
**КРАТКОЕ ЗАКЛЮЧЕНИЕ:** (5-8 предложений)

**ОБОСНОВАНИЕ:**
- **Контекст и выводы:** (15-25 предложений)
- **Риски:** (10-15 пунктов)
- **Рекомендации:** (8-12 пунктов)
- **Источники:** (15-25 ссылок)

Минимум 2000-3000 слов. Используй только информацию из предоставленных анализов.`

    const userPrompt = `На основе следующих анализов прими решение как виртуальный директор:

ВНД Анализ:
${vndResult}

НП Анализ:
${npResult}

Сформируй ответ строго в требуемой структуре.`

    const result = await alemllm.complete(userPrompt, systemPrompt, { max_tokens: 8096, temperature: 0.7 })

    return NextResponse.json({ success: true, result })

  } catch (error) {
    console.error('Ошибка итогового заключения:', error)
    const msg = error instanceof Error ? error.message : 'Ошибка'
    
    if (msg.includes('AlemLLM')) {
      return NextResponse.json({ 
        error: 'Ошибка при обращении к AlemLLM API' 
      }, { status: 503 })
    }

    return NextResponse.json({ 
      error: 'Произошла ошибка при формировании заключения' 
    }, { status: 500 })
  }
}
