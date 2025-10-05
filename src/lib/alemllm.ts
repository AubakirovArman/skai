/**
 * AlemLLM API Client Configuration
 * Локальная LLM на казахстанском сервере: https://alemllm.sk-ai.kz
 */

export interface AlemLLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AlemLLMRequest {
  model: string
  messages: AlemLLMMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  stream?: boolean
}

export interface AlemLLMResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
      function_call: null
      tool_calls: any[]
    }
    logprobs: null
    finish_reason: string
    stop_reason: null
  }>
  usage: {
    prompt_tokens: number
    total_tokens: number
    completion_tokens: number
  }
}

/**
 * Вызов AlemLLM API для генерации ответа
 */
export async function callAlemLLM(
  messages: AlemLLMMessage[],
  options: {
    temperature?: number
    max_tokens?: number
  } = {}
): Promise<string> {
  const apiUrl = 'https://alemllm.sk-ai.kz/v1/chat/completions'
  
  const requestBody: AlemLLMRequest = {
    model: 'astanahub/alemllm',
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 8096,
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AlemLLM API error (${response.status}): ${errorText}`)
    }

    const data: AlemLLMResponse = await response.json()
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('AlemLLM returned no choices')
    }

    const content = data.choices[0].message.content
    
    if (!content) {
      throw new Error('AlemLLM returned empty content')
    }

    return content
  } catch (error) {
    console.error('AlemLLM API call failed:', error)
    throw error
  }
}

/**
 * PostgreSQL Vector Database Configuration
 */
export const VectorDBConfig = {
  // База данных ВНД (Внутренние нормативные документы)
  VND_DSN: process.env.VND_DB_DSN || 'postgresql://postgres:iCBzW9aXow}Sne6/n1?S@82.200.129.219:5433/vnd',
  
  // База данных НПА (Правовые нормы РК)
  NPA_DSN: process.env.NPA_DB_DSN || 'postgresql://postgres:iCBzW9aXow}Sne6/n1?S@82.200.129.219:5433/npa',
  
  // Параметры поиска
  DEFAULT_TOP_K: 8,
  DEFAULT_LIMIT: 12,
  MIN_SIMILARITY: 0.3,
}
