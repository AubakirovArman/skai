import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Use Responses API with file_search tool and VND vector store
    const response = await openai.responses.create({
      model: 'gpt-4o',
      instructions: 'Вы - виртуальный директор, специализирующийся на управленческих решениях и стратегическом планировании бизнеса. Отвечайте на основе загруженных документов и предоставляйте практические рекомендации.',
      input: message,
      tools: [{ 
        type: "file_search",
        vector_store_ids: [process.env.VND_VECTOR_STORE_ID!]
      }],
      max_output_tokens: 16384,
      temperature: 0.2
    });

    return NextResponse.json({ response: response.output_text });

  } catch (error) {
    console.error('VND API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}