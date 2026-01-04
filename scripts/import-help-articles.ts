/**
 * Import-Skript für Hilfe-Artikel in Sanity
 *
 * Liest alle JSON-Dateien aus docs/help-content/articles/
 * und importiert sie in Sanity CMS.
 *
 * Usage: npx tsx scripts/import-help-articles.ts
 *
 * Optionen:
 *   --dry-run    Zeigt was importiert würde, ohne tatsächlich zu importieren
 *   --category   Nur eine bestimmte Kategorie importieren (z.B. --category=crm)
 */

import { createClient } from '@sanity/client'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Lade .env.local für lokale Entwicklung
dotenv.config({ path: '.env.local' })

// Sanity Client konfigurieren
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'your-project-id',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_TOKEN, // Benötigt Write-Rechte
  apiVersion: '2024-01-01',
  useCdn: false,
})

// Pfade
const ARTICLES_DIR = path.join(process.cwd(), 'docs/help-content/articles')
const CATEGORIES_MAP: Record<string, string> = {}

// Parse inline Markdown (**fett**, *kursiv*, [links](url)) zu Portable Text spans
function parseInlineMarkdown(text: string): {
  spans: { _type: string; _key: string; text: string; marks: string[] }[];
  markDefs: { _type: string; _key: string; href: string }[];
} {
  const spans: { _type: string; _key: string; text: string; marks: string[] }[] = []
  const markDefs: { _type: string; _key: string; href: string }[] = []

  // Regex für **fett**, *kursiv* und [links](url)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // Text vor dem Match
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index)
      if (before) {
        spans.push({ _type: 'span', _key: generateKey(), text: before, marks: [] })
      }
    }

    // Match selbst
    if (match[2]) {
      // **fett**
      spans.push({ _type: 'span', _key: generateKey(), text: match[2], marks: ['strong'] })
    } else if (match[3]) {
      // *kursiv*
      spans.push({ _type: 'span', _key: generateKey(), text: match[3], marks: ['em'] })
    } else if (match[4] && match[5]) {
      // [link text](url)
      const linkKey = generateKey()
      markDefs.push({ _type: 'link', _key: linkKey, href: match[5] })
      spans.push({ _type: 'span', _key: generateKey(), text: match[4], marks: [linkKey] })
    }

    lastIndex = match.index + match[0].length
  }

  // Rest nach dem letzten Match
  if (lastIndex < text.length) {
    spans.push({ _type: 'span', _key: generateKey(), text: text.slice(lastIndex), marks: [] })
  }

  // Falls keine Matches, ganzen Text als span
  if (spans.length === 0) {
    spans.push({ _type: 'span', _key: generateKey(), text, marks: [] })
  }

  return { spans, markDefs }
}

// Markdown zu Portable Text konvertieren
function markdownToPortableText(markdown: string): unknown[] {
  if (!markdown) return []

  const blocks: unknown[] = []
  const lines = markdown.split('\n')
  let currentParagraph: string[] = []

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim()
      if (text) {
        const { spans, markDefs } = parseInlineMarkdown(text)
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'normal',
          markDefs,
          children: spans
        })
      }
      currentParagraph = []
    }
  }

  for (const line of lines) {
    // Überschriften (Reihenfolge wichtig: ### vor ## vor #)
    if (line.startsWith('### ')) {
      flushParagraph()
      const { spans, markDefs } = parseInlineMarkdown(line.slice(4).trim())
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'h3',
        markDefs,
        children: spans
      })
    } else if (line.startsWith('## ')) {
      flushParagraph()
      const { spans, markDefs } = parseInlineMarkdown(line.slice(3).trim())
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'h2',
        markDefs,
        children: spans
      })
    } else if (line.startsWith('# ')) {
      flushParagraph()
      const { spans, markDefs } = parseInlineMarkdown(line.slice(2).trim())
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'h1',
        markDefs,
        children: spans
      })
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph()
      const { spans, markDefs } = parseInlineMarkdown(line.slice(2).trim())
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs,
        children: spans
      })
    } else if (/^\d+\. /.test(line)) {
      flushParagraph()
      const { spans, markDefs } = parseInlineMarkdown(line.replace(/^\d+\. /, '').trim())
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        listItem: 'number',
        level: 1,
        markDefs,
        children: spans
      })
    } else if (line.trim() === '') {
      flushParagraph()
    } else {
      currentParagraph.push(line)
    }
  }

  flushParagraph()
  return blocks
}

// Zufälligen Key generieren
function generateKey(): string {
  return Math.random().toString(36).substring(2, 10)
}

// Kategorie-ID aus Sanity holen oder erstellen
async function getCategoryId(categorySlug: string): Promise<string | null> {
  // Cache prüfen
  if (CATEGORIES_MAP[categorySlug]) {
    return CATEGORIES_MAP[categorySlug]
  }

  // In Sanity suchen
  const category = await client.fetch(
    `*[_type == "helpCategory" && slug.current == $slug][0]._id`,
    { slug: categorySlug }
  )

  if (category) {
    CATEGORIES_MAP[categorySlug] = category
    return category
  }

  console.warn(`⚠️  Kategorie "${categorySlug}" nicht gefunden in Sanity`)
  return null
}

// Artikel-ID aus Slug holen (für relatedArticles)
async function getArticleIdBySlug(slug: string): Promise<string | null> {
  const article = await client.fetch(
    `*[_type == "helpArticle" && slug.current == $slug][0]._id`,
    { slug }
  )
  return article || null
}

// Einzelnen Artikel importieren
async function importArticle(articleData: ArticleJson, dryRun: boolean): Promise<boolean> {
  const slug = articleData.slug?.current || articleData.slug

  if (!slug) {
    console.error(`❌ Artikel ohne Slug übersprungen`)
    return false
  }

  console.log(`📄 Verarbeite: ${articleData.title} (${slug})`)

  // Im Dry-Run Modus: Nur Struktur prüfen, keine Sanity-Abfragen
  if (dryRun) {
    // Portable Text aus Markdown generieren (zum Testen)
    const contentDE = typeof articleData.content === 'object'
      ? markdownToPortableText(articleData.content.de || '')
      : markdownToPortableText(articleData.content || '')

    const contentEN = typeof articleData.content === 'object'
      ? markdownToPortableText(articleData.content.en || '')
      : []

    console.log(`   [DRY-RUN] Würde erstellen/aktualisieren:`)
    console.log(`   - Titel: ${articleData.title}`)
    console.log(`   - Titel EN: ${articleData.titleEn || '(nicht vorhanden)'}`)
    console.log(`   - Kategorie: ${articleData.category}`)
    console.log(`   - Content-Blöcke (DE): ${contentDE.length}`)
    console.log(`   - Content-Blöcke (EN): ${contentEN.length}`)
    console.log(`   - Keywords: ${articleData.keywords?.length || 0}`)
    console.log(`   - Tipps: ${articleData.tips?.length || 0}`)
    console.log(`   - Verwandte Artikel: ${articleData.relatedArticles?.length || 0}`)
    return true
  }

  // Kategorie-Referenz holen (nur im echten Import)
  const categoryId = await getCategoryId(articleData.category)
  if (!categoryId) {
    console.error(`❌ Kategorie "${articleData.category}" nicht gefunden - Artikel übersprungen`)
    return false
  }

  // Portable Text aus Markdown generieren
  const contentDE = typeof articleData.content === 'object'
    ? markdownToPortableText(articleData.content.de || '')
    : markdownToPortableText(articleData.content || '')

  const contentEN = typeof articleData.content === 'object'
    ? markdownToPortableText(articleData.content.en || '')
    : []

  // Related Articles Referenzen auflösen
  const relatedRefs: { _type: string; _ref: string; _key: string }[] = []
  if (articleData.relatedArticles && articleData.relatedArticles.length > 0) {
    for (const relatedSlug of articleData.relatedArticles) {
      const relatedId = await getArticleIdBySlug(relatedSlug)
      if (relatedId) {
        relatedRefs.push({ _type: 'reference', _ref: relatedId, _key: generateKey() })
      }
    }
  }

  // Sanity-Dokument erstellen
  const doc = {
    _type: 'helpArticle',
    title: articleData.title,
    titleEn: articleData.titleEn,
    slug: { _type: 'slug', current: slug },
    excerpt: articleData.excerpt,
    excerptEn: articleData.excerptEn,
    category: { _type: 'reference', _ref: categoryId },
    onboardingStep: articleData.onboardingStep || null,
    keywords: articleData.keywords || [],
    content: contentDE,
    contentEn: contentEN,
    tips: articleData.tips?.map(tip => ({
      _type: 'object',
      _key: generateKey(),
      tip: tip.tip,
      tipEn: tip.tipEn
    })) || [],
    videos: articleData.videos?.map(video => ({
      _type: 'object',
      _key: generateKey(),
      title: video.title,
      titleEn: video.titleEn,
      url: video.url,
      duration: video.duration
    })) || [],
    relatedArticles: relatedRefs,
    publishedAt: new Date().toISOString(),
  }

  try {
    // Prüfen ob Artikel bereits existiert
    const existing = await client.fetch(
      `*[_type == "helpArticle" && slug.current == $slug][0]._id`,
      { slug }
    )

    if (existing) {
      // Aktualisieren
      await client.patch(existing).set(doc).commit()
      console.log(`   ✅ Aktualisiert`)
    } else {
      // Neu erstellen
      await client.create(doc)
      console.log(`   ✅ Erstellt`)
    }
    return true
  } catch (error) {
    console.error(`   ❌ Fehler:`, error)
    return false
  }
}

// Alle JSON-Dateien in einem Verzeichnis finden
function findJsonFiles(dir: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findJsonFiles(fullPath))
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath)
    }
  }

  return files
}

// TypeScript Interface für Artikel-JSON
interface ArticleJson {
  _type?: string
  title: string
  titleEn?: string
  slug: string | { current: string }
  excerpt?: string
  excerptEn?: string
  category: string
  onboardingStep?: string | null
  keywords?: string[]
  content: string | { de: string; en: string }
  tips?: Array<{ tip: string; tipEn?: string }>
  videos?: Array<{ title: string; titleEn?: string; url: string; duration?: number }>
  relatedArticles?: string[]
}

// Hauptfunktion
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1]

  console.log('🚀 Hilfe-Artikel Import')
  console.log('========================')

  if (dryRun) {
    console.log('📋 DRY-RUN Modus - es werden keine Änderungen vorgenommen\n')
  }

  if (!process.env.SANITY_API_TOKEN && !dryRun) {
    console.error('❌ SANITY_API_TOKEN Umgebungsvariable nicht gesetzt!')
    console.log('   Setze die Variable oder nutze --dry-run zum Testen')
    process.exit(1)
  }

  // JSON-Dateien finden
  let jsonFiles = findJsonFiles(ARTICLES_DIR)

  if (categoryFilter) {
    jsonFiles = jsonFiles.filter(f => f.includes(`/${categoryFilter}/`) || f.includes(`\\${categoryFilter}\\`))
    console.log(`📁 Filtere auf Kategorie: ${categoryFilter}`)
  }

  console.log(`📁 Gefundene Artikel-Dateien: ${jsonFiles.length}\n`)

  if (jsonFiles.length === 0) {
    console.log('ℹ️  Keine JSON-Dateien gefunden in:', ARTICLES_DIR)
    console.log('   Erstelle zuerst Artikel mit dem help-content-writer Agenten.')
    return
  }

  let success = 0
  let failed = 0

  for (const file of jsonFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8')
      const articleData: ArticleJson = JSON.parse(content)

      const result = await importArticle(articleData, dryRun)
      if (result) {
        success++
      } else {
        failed++
      }
    } catch (error) {
      console.error(`❌ Fehler beim Lesen von ${file}:`, error)
      failed++
    }
  }

  console.log('\n========================')
  console.log(`✅ Erfolgreich: ${success}`)
  console.log(`❌ Fehlgeschlagen: ${failed}`)

  if (dryRun) {
    console.log('\n💡 Führe ohne --dry-run aus um tatsächlich zu importieren')
  }
}

main().catch(console.error)
