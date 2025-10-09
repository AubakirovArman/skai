import { NextRequest, NextResponse } from 'next/server'
import { alemllm } from '@/lib/alemllm'
import { Language, translations } from '@/locales'
import { findMeetingByQuery } from '@/lib/dialog-data'
import { prisma } from '@/lib/prisma'

interface ChatRequestMessage {
  role: 'user' | 'assistant'
  text: string
}

interface ChatRequestBody {
  messages: ChatRequestMessage[]
  language: Language
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody
    const { messages, language } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')
    if (!latestUserMessage) {
      return NextResponse.json({ error: 'No user message in conversation' }, { status: 400 })
    }

    const meetings = await prisma.dialogMeeting.findMany({
      include: {
        questions: {
          orderBy: [{ number: 'asc' }],
        },
      },
    })

    const meetingContext = findMeetingByQuery(latestUserMessage.text, meetings)
    const tDialog = translations[language].dialog

    if (meetingContext?.meeting) {
      const meeting = meetingContext.meeting
      const question = meetingContext.question

      if (question) {
        const decisionLabel = selectByLanguage(
          language,
          question.decisionLabelRu,
          question.decisionLabelKk,
          question.decisionLabelEn
        )

        const collapsedText = selectByLanguage(
          language,
          question.collapsedTextRu,
          question.collapsedTextKk,
          question.collapsedTextEn
        )

        const prefix = decisionLabel
          ? `${decisionLabel}. ${collapsedText}`
          : collapsedText

        return NextResponse.json({
          success: true,
          message: {
            text: `${tDialog.questionSummaryPrefix} ${question.number}: ${prefix}`,
            actions: [
              {
                label: tDialog.goToMeeting,
                href: `/dialog/${meeting.code}#question-${question.number}`,
              },
            ],
            meta: {
              meetingId: meeting.id,
              meetingCode: meeting.code,
              questionId: question.id,
              questionNumber: question.number,
            },
          },
        })
      }

      const summaryText =
        selectByLanguage(language, meeting.summaryRu, meeting.summaryKk, meeting.summaryEn) ?? ''
      const overviewText =
        selectByLanguage(language, meeting.overviewRu, meeting.overviewKk, meeting.overviewEn) ?? ''

      return NextResponse.json({
        success: true,
        message: {
          text: `${summaryText} ${overviewText}`.trim(),
          actions: [
            {
              label: tDialog.meetingSummaryButton,
              href: `/dialog/${meeting.code}`,
            },
          ],
          meta: {
            meetingId: meeting.id,
            meetingCode: meeting.code,
          },
        },
      })
    }

    const systemPrompt = buildSystemPrompt(language)

    const llmMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((message) => ({
        role: message.role,
        content: message.text,
      })),
    ]

    const completion = await alemllm.createChatCompletion(llmMessages, {
      max_tokens: 512,
      temperature: 0.6,
      top_p: 0.9,
    })

    return NextResponse.json({
      success: true,
      message: {
        text: completion.trim(),
      },
    })
  } catch (error) {
    console.error('[Dialog Chat] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function buildSystemPrompt(language: Language) {
  switch (language) {
    case 'kk':
      return (
        'Сен SK AI көмекшісі. Пайдаланушылардың кез келген сұрағына сыпайы және қысқа жауап бер. ' +
        'Егер сұрақ директорлар кеңесінің 262-отырысының 1, 2 немесе 3-сұрағына қатысты болса, ' +
        'әрдайым шешімнің мақұлданғанын ("Шешім: ҚАБЫЛДАНДЫ") атап өт. '
      )
    case 'en':
      return (
        'You are the SK AI assistant. Answer user questions politely and concisely. ' +
        'If the user asks about board meeting 262 and questions 1, 2, or 3, highlight that the decision was APPROVED.'
      )
    case 'ru':
    default:
      return (
        'Ты помощник SK AI. Отвечай на вопросы пользователей вежливо и по делу. ' +
        'Если вопрос касается заседания совета директоров №262 и вопросов 1, 2 или 3, подчеркни, что решение было принято "ЗА".'
      )
  }
}

function selectByLanguage(language: Language, ru?: string | null, kk?: string | null, en?: string | null) {
  switch (language) {
    case 'kk':
      return kk ?? ru ?? en ?? ''
    case 'en':
      return en ?? ru ?? kk ?? ''
    case 'ru':
    default:
      return ru ?? kk ?? en ?? ''
  }
}
