/**
 * Import-Skript für Hilfe-Seiten-Mappings in Sanity
 *
 * Liest alle JSON-Dateien aus docs/help-content/mappings/
 * und importiert sie als helpPageMapping-Dokumente in Sanity CMS.
 *
 * Usage: npx tsx scripts/import-help-mappings.ts
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
const MAPPINGS_DIR = path.join(process.cwd(), 'docs/help-content/mappings')

// Cache für Artikel-IDs
const ARTICLES_CACHE: Record<string, string> = {}

// Zufälligen Key generieren
function generateKey(): string {
  return Math.random().toString(36).substring(2, 10)
}

// Artikel-ID aus Slug holen
async function getArticleIdBySlug(slug: string): Promise<string | null> {
  // Cache prüfen
  if (ARTICLES_CACHE[slug]) {
    return ARTICLES_CACHE[slug]
  }

  const article = await client.fetch(
    `*[_type == "helpArticle" && slug.current == $slug][0]._id`,
    { slug }
  )

  if (article) {
    ARTICLES_CACHE[slug] = article
  }

  return article || null
}

// TypeScript Interfaces
interface QuickTip {
  tip: string
  tipEn?: string
}

interface FeatureVideo {
  title: string
  titleEn?: string
  url: string
  thumbnailUrl?: string
}

interface MappingDefinition {
  pageName: string
  routes: string[]
  mainArticle?: string
  quickTips?: QuickTip[]
  featureVideo?: FeatureVideo
  additionalArticles?: string[]
}

interface MappingFile {
  _description?: string
  mappings: MappingDefinition[]
}

// Einzelnes Mapping importieren
async function importMapping(mapping: MappingDefinition, dryRun: boolean): Promise<boolean> {
  console.log(`📄 Verarbeite: ${mapping.pageName}`)
  console.log(`   Routen: ${mapping.routes.join(', ')}`)

  // Im Dry-Run Modus: Nur Struktur prüfen
  if (dryRun) {
    console.log(`   [DRY-RUN] Würde erstellen/aktualisieren:`)
    console.log(`   - Haupt-Artikel: ${mapping.mainArticle || '(keiner)'}`)
    console.log(`   - Quick-Tipps: ${mapping.quickTips?.length || 0}`)
    console.log(`   - Weitere Artikel: ${mapping.additionalArticles?.length || 0}`)
    return true
  }

  // Haupt-Artikel-Referenz holen
  let mainArticleRef = null
  if (mapping.mainArticle) {
    const articleId = await getArticleIdBySlug(mapping.mainArticle)
    if (articleId) {
      mainArticleRef = { _type: 'reference', _ref: articleId }
    } else {
      console.warn(`   ⚠️  Haupt-Artikel "${mapping.mainArticle}" nicht gefunden`)
    }
  }

  // Zusätzliche Artikel-Referenzen holen
  const additionalRefs: { _type: string; _ref: string; _key: string }[] = []
  if (mapping.additionalArticles && mapping.additionalArticles.length > 0) {
    for (const slug of mapping.additionalArticles) {
      const articleId = await getArticleIdBySlug(slug)
      if (articleId) {
        additionalRefs.push({ _type: 'reference', _ref: articleId, _key: generateKey() })
      } else {
        console.warn(`   ⚠️  Zusätzlicher Artikel "${slug}" nicht gefunden`)
      }
    }
  }

  // Sanity-Dokument erstellen
  const doc: Record<string, unknown> = {
    _type: 'helpPageMapping',
    pageName: mapping.pageName,
    routes: mapping.routes,
    quickTips: mapping.quickTips?.map(tip => ({
      _type: 'object',
      _key: generateKey(),
      tip: tip.tip,
      tipEn: tip.tipEn,
    })) || [],
    additionalArticles: additionalRefs,
  }

  // Optionale Felder nur wenn vorhanden
  if (mainArticleRef) {
    doc.mainArticle = mainArticleRef
  }

  if (mapping.featureVideo) {
    doc.featureVideo = {
      title: mapping.featureVideo.title,
      titleEn: mapping.featureVideo.titleEn,
      url: mapping.featureVideo.url,
      thumbnailUrl: mapping.featureVideo.thumbnailUrl,
    }
  }

  try {
    // Prüfen ob Mapping bereits existiert (über pageName)
    const existing = await client.fetch(
      `*[_type == "helpPageMapping" && pageName == $pageName][0]._id`,
      { pageName: mapping.pageName }
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

// Hauptfunktion
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1]

  console.log('🚀 Hilfe-Seiten-Mappings Import')
  console.log('================================')

  if (dryRun) {
    console.log('📋 DRY-RUN Modus - es werden keine Änderungen vorgenommen\n')
  }

  if (!process.env.SANITY_API_TOKEN && !dryRun) {
    console.error('❌ SANITY_API_TOKEN Umgebungsvariable nicht gesetzt!')
    console.log('   Setze die Variable oder nutze --dry-run zum Testen')
    process.exit(1)
  }

  // JSON-Dateien finden
  let jsonFiles = findJsonFiles(MAPPINGS_DIR)

  if (categoryFilter) {
    jsonFiles = jsonFiles.filter(f => f.includes(categoryFilter))
    console.log(`📁 Filtere auf Kategorie: ${categoryFilter}`)
  }

  console.log(`📁 Gefundene Mapping-Dateien: ${jsonFiles.length}\n`)

  if (jsonFiles.length === 0) {
    console.log('ℹ️  Keine JSON-Dateien gefunden in:', MAPPINGS_DIR)
    console.log('   Erstelle zuerst Mapping-Definitionen.')
    return
  }

  let success = 0
  let failed = 0
  let totalMappings = 0

  for (const file of jsonFiles) {
    try {
      console.log(`\n📂 Datei: ${path.basename(file)}`)
      console.log('---')

      const content = fs.readFileSync(file, 'utf-8')
      const mappingFile: MappingFile = JSON.parse(content)

      for (const mapping of mappingFile.mappings) {
        totalMappings++
        const result = await importMapping(mapping, dryRun)
        if (result) {
          success++
        } else {
          failed++
        }
      }
    } catch (error) {
      console.error(`❌ Fehler beim Lesen von ${file}:`, error)
      failed++
    }
  }

  console.log('\n================================')
  console.log(`📊 Gesamt: ${totalMappings} Mappings`)
  console.log(`✅ Erfolgreich: ${success}`)
  console.log(`❌ Fehlgeschlagen: ${failed}`)

  if (dryRun) {
    console.log('\n💡 Führe ohne --dry-run aus um tatsächlich zu importieren')
  }
}

main().catch(console.error)
