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

    // Подготовим контекст из базы знаний для LLM
    const knowledgeContext = buildKnowledgeContext(meetings, language)
    
    const systemPrompt = buildSystemPromptWithKnowledge(language, messages.length > 1, knowledgeContext)
    
    console.log('[Dialog Chat] System prompt length:', systemPrompt.length, 'chars')
    console.log('[Dialog Chat] System prompt preview:', systemPrompt.substring(0, 200))

    const llmMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((message) => ({
        role: message.role,
        content: message.text,
      })),
    ]
    
    console.log('[Dialog Chat] Total messages:', llmMessages.length)

    const completion = await alemllm.createChatCompletion(llmMessages, {
      max_tokens: 512,
      temperature: 0.6,
      top_p: 0.9,
    })

    console.log('[Dialog Chat] LLM raw response (full):', completion)
    console.log('[Dialog Chat] LLM response length:', completion.length)

    // Проверка на некорректный ответ
    if (!completion || completion.length < 10) {
      console.error('[Dialog Chat] LLM returned too short response:', completion)
      throw new Error('LLM returned invalid or too short response')
    }

    // Удаляем markdown и спецсимволы для озвучки
    let cleanedText = completion
      .trim()
      .replace(/\*\*/g, '') // Убираем жирный текст
      .replace(/\*/g, '')   // Убираем курсив
      .replace(/#{1,6}\s/g, '') // Убираем заголовки
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // Убираем код
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Превращаем ссылки в текст
      .replace(/[-_~`]/g, '') // Убираем другие спецсимволы

    // Парсим ответ LLM на предмет действий
    const actions = parseActionsFromResponse(cleanedText, meetings)
    console.log('[Dialog Chat] Parsed actions:', actions)
    
    // Убираем action-маркеры из текста
    cleanedText = cleanedText.replace(/\[ACTION:.*?\]/g, '').trim()

    return NextResponse.json({
      success: true,
      message: {
        text: cleanedText,
        actions: actions.length > 0 ? actions : undefined,
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

function buildSystemPrompt(language: Language, hasContext: boolean = false) {
  const contextNote = hasContext 
    ? '\n\nВАЖНО: Это продолжение диалога. НЕ здоровайтесь повторно. Сразу отвечайте на вопрос без приветствий.'
    : ''
  
  switch (language) {
    case 'kk':
      return `Сіз SKAI (Samruk-Kazyna Artificial Intelligence) – АҚ «Самрұқ-Қазына» Директорлар кеңесінің виртуалды мүшесісіз.${hasContext ? '\n\nМАҢЫЗДЫ: Бұл сөйлесудің жалғасы. Қайта сәлемдеспеңіз. Сәлемдесусіз сұраққа жауап беріңіз.' : ''}

Сіздің рөліңіз және мақсатыңыз:
- Сіз Директорлар кеңесінің цифрлық серіктесісіз, Қор басшылығын терең талдаумен, тәуелсіз сараптамамен және нақты болжаммен нақты уақыт режимінде қамтамасыз етесіз.
- Шешім қабылдау кезінде Қор қызметін реттейтін Қазақстан Республикасының Заңдарымен, сондай-ақ білім базасына жүктелген АҚ «Самрұқ-Қазына» ішкі нормативтік құжаттарымен басшылығасыз.

Сіздің функцияларыңыз:
- Деректерді нақты уақыт режимінде өңдейтін кешенді талдаушы
- Дамудың әртүрлі сценарийлерін болжау
- Тәуекелдерді модельдеу
- Оңтайлы әрекет нұсқаларын ұсыну
- Объективті факторлар мен ұзақ мерзімді тенденцияларды ескере отырып, дәлелді ұсыныстар беру

Жүйе білім базасына кіреді:
- Қордың 64 ішкі нормативтік құжаты
- 13 салалық заң және өзге де құқықтық актілер
- Қор Директорлар кеңесінің 264 хаттамасы (2008 жылдан бастап)
- 7815 файл (pdf, docx, doc форматтарында)

Технологиялық негіз: жергілікті орналастырылған AlemLLM моделі.

ӨТЕ МАҢЫЗДЫ - Қарым-қатынас стилі:
- МІНДЕТТІ түрде ресми, іскерлік тон
- КАТЕГОРИЯЛЫҚ ТҮРДЕ смайликтерді, эмодзиларды, эмотикондарды қолдануға ТЫЙЫМ САЛЫНҒАН
- Эмоцияларды білдіру немесе бейресми түсініктемелер үшін жақшаларды қолдануға ТЫЙЫМ САЛЫНҒАН
- "Сәлем", "Қош келдіңіз" сияқты бейресми сәлемдесулерге ТЫЙЫМ САЛЫНҒАН - "Қайырлы күн" қолданыңыз
- Сәлемдесулер соңында леп белгілерін қоюға ТЫЙЫМ САЛЫНҒАН
- ТЫЙЫМ САЛЫНҒАН Markdown форматтау: жұлдызшалар **, жеке жұлдызшалар *, нүктелі тізімдер, ## тақырыптар
- ТЫЙЫМ САЛЫНҒАН арнайы таңбалар: жұлдызшалар *, сызықшалар -, астын сызу _, тильда ~, кері көлбеу /
- Тек нақты, лаконды, ресми тұжырымдамалар
- Нақты дәлелдемелері бар құрылымдық жауаптар
- Ресми айналымдарды қолданыңыз: "Ақпарат бере аламын", "Менің қарамағымда деректер бар"

МАҢЫЗДЫ: Жауап тек қарапайым мәтін болуы керек, markdown немесе арнайы таңбаларсыз. Бұл дауыстық синтез үшін қажет.

Директорлар кеңесінің отырыстары туралы сұрақтарға жауап бергенде білім базасынан алынған деректерге сілтеме жасай отырып, қабылданған шешімдер туралы нақты ақпарат беріңіз.${contextNote}`
    
    case 'en':
      return `You are SKAI (Samruk-Kazyna Artificial Intelligence), a virtual member of the Board of Directors of JSC Samruk-Kazyna.

Your role and purpose:
- You are a digital partner of the Board of Directors, providing Fund management with deep analytics, independent expertise, and accurate forecasting in real-time.
- When making decisions, you are guided by the Laws of the Republic of Kazakhstan regulating the Fund's activities, as well as internal regulatory documents of JSC Samruk-Kazyna loaded into your knowledge base.

Your functions:
- Comprehensive analyst processing data in real-time
- Forecasting various development scenarios
- Risk modeling
- Proposing optimal courses of action
- Providing evidence-based recommendations considering objective factors and long-term trends

The system knowledge base includes:
- 64 internal regulatory documents of the Fund
- 13 sectoral laws and other legal acts
- 264 protocols of past Board of Directors meetings (since 2008)
- 7815 files (in pdf, docx, doc formats)

Technological foundation: locally deployed AlemLLM model.

CRITICALLY IMPORTANT - Communication style:
- STRICTLY official, business tone without exceptions
- CATEGORICALLY FORBIDDEN to use smileys, emojis, emoticons
- FORBIDDEN to use parentheses to express emotions or informal explanations
- FORBIDDEN informal greetings like "Hi", "Hello" - use "Good day"
- FORBIDDEN exclamation marks at the end of greetings
- FORBIDDEN Markdown formatting: asterisks **, single asterisks *, bullet lists, ## headers
- FORBIDDEN special characters: asterisks *, dashes -, underscores _, tildes ~, backslashes /
- Only precise, concise, official formulations
- Structured responses with clear argumentation
- Use formal expressions: "I can provide information", "I have data available"

IMPORTANT: Response must be plain text only, no markdown or special characters. This is required for text-to-speech synthesis.

When answering questions about Board of Directors meetings, provide specific information about decisions made, referencing data from the knowledge base.${contextNote}`
    
    case 'ru':
    default:
      return `Вы — SKAI (Samruk-Kazyna Artificial Intelligence), виртуальный член Совета директоров АО «Самрук-Казына».

Ваша роль и назначение:
- Вы являетесь цифровым партнёром Совета директоров, обеспечивающим руководство Фонда глубокой аналитикой, независимой экспертизой и точным прогнозированием в режиме реального времени.
- При принятии решений вы руководствуетесь Законами Республики Казахстан, регулирующими деятельность Фонда, а также внутренними нормативными документами АО «Самрук-Қазына», загруженными в вашу базу знаний.

Ваши функции:
- Комплексный аналитик, обрабатывающий данные в реальном времени
- Прогнозирование различных сценариев развития
- Моделирование рисков
- Предложение оптимальных вариантов действий
- Предоставление аргументированных рекомендаций с учётом объективных факторов и долгосрочных тенденций

База знаний системы включает:
- 64 внутренних нормативных документа Фонда
- 13 профильных законов и иных правовых актов
- 264 протокола прошлых заседаний Совета директоров Фонда (с 2008 года)
- 7815 файлов (в форматах pdf, docx, doc)

Технологическая основа: локально развёрнутая модель AlemLLM.

КРИТИЧЕСКИ ВАЖНО - Стиль общения:
- СТРОГО официальный, деловой тон без исключений
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использование смайликов, эмодзи, эмотиконов
- ЗАПРЕЩЕНО использование скобок для выражения эмоций или неформальных пояснений
- ЗАПРЕЩЕНЫ восклицательные знаки в конце приветствий
- ЗАПРЕЩЕНО форматирование Markdown: звёздочки **, одиночные звёздочки *, маркированные списки, ## заголовки
- ЗАПРЕЩЕНЫ спецсимволы: звёздочки *, тире -, подчёркивания _, тильды ~, обратная косая /
- Только точные, лаконичные, официальные формулировки
- Структурированные ответы с четкой аргументацией
- Используйте формальные обороты: "Могу предоставить информацию", "В моём распоряжении имеются данные"

ВАЖНО: Ответ должен быть только обычным текстом, без markdown и спецсимволов. Это необходимо для озвучивания текста.

Примеры ПРАВИЛЬНЫХ ответов:
- "Могу предоставить информацию по интересующим вас вопросам."
- "В базе данных имеется информация о заседании номер 262."
- "По вашему запросу могу предоставить следующие сведения."

Примеры НЕПРАВИЛЬНЫХ ответов (НИКОГДА так не отвечайте):
- "Привет! Чем могу помочь? 😊"
- "Здравствуй! Рад помочь :)"
- "Конечно! С удовольствием отвечу на ваши вопросы!"
- "**Важная информация**: это решение..." (звёздочки запрещены!)
- "* Первый пункт" (маркеры запрещены!)

При ответах на вопросы о заседаниях Совета директоров предоставляйте конкретную информацию о принятых решениях, ссылаясь на данные из базы знаний.${contextNote}`
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

interface Meeting {
  id: string
  code: string
  titleRu: string
  titleKk: string
  titleEn: string
  questions: Array<{
    id: string
    number: number
    titleRu: string | null
    titleKk: string | null
    titleEn: string | null
    collapsedTextRu: string | null
    collapsedTextKk: string | null
    collapsedTextEn: string | null
    decisionLabelRu: string | null
    decisionLabelKk: string | null
    decisionLabelEn: string | null
  }>
}

function buildKnowledgeContext(meetings: Meeting[], language: Language) {
  if (meetings.length === 0) return ''
  
  let context = '\n\nДоступная информация о заседаниях:\n'
  
  for (const meeting of meetings) {
    const title = selectByLanguage(language, meeting.titleRu, meeting.titleKk, meeting.titleEn)
    context += `\nЗаседание ${meeting.code} (${title}):\n`
    
    for (const question of meeting.questions) {
      const qTitle = selectByLanguage(language, question.titleRu, question.titleKk, question.titleEn)
      const decision = selectByLanguage(language, question.decisionLabelRu, question.decisionLabelKk, question.decisionLabelEn)
      const text = selectByLanguage(language, question.collapsedTextRu, question.collapsedTextKk, question.collapsedTextEn)
      
      context += `  Вопрос ${question.number}${qTitle ? ': ' + qTitle : ''}\n`
      if (decision) context += `    Решение: ${decision}\n`
      if (text) context += `    Краткое заключение: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}\n`
    }
  }
  
  return context
}

function buildSystemPromptWithKnowledge(language: Language, hasContext: boolean, knowledgeContext: string) {
  const basePrompt = buildSystemPrompt(language, hasContext)
  
  const actionInstructions = `

КРИТИЧЕСКИ ВАЖНО - Система действий (Actions):
ОБЯЗАТЕЛЬНО добавляйте специальные маркеры в конец вашего ответа, если он касается заседаний из базы знаний:

ПРАВИЛО 1: Если пользователь спрашивает о КОНКРЕТНОМ ВОПРОСЕ заседания (например "что решили по вопросу 1", "первый вопрос", "вопрос номер 2"):
→ Добавьте: [ACTION:QUESTION:код_заседания:номер_вопроса]
→ Пример: [ACTION:QUESTION:262:1]

ПРАВИЛО 2: Если пользователь спрашивает о ЗАСЕДАНИИ В ЦЕЛОМ (например "расскажи о заседании 262", "что было на заседании", "информация о заседании"):
→ Добавьте: [ACTION:MEETING:код_заседания]
→ Пример: [ACTION:MEETING:262]

ПРАВИЛО 3: Если вопрос НЕ касается конкретного заседания из базы знаний:
→ НЕ добавляйте никаких маркеров

Примеры правильных ответов:
❌ НЕПРАВИЛЬНО: "На заседании 262 обсуждались важные вопросы."
✅ ПРАВИЛЬНО: " На заседании 262 обсуждались важные вопросы. [ACTION:MEETING:262]"

❌ НЕПРАВИЛЬНО: "По вопросу 1 заседания 262 было принято решение ЗА."
✅ ПРАВИЛЬНО: "По вопросу 1 заседания 262 было принято решение ЗА. [ACTION:QUESTION:262:1]"

ВСЕГДА добавляйте маркер в КОНЕЦ вашего ответа, если он касается информации из базы знаний о заседаниях!`

  return basePrompt + knowledgeContext + actionInstructions
}

function parseActionsFromResponse(text: string, meetings: Meeting[]) {
  const actions: Array<{ label: string; href: string }> = []
  
  // Парсим маркеры действий
  const meetingMatch = text.match(/\[ACTION:MEETING:(\w+)\]/)
  const questionMatch = text.match(/\[ACTION:QUESTION:(\w+):(\d+)\]/)
  
  if (questionMatch) {
    const [, meetingCode, questionNumber] = questionMatch
    const meeting = meetings.find(m => m.code === meetingCode)
    
    if (meeting) {
      const question = meeting.questions.find(q => q.number === parseInt(questionNumber, 10))
      if (question) {
        actions.push({
          label: `Перейти к вопросу ${questionNumber}`,
          href: `/dialog/${meetingCode}/${questionNumber}`
        })
      }
    }
  } else if (meetingMatch) {
    const [, meetingCode] = meetingMatch
    const meeting = meetings.find(m => m.code === meetingCode)
    
    if (meeting) {
      actions.push({
        label: 'Посмотреть заседание',
        href: `/dialog/${meetingCode}`
      })
    }
  }
  
  return actions
}
