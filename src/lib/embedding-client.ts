/**
 * Embedding Service Client
 * Client for generating text embeddings via Python microservice
 */

export interface EmbeddingRequest {
  texts: string[]
  normalize?: boolean
}

export interface EmbeddingResponse {
  embeddings: number[][]
  model: string
  dimension: number
}

export class EmbeddingClient {
  private baseURL: string

  constructor(baseURL: string = 'http://localhost:8001') {
    this.baseURL = baseURL
  }

  /**
   * Generate embeddings for texts
   */
  async embed(texts: string[], normalize: boolean = true): Promise<number[][]> {
    try {
      const response = await fetch(`${this.baseURL}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts,
          normalize,
        } as EmbeddingRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Embedding service error (${response.status}): ${errorText}`)
      }

      const data: EmbeddingResponse = await response.json()
      return data.embeddings
    } catch (error) {
      console.error('Embedding generation failed:', error)
      throw error
    }
  }

  /**
   * Generate embedding for single text
   */
  async embedSingle(text: string, normalize: boolean = true): Promise<number[]> {
    const embeddings = await this.embed([text], normalize)
    return embeddings[0]
  }

  /**
   * Check if embedding service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`)
      return response.ok
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const embeddingClient = new EmbeddingClient(
  process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8001'
)
