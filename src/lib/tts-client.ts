/**
 * TTS API Client for SK-AI TTS Service
 * Uses Next.js API proxy to avoid CORS issues
 */

export interface TTSRequest {
  text: string
  lang: 'kk' | 'ru'
}

export class TTSClient {
  private baseURL: string

  constructor() {
    // Используем Next.js API proxy вместо прямого обращения к TTS API
    this.baseURL = '/api/tts'
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(text: string, lang: 'kk' | 'ru' = 'ru'): Promise<Blob> {
    console.log('[TTS] 🎤 Generating speech...')
    console.log('[TTS] 📝 Text length:', text.length)
    console.log('[TTS] 🌐 Language:', lang)

    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, lang }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[TTS] ❌ API error:', errorText)
        throw new Error(`TTS API error: ${response.status}`)
      }

      const blob = await response.blob()
      console.log('[TTS] ✅ Speech generated, size:', blob.size, 'bytes')
      
      return blob
    } catch (error) {
      console.error('[TTS] ❌ Generation failed:', error)
      throw error
    }
  }

  /**
   * Generate speech and return as URL
   */
  async generateSpeechURL(text: string, lang: 'kk' | 'ru' = 'ru'): Promise<string> {
    const blob = await this.generateSpeech(text, lang)
    return URL.createObjectURL(blob)
  }
}

// Export singleton instance
export const ttsClient = new TTSClient()
