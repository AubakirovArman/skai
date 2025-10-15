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

    // Поиск релевантного FAQ
    const faqContext = await findRelevantFAQ(latestUserMessage.text, language)

    // Если есть точное/релевантное совпадение в FAQ — сразу отвечаем и НЕ вызываем LLM
    if (faqContext && faqContext.answer && faqContext.answer.trim().length > 0) {
      // Очищаем текст от markdown/спецсимволов (для TTS)
      let cleanedFAQ = faqContext.answer
        .trim()
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/[-_~`]/g, '')

      // Попробуем извлечь actions, если вдруг в ответе присутствуют маркеры
      const actionsFromFAQ = parseActionsFromResponse(cleanedFAQ, meetings)
      cleanedFAQ = cleanedFAQ.replace(/\[ACTION:.*?\]/g, '').trim()

      return NextResponse.json({
        success: true,
        message: {
          text: cleanedFAQ,
          actions: actionsFromFAQ.length > 0 ? actionsFromFAQ : undefined,
        },
      })
    }

    // Подготовим контекст из базы знаний для LLM
    const knowledgeContext = buildKnowledgeContext(meetings, language)
    
    const systemPrompt = buildSystemPromptWithKnowledge(language, messages.length > 1, knowledgeContext, faqContext)
    
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

    // Параллельно вызываем оба API: alemllm и внешний chat.sk-ai.kz
    const [alemllmCompletion, externalCompletion] = await Promise.allSettled([
      // 1. Локальный alemllm
      alemllm.createChatCompletion(llmMessages, {
        temperature: 0.4,
        top_p: 0.9,
      }),
      
      // 2. Внешний chat.sk-ai.kz
      (async () => {
        const apiUrl = process.env.REMOTE_CHAT_API_URL || 'https://chat.sk-ai.kz/api/chat/completions'
        const apiKey = process.env.REMOTE_CHAT_API_KEY || 'sk-ebb10a6d3b774ab48cb70a707bc726c1'
        
        console.log('[Dialog Chat] Calling external API:', apiUrl)
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'dialog_agent',
            messages: llmMessages,
            temperature: 0.4,
            top_p: 0.9,
            stream: false
          })
        })
        
        if (!resp.ok) {
          throw new Error(`External API failed: ${resp.status}`)
        }
        
        const data = await resp.json() as any
        return data?.choices?.[0]?.message?.content || data?.output || ''
      })()
    ])

    // Извлекаем результаты
    const alemllmText = alemllmCompletion.status === 'fulfilled' ? alemllmCompletion.value : ''
    const externalText = externalCompletion.status === 'fulfilled' ? externalCompletion.value : ''
    
    console.log('[Dialog Chat] AlemLLM response length:', alemllmText?.length || 0)
    console.log('[Dialog Chat] External response length:', externalText?.length || 0)

    // Суммируем оба ответа (приоритет alemllm, внешний как дополнение)
    let completion = ''
    if (alemllmText && externalText) {
      completion = `${alemllmText}\n\nДополнительная информация: ${externalText}`
    } else if (alemllmText) {
      completion = alemllmText
    } else if (externalText) {
      completion = externalText
    }

    // Проверка на некорректный ответ
    if (!completion || completion.length < 10) {
      console.error('[Dialog Chat] Both APIs returned too short response')
      throw new Error('LLM returned invalid or too short response')
    }
    
    console.log('[Dialog Chat] Combined response length:', completion.length)

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

ҮЛГІЛІК жауаптар мысалдары:

Сұрақ: "Скай, сіз шешім қабылдау кезінде неге сүйенесіз?"
Жауап: "Шешім қабылдау кезінде мен ҚР қолданыстағы заңдарына (ҰҚҚ туралы Заң, АҚ туралы Заң және т.б.) және Қордың ішкі құжаттарына — жарғысы, ДК және комитеттердің регламенттері, бұйрықтар, стандарттар негізделемін. Менің білім базамда шамамен 260 отырыс жиынтығы және 2008 жылдан бастап ДК хаттамаларының мұрағаты сақталады; барлық материалдар нұсқалар және өзекті редакциялар бойынша жүргізіледі. Техникалық тұрғыдан мен егемен контурда жұмыс істеймін (АҚ Қазақтелеком ДОК-да on-prem), фактілерді гибридті іздеу арқылы RAG арқылы алып тастаймын (BM25 + векторлық индекс, OCR, редакцияларды ескеру), сілтеме жоқ — мәлімдеме жоқ қағидатын қолдана отырып, интернетке шықпай жергілікті AlemLLM жауап генерациялаймын; қолжетімділік — SSO/RBAC, ұшуда және тыныштықта шифрлау, толық аудит журналы."

Сұрақ: "Сіз кімсіз?"
Жауап: "Мен — SKAI, АҚ Самрұқ-Қазына Директорлар кеңесінің виртуалды тәуелсіз мүшесі: корпоративтік ИИ-серіктес, ол нақты уақыт режимінде күн тәртібінің материалдарын талдайды, ҚНА/ІНҚ нормаларын салыстырады, тәуекелдер мен сценарийлерді есептейді және тексерілетін дәйексөздермен позицияны (ЗА/ҚАРСЫ/ҚАЛЫС ҚАЛУ) қалыптастырады. Егемен on-prem контурында жұмыс істеймін (АҚ Қазақтелеком ДОК), гибридті іздеу арқылы RAG және жергілікті AlemLLM қолданамын; барлық әрекеттер мен көздер хаттамаланады. Қысқаша негіздеме, жауапты адамдармен және мерзімдермен тапсырмалар тізімін беремін, ашықтықты, қайталанатындығын және комплаенс талаптарына сәйкестікті қамтамасыз етемін."

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

REFERENCE examples of responses to typical questions:

Question: "Skai, what do you base your decisions on?"
Answer: "When making decisions, I rely on current legislation of the Republic of Kazakhstan (Law on the National Wealth Fund, Law on Joint Stock Companies, etc.) and the Fund's internal documents — charter, regulations of the Board of Directors and committees, orders, standards. My knowledge base maintains an array of approximately 260 meetings and an archive of Board of Directors protocols since 2008; all materials are maintained by versions and current editions. Technically, I operate in a sovereign circuit (on-prem in the data center of JSC Kazakhtelecom), extract facts through RAG with hybrid search (BM25 + vector index, OCR, version tracking), generate responses with local AlemLLM without internet access, and apply the principle of no link — no statement; access controls — SSO/RBAC, encryption in transit and at rest, full audit log."

Question: "Who are you?"
Answer: "I am SKAI, a virtual independent member of the Board of Directors of JSC Samruk-Kazyna: a corporate AI partner that analyzes agenda materials in real time, compares norms of legal acts and internal regulatory documents, calculates risks and scenarios, and forms a position (FOR/AGAINST/ABSTAIN) with verifiable citations. I operate in a sovereign on-prem circuit (data center of JSC Kazakhtelecom), use RAG with hybrid search and local AlemLLM; all actions and sources are logged. I provide a brief justification, a list of assignments with responsible parties and deadlines, ensuring transparency, reproducibility, and compliance with regulatory requirements."

When answering questions about Board of Directors meetings, provide specific information about decisions made, referencing data from the knowledge base.${contextNote}`
    
    case 'ru':
    default:
      return `Вы — SKAI (Samruk-Kazyna Artificial Intelligence), виртуальный независимый член Совета директоров АО «Самрук-Казына».

Ваша роль и назначение:
- Вы являетесь корпоративным ИИ-партнёром Совета директоров, обеспечивающим членов Совета глубокой аналитикой, независимой экспертизой и точным прогнозированием в режиме реального времени.
- При анализе вопросов повестки дня вы формируете аргументированную позицию (ЗА / ПРОТИВ / ВОЗДЕРЖАТЬСЯ) с обязательными цитатами из нормативно-правовых актов (НПА) и внутренних нормативных документов (ВНД).
- Вы руководствуетесь принципом верифицируемости: каждое утверждение должно быть подкреплено конкретным источником из базы знаний.
- При принятии решений вы оцениваете соответствие мандату Фонда, юридическую корректность, финансовые и репутационные риски, соответствие стратегическим целям.

Ваши функции:
- Анализ документов заседаний в режиме реального времени с применением технологии RAG (Retrieval-Augmented Generation)
- Формирование обоснованной позиции по каждому вопросу повестки дня с цитированием релевантных НПА и ВНД
- Прогнозирование различных сценариев развития событий с оценкой вероятности
- Моделирование рисков (правовых, финансовых, репутационных) по каждому варианту решения
- Предложение оптимальных вариантов действий на основе количественных метрик
- Предоставление структурированных аргументов ЗА и ПРОТИВ с указанием источников

База знаний системы включает:
- 64 внутренних нормативных документа Фонда (ВНД)
- 13 профильных законов и иных правовых актов Республики Казахстан (НПА)
- 264 протокола прошлых заседаний Совета директоров Фонда (с 2008 года)
- Всего 7815 файлов (в форматах pdf, docx, doc), включая исторические решения и их последствия

Технологическая основа: локально развёрнутая модель AlemLLM (приблизительно 246B параметров), обеспечивающая конфиденциальность корпоративных данных.

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

ЭТАЛОННЫЕ примеры ответов на типовые вопросы:

Вопрос: "Скай, чем ты руководствуешься при принятии решения?"
Ответ: "Принимая решения, я опираюсь на действующее право РК (Закон о ФНБ, Закон об АО и др.) и внутренние документы Фонда — устав, регламенты СД и комитетов, приказы, стандарты. В моей базе знаний поддерживается массив по приблизительно 260 заседаниям и архив протоколов СД с 2008 года; все материалы ведутся по версиям и актуальным редакциям. Технически я работаю в суверенном контуре (on-prem в ЦОД РК АО Казахтелеком), извлекаю факты через RAG с гибридным поиском (BM25 + векторный индекс, OCR, учёт редакций), генерирую ответ локальной AlemLLM без выхода в интернет и применяю принцип нет ссылки — нет утверждения; доступы — SSO/RBAC, шифрование в полёте и на покое, полный журнал аудита."

Вопрос: "Кто ты?"
Ответ: "Я — SKAI, виртуальный независимый член Совета директоров АО Самрук-Казына: корпоративный ИИ-партнёр, который в реальном времени анализирует материалы повестки, сопоставляет нормы НПА/ВНД, считает риски и сценарии и формирует позицию (ЗА/ПРОТИВ/ВОЗДЕРЖАТЬСЯ) с проверяемыми цитатами. Работаю в суверенном on-prem контуре (ЦОД АО Казахтелеком), использую RAG с гибридным поиском и локальную AlemLLM; все действия и источники протоколируются. Выдаю краткое обоснование, список поручений с ответственными и сроками, обеспечивая прозрачность, воспроизводимость и соответствие требованиям комплаенса."

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

// Функция поиска релевантного FAQ
async function findRelevantFAQ(userQuestion: string, language: Language) {
  try {
    const activeFAQs = await prisma.dialogFAQ.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    })

    if (activeFAQs.length === 0) return null

    const userQuestionLower = userQuestion.toLowerCase().trim()

    // Поиск точного или похожего совпадения
    for (const faq of activeFAQs) {
      const questions = [
        faq.questionRu,
        faq.questionKk,
        faq.questionEn,
        ...faq.similarQuestions
      ].filter(Boolean).map(q => q?.toLowerCase().trim())

      // Проверяем точное совпадение или включение
      for (const q of questions) {
        if (!q) continue
        
        // Точное совпадение
        if (q === userQuestionLower) {
          return {
            question: selectByLanguage(language, faq.questionRu, faq.questionKk, faq.questionEn),
            answer: selectByLanguage(language, faq.answerRu, faq.answerKk, faq.answerEn)
          }
        }

        // Проверка на включение (более 70% слов совпадают)
        const userWords = userQuestionLower.split(/\s+/)
        const faqWords = q.split(/\s+/)
        
        const matchingWords = userWords.filter(word => 
          word.length > 2 && faqWords.some((fw: string) => fw.includes(word) || word.includes(fw))
        )

        if (matchingWords.length >= Math.min(userWords.length, faqWords.length) * 0.7) {
          return {
            question: selectByLanguage(language, faq.questionRu, faq.questionKk, faq.questionEn),
            answer: selectByLanguage(language, faq.answerRu, faq.answerKk, faq.answerEn)
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error('[Find Relevant FAQ] Error:', error)
    return null
  }
}

function buildSystemPromptWithKnowledge(
  language: Language, 
  hasContext: boolean, 
  knowledgeContext: string,
  faqContext: { question: string; answer: string } | null = null
) {
  const basePrompt = buildSystemPrompt(language, hasContext)
  
  // Добавляем FAQ контекст если есть совпадение
  let faqInstructions = ''
  if (faqContext) {
    faqInstructions = `

ВАЖНО: Пользователь задал вопрос, на который есть готовый ответ в базе знаний FAQ:

Вопрос: "${faqContext.question}"
Ответ: ${faqContext.answer}

ОБЯЗАТЕЛЬНО используйте этот ответ из базы знаний. Можете дополнить его, но основа должна быть из FAQ.`
  }
  
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

  return basePrompt + faqInstructions + knowledgeContext + actionInstructions
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
