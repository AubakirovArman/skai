/**
 * PDF Generator with pdfmake (better UTF-8 support)
 * Generates PDF with Cyrillic support
 */

import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'

export async function generatePDFWithPdfMake(data: {
  vnd: string
  np: string
  summary: string
  fileName: string
  language: 'ru' | 'kk' | 'en'
  qrCodeDataUrl: string
  downloadUrl: string
}): Promise<Buffer> {
  // Dynamic import to avoid SSR issues
  const pdfMakeModule = await import('pdfmake/build/pdfmake')
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
  
  const pdfMake = pdfMakeModule.default as any

  // vfs_fonts exports plain object with font data; ensure both vfs and font map are wired
  const vfs =
    (pdfFontsModule as any).default ||
    (pdfFontsModule as any).pdfMake?.vfs ||
    pdfFontsModule

  pdfMake.vfs = vfs
  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  }

  const { vnd, np, summary, fileName, language, qrCodeDataUrl, downloadUrl } = data

  // Get localized strings
  const strings = {
    ru: {
      title: 'Результаты анализа документа',
      date: 'Дата',
      file: 'Файл',
      summary: '📋 Краткое содержание',
      vnd: '📚 Внутренние нормативные документы (ВНД)',
      np: '⚖️ Нормативно-правовые акты (НПА)',
      qrTitle: '📲 QR-код для скачивания',
      qrSubtitle: 'Отсканируйте QR-код для скачивания этого документа',
    },
    kk: {
      title: 'Құжатты талдау нәтижелері',
      date: 'Күні',
      file: 'Файл',
      summary: '📋 Қысқаша мазмұны',
      vnd: '📚 Ішкі нормативтік құжаттар (ІНҚ)',
      np: '⚖️ Нормативтік-құқықтық актілер (НҚА)',
      qrTitle: '📲 Жүктеу үшін QR-коды',
      qrSubtitle: 'Осы құжатты жүктеу үшін QR-кодты сканерлеңіз',
    },
    en: {
      title: 'Document Analysis Results',
      date: 'Date',
      file: 'File',
      summary: '📋 Summary',
      vnd: '📚 Internal Regulatory Documents',
      np: '⚖️ Regulatory Legal Acts',
      qrTitle: '📲 Download QR Code',
      qrSubtitle: 'Scan QR code to download this document',
    },
  }

  const t = strings[language]
  const currentDate = new Date().toLocaleString(
    language === 'ru' ? 'ru-RU' : language === 'kk' ? 'kk-KZ' : 'en-US'
  )

  // Clean text from markdown
  const cleanText = (text: string) => {
    return text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .trim()
  }

  const content: Content = [
    // Title
    {
      text: t.title,
      style: 'header',
      alignment: 'center',
      margin: [0, 0, 0, 20],
    },

    // Metadata
    {
      text: [
        { text: `${t.date}: `, bold: true },
        { text: currentDate + '\n' },
        { text: `${t.file}: `, bold: true },
        { text: fileName },
      ],
      style: 'metadata',
      margin: [0, 0, 0, 20],
    },

    // Summary section
    {
      text: t.summary,
      style: 'sectionHeader',
      margin: [0, 10, 0, 10],
    },
    {
      text: cleanText(summary),
      style: 'normal',
      margin: [0, 0, 0, 15],
    },

    // VND section
    {
      text: t.vnd,
      style: 'sectionHeader',
      margin: [0, 10, 0, 10],
    },
    {
      text: cleanText(vnd),
      style: 'normal',
      margin: [0, 0, 0, 15],
    },

    // NP section
    {
      text: t.np,
      style: 'sectionHeader',
      margin: [0, 10, 0, 10],
    },
    {
      text: cleanText(np),
      style: 'normal',
      margin: [0, 0, 0, 15],
    },

    // Page break before QR code
    { text: '', pageBreak: 'before' },

    // QR Code section
    {
      text: t.qrTitle,
      style: 'qrHeader',
      alignment: 'center',
      margin: [0, 50, 0, 30],
    },
    {
      image: qrCodeDataUrl,
      width: 200,
      alignment: 'center',
      margin: [0, 0, 0, 20],
    },
    {
      text: t.qrSubtitle,
      style: 'qrSubtitle',
      alignment: 'center',
      margin: [0, 0, 0, 10],
    },
    {
      text: downloadUrl,
      style: 'link',
      alignment: 'center',
      link: downloadUrl,
    },
  ]

  const docDefinition: TDocumentDefinitions = {
    content,
    styles: {
      header: {
        fontSize: 22,
        bold: true,
        color: '#1a1a1a',
      },
      metadata: {
        fontSize: 10,
        color: '#666666',
      },
      sectionHeader: {
        fontSize: 16,
        bold: true,
        color: '#d7a13a',
      },
      normal: {
        fontSize: 11,
        lineHeight: 1.5,
        color: '#333333',
      },
      qrHeader: {
        fontSize: 18,
        bold: true,
        color: '#d7a13a',
      },
      qrSubtitle: {
        fontSize: 10,
        color: '#666666',
      },
      link: {
        fontSize: 9,
        color: '#0066cc',
      },
    },
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    defaultStyle: {
      font: 'Roboto', // pdfmake includes Roboto with Cyrillic support!
    },
  }

  return new Promise((resolve, reject) => {
    const pdfDoc = pdfMake.createPdf(docDefinition)
    pdfDoc.getBuffer(
      (buffer: Buffer) => {
        resolve(buffer)
      },
      (error: unknown) => {
        reject(error)
      }
    )
  })
}
