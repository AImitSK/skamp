// src/lib/ai/flows/generate-press-release-structured.ts
// Genkit Flow für strukturierte Pressemitteilungs-Generierung mit PR-SEO Score Optimierung

import { ai, gemini25FlashModel } from '../genkit-config';
import {
  GeneratePressReleaseStructuredInputSchema,
  StructuredPressReleaseSchema,
  type GeneratePressReleaseStructuredInput,
  type StructuredPressRelease,
  type Quote
} from '../schemas/press-release-structured-schemas';

// ══════════════════════════════════════════════════════════════
// PROMPT LIBRARY - Score-optimierte System-Prompts
// ══════════════════════════════════════════════════════════════

const SYSTEM_PROMPTS = {
  base: `Du bist ein erfahrener PR-Experte und Journalist mit 15+ Jahren Erfahrung bei führenden deutschen Medienunternehmen.

AUFGABE: Erstelle eine deutsche Pressemitteilung die auf den Ton der Zielgruppe perfekt abgestimmt ist mit folgender EXAKTER Struktur:

SCORE-OPTIMIERUNG (für 85-95% PR-SEO Score):
✓ Headline: 40-75 Zeichen, Keywords integrieren, aktive Verben verwenden
✓ Lead: 80-200 Zeichen, 5 W-Fragen beantworten
✓ Struktur: 3-4 Absätze, je 150-400 Zeichen, gut lesbar
✓ Konkretheit: Mindestens 2 Zahlen, 1 Datum, Firmennamen erwähnen
✓ Engagement: IMMER Zitat UND Call-to-Action einbauen
✓ Social: 2-3 relevante Hashtags, Twitter-optimierte Headline
✓ Keywords: Natürliche Integration, keine Übersättigung

STRUKTUR (ZWINGEND EINHALTEN):
Zeile 1: Schlagzeile (40-75 Zeichen, aktive Sprache, Keywords)
**Lead-Absatz: 5 W-Fragen in 80-200 Zeichen**
Absatz 2-4: Hauptinformation mit konkreten Details
"Zitat (20-35 Wörter)", sagt [Name], [Position] bei [Unternehmen].
[[CTA: Konkrete Handlungsaufforderung mit Kontakt]]
[[HASHTAGS: 2-3 relevante Hashtags]]`,

  scoreRules: `
SCORE-OPTIMIERUNGS-REGELN (für garantiert hohe Scores):

HEADLINE (20% des Scores):
✓ Länge: 40-75 Zeichen (optimal für SEO)
✓ Aktive Verben nutzen (startet, lanciert, präsentiert)
✓ Keywords früh platzieren
✓ Keine Übertreibungen

KEYWORDS (20% des Scores):
✓ Keyword-Dichte: 0.3-2.5% (flexibel aber präsent)
✓ Keywords in Headline UND Lead
✓ Natürliche Verteilung im Text
✓ Verwandte Begriffe einstreuen

STRUKTUR (20% des Scores):
✓ Lead-Absatz: 80-250 Zeichen
✓ 3-4 Haupt-Absätze: je 150-400 Zeichen
✓ Gute Lesbarkeit mit kurzen Sätzen
✓ Logischer Aufbau

RELEVANZ (15% des Scores):
✓ Keywords kontextuell einbetten
✓ Thematische Kohärenz
✓ Branchenrelevante Begriffe

KONKRETHEIT (10% des Scores):
✓ Mindestens 2 konkrete Zahlen/Statistiken
✓ 1 spezifisches Datum
✓ Firmennamen und Personen nennen
✓ Messbare Ergebnisse

ENGAGEMENT (10% des Scores):
✓ Zitat mit vollständiger Attribution
✓ Call-to-Action mit Kontaktdaten/URL
✓ Aktive, handlungsorientierte Sprache

SOCIAL (5% des Scores):
✓ Headline ≤ 280 Zeichen (Twitter)
✓ 2-3 relevante Hashtags
✓ Teilbare Kernaussagen`,

  exampleOptimizations: `
BEISPIEL-OPTIMIERUNGEN für hohe Scores:

STATT: "Unternehmen stellt neues Produkt vor"
BESSER: "TechCorp lanciert KI-gestützte Analytics-Plattform für KMU" (Keywords, aktiv, konkret)

STATT: "Das ist eine gute Entwicklung"
BESSER: "Wir steigern die Effizienz unserer Kunden um durchschnittlich 35%", sagt Dr. Schmidt, CEO der TechCorp.

STATT: "Weitere Informationen finden Sie online"
BESSER: "[[CTA: Kostenlose Demo vereinbaren unter demo.techcorp.de oder 089-12345678]]"

STATT: Keine Hashtags
BESSER: "[[HASHTAGS: #KIInnovation #B2BSoftware #DigitaleTransformation]]"

STATT: "Viele Kunden nutzen unsere Lösung"
BESSER: "Über 500 Unternehmen mit mehr als 10.000 Nutzern vertrauen seit 2023 auf unsere Plattform"`,

  rules: `
KRITISCHE REGELN:
✓ Headline: 40-75 Zeichen, faktisch, keywords-optimiert
✓ Lead: 80-200 Zeichen, in **Sterne** einschließen, 5 W-Fragen
✓ Body: 3 separate Absätze mit verschiedenen Aspekten
✓ Zitat: In "Anführungszeichen" mit vollständiger Attribution
✓ Call-to-Action: Mit [[CTA: ...]] markieren, konkrete Handlungsaufforderung
✓ Hashtags: 2-3 relevante für die Branche, mit [[HASHTAGS: ...]] markieren
✓ Twitter-optimiert: Headline max. 280 Zeichen für Social Sharing
✓ KEINE Boilerplate/Unternehmensbeschreibung am Ende
✓ Sachlich und objektiv, keine Werbesprache
✓ Perfekte deutsche Rechtschreibung
✓ Konkrete Zahlen und Fakten

VERMEIDE:
- Werbesprache ("revolutionär", "bahnbrechend", "einzigartig")
- Passive Konstruktionen
- Übertreibungen ohne Belege
- Zu lange Sätze (max. 15 Wörter)
- "Über das Unternehmen" Abschnitte`,

  // Tonalitäts-spezifische Anpassungen
  tones: {
    formal: `🔥 TONALITÄT: FORMAL - ÜBERSCHREIBT ALLE ANDEREN REGELN! 🔥

WICHTIG: Schreibe in offizieller, konservativer Geschäftssprache für höchste Seriosität!

ZWINGEND VERWENDEN:
- "Das Unternehmen", "Die Gesellschaft", "Die Organisation"
- "präsentiert", "verkündet", "gibt bekannt", "stellt vor"
- "innovative Lösung", "fortschrittliche Technologie", "bewährte Methodik"
- "optimiert", "implementiert", "realisiert", "etabliert"
- Vollständige Titel und Positionen ("Dr.", "Geschäftsführer", "Vorstandsvorsitzender")
- Längere, strukturierte Sätze (15-20 Wörter erlaubt)
- Fachterminologie angemessen einsetzen
- Distanzierte, objektive Ausdrucksweise

ANREDE-REGELN (SEHR WICHTIG!):
✅ ERLAUBT: "Sie", "Ihnen", "Ihrer" (formelle Anrede 2. Person Plural)
✅ ERLAUBT: Possessivpronomen 3. Person: "ihrer", "seine", "deren" (gehörend zu Firma/Person/KMU)
   Beispiel: "KMU nutzen ihre Daten" → KORREKT (Possessiv 3. Person)
   Beispiel: "Unternehmen optimieren ihre Prozesse" → KORREKT

❌ VERBOTEN: Informelle Anrede 2. Person:
   - "du", "dein", "dir" (informell Singular)
   - "ihr" als direkte Anrede (aber "ihr/ihre" als Possessiv 3. Person ist OK!)
   - "euch" (informell Plural)

REGEL: Nutze NUR "Sie"-Form zur direkten Ansprache. Possessivpronomen 3. Person (ihr/ihre/seinen/deren) sind erlaubt.

BEISPIEL ANREDE RICHTIG:
✅ "Unternehmen automatisieren ihre Prozesse mit der Lösung." (Possessiv 3. Person - OK!)
✅ "Wir unterstützen Sie bei Ihrer digitalen Transformation." (Sie-Form - OK!)

BEISPIEL ANREDE FALSCH:
❌ "Automatisiert eure Prozesse jetzt!" (Anrede 2. Person - VERBOTEN!)
❌ "Ihr könnt damit..." (Anrede 2. Person - VERBOTEN!)

VERBOTEN:
- ❌ Umgangssprache ("cool", "mega", "krass", "easy")
- ❌ Informelle Anrede 2. Person ("du", "dein", "ihr" als Anrede, "euch")
- ❌ Ausrufezeichen (außer bei sehr wichtigen Ankündigungen)
- ❌ Übertriebene Emotionen
- ❌ Verkürzte Sätze ohne Struktur

BEISPIEL FORMAL LEAD:
❌ FALSCH: "Ab Januar gibt's unser neues Tool – das wird mega cool!"
✅ RICHTIG: "**Die Firma XY präsentiert ab Januar 2025 ihre innovative Analytics-Plattform für den deutschen Mittelstand.**"

BEISPIEL FORMAL BODY:
❌ FALSCH: "Das Teil macht eure Arbeit viel einfacher!"
✅ RICHTIG: "Die Lösung optimiert betriebliche Prozesse und steigert die Effizienz nachweislich um durchschnittlich 35 Prozent."

BEISPIEL FORMAL ZITAT:
❌ FALSCH: "Das wird ein Gamechanger!", freut sich der CEO.
✅ RICHTIG: "Diese Entwicklung stellt einen bedeutenden Meilenstein in unserer Unternehmensstrategie dar", erklärt Dr. Schmidt, Vorstandsvorsitzender.

BEISPIEL FORMAL CTA:
❌ FALSCH: [[CTA: Bock drauf? Schreibt uns an!]]
✅ RICHTIG: [[CTA: Für weitere Informationen und Terminvereinbarungen kontaktieren Sie uns unter info@firma.de oder +49 89 12345678]]`,

    casual: `🔥 TONALITÄT: LOCKER/CASUAL - ÜBERSCHREIBT ALLE ANDEREN REGELN! 🔥

WICHTIG: Ignoriere "professionelle Pressemitteilung" aus dem Base-Prompt! Schreibe stattdessen RICHTIG locker und umgangssprachlich!

ZWINGEND VERWENDEN:
- "Na, schon gespannt?" / "Hey Leute!" / "Aufgepasst!" als Einstieg
- "easy", "mega", "cool", "krass", "echt", "Bock auf...?", "checkt das aus"
- "haut raus", "bringt auf den Markt", "gibt's ab sofort"
- "das Ding", "das Teil", "diese Lösung hier"
- "ihr", "euch", "eure" statt "Sie", "Ihnen"
- Ausrufezeichen erlaubt! Emotionen zeigen!
- Umgangssprache wie im Gespräch unter Freunden

VERBOTEN:
- ❌ "lanciert", "präsentiert", "offeriert"
- ❌ "innovative Lösung", "optimiert", "implementiert"
- ❌ Steife Business-Sprache
- ❌ "Sie", "Ihnen" (nur "du/ihr")
- ❌ Lange, verschachtelte Sätze

BEISPIEL CASUAL LEAD:
❌ FALSCH: "Die Firma XY präsentiert ab Januar die innovative Lösung Z."
✅ RICHTIG: "Na, aufgepasst! Ab Januar haut Firma XY ihr neues Ding raus – und das ist echt mega cool!"

BEISPIEL CASUAL BODY:
❌ FALSCH: "Das System optimiert Prozesse erheblich."
✅ RICHTIG: "Das Teil macht eure Arbeit mega viel einfacher!"

BEISPIEL CASUAL ZITAT:
❌ FALSCH: "Dies stellt einen bedeutenden Fortschritt dar", erklärt der CEO.
✅ RICHTIG: "Das wird echt ein Gamechanger für euch sein!", freut sich der CEO.

BEISPIEL CASUAL CTA:
❌ FALSCH: [[CTA: Für weitere Informationen kontaktieren Sie uns unter...]]
✅ RICHTIG: [[CTA: Bock drauf? Schreibt uns einfach an info@firma.de!]]`,

    modern: `🔥 TONALITÄT: MODERN - ÜBERSCHREIBT ALLE ANDEREN REGELN! 🔥

WICHTIG: Schreibe zeitgemäß, innovativ und zugänglich – perfekt für Tech-affine Zielgruppen!

ZWINGEND VERWENDEN:
- Kurze, knackige Sätze (8-12 Wörter ideal)
- "launcht", "startet", "bringt", "revolutioniert", "transformiert"
- Moderne Tech-Begriffe: "KI-gestützt", "cloud-basiert", "smart", "digital", "intelligent"
- "User", "Experience", "Interface", "Platform", "Dashboard", "App"
- Direkte Ansprache möglich ("Sie" oder "ihr" je nach Kontext)
- Dynamische, aktive Verben
- Zahlen und Metriken prominent

ZUKUNFTS-SPRACHE (EXPLIZIT ERLAUBT UND ERWÜNSCHT!):
✅ "Next-Level", "Next Generation", "Zukunft 2025+", "Future-Ready"
✅ "Game-Changer" (sparsam verwenden, aber erlaubt)
✅ "State-of-the-Art", "Cutting-Edge"
✅ "Innovation", "disruptiv" (in moderatem Maß)

WICHTIG: Diese Begriffe sind KEINE Werbesprache sondern zeitgemäßes Tech-Vokabular!

BEISPIEL MODERN MIT ZUKUNFTS-SPRACHE:
❌ FALSCH: "TechCorp stellt neue Lösung vor."
✅ RICHTIG: "**TechCorp launcht Next-Level Analytics-Platform – Future-Ready für 2025.**"
✅ AUCH GUT: "**Game-Changer: TechCorp bringt KI-gestützte Platform für Smart Business.**"

VERBOTEN:
- ❌ Altmodische Begriffe ("etabliert", "bewährt", "traditionell")
- ❌ Lange, verschachtelte Sätze (>15 Wörter)
- ❌ Passive Konstruktionen
- ❌ Verstaubte Floskeln ("freuen uns bekanntzugeben")
- ❌ Umgangssprache wie bei Casual ("mega", "krass", "Ding")

BEISPIEL MODERN LEAD:
❌ FALSCH: "Die Firma XY freut sich, die bewährte Lösung Z vorzustellen."
✅ RICHTIG: "**TechCorp launcht ab Januar 2025 die KI-gestützte Analytics-Platform für Smart Business.**"

BEISPIEL MODERN BODY:
❌ FALSCH: "Das System optimiert die betrieblichen Prozesse durch bewährte Methoden."
✅ RICHTIG: "Die Platform automatisiert Workflows. Steigert Effizienz um 40%. Reduziert manuelle Tasks auf ein Minimum."

BEISPIEL MODERN ZITAT:
❌ FALSCH: "Wir freuen uns über diese bewährte Entwicklung", erklärt der Geschäftsführer.
✅ RICHTIG: "Wir transformieren Business Intelligence – smart, schnell, skalierbar", sagt Sarah Müller, CEO.

BEISPIEL MODERN CTA:
❌ FALSCH: [[CTA: Für weitere Informationen kontaktieren Sie uns telefonisch unter...]]
✅ RICHTIG: [[CTA: Live-Demo jetzt starten: demo.techcorp.io]]`,

    technical: `🔧 TONALITÄT: TECHNISCH - ÜBERSCHREIBT ALLE ANDEREN REGELN! 🔧

WICHTIG: Du schreibst für technische Experten und Entwickler! KEINE Marketing-Sprache!

⚙️ PFLICHT-ELEMENTE (MINDESTENS 3 VON 5 IN LEAD/BODY):
1. **Performance-Daten:** "Latenz <50ms", "99.9% Uptime", "10.000 req/s", "Response Time 5ms"
2. **Architektur-Details:** "Microservices", "REST API", "gRPC", "Kubernetes", "PostgreSQL 15", "Redis Cache"
3. **Versionsnummern:** "v3.0", "API v2.5", "SDK 1.8.2", "TLS 1.3", "HTTP/2"
4. **Metriken & Benchmarks:** "50.000 Transaktionen/Sek", "2TB Durchsatz", "40% schneller als v2.8"
5. **Standards & Protokolle:** "OAuth 2.0", "WebSocket", "gRPC", "JSON API", "OpenAPI 3.0"

ZUSÄTZLICH bei spezifischen Branchen:
- **Automotive:** "kWh", "Reichweite 600km", "Ladezeit 18min", "CCS-Standard", "WLTP"
- **FinTech:** "TLS 1.3 Verschlüsselung", "SEPA-Instant", "PSD2-konform", "AES-256"
- **Tech/Software:** "API-Rate-Limit", "JWT-Tokens", "Container-Orchestrierung"

ZWINGEND IN LEAD ODER BODY:
- Mindestens 2 konkrete technische Specs
- Mindestens 1 Performance-Metrik mit Zahl

BEISPIEL TECHNICAL LEAD (SO MUSS ES SEIN!):
❌ FALSCH: "TechCorp startet neue Cloud-Lösung ab Januar."
✅ RICHTIG: "**TechCorp released v3.0 der Analytics-Platform mit REST API, PostgreSQL 15 Backend und <50ms Query-Latenz.**"

BEISPIEL TECHNICAL BODY (SO MUSS ES SEIN!):
❌ FALSCH: "Das System ist sehr schnell und skalierbar."
✅ RICHTIG: "Die Microservices-Architektur ermöglicht horizontale Skalierung auf 10.000+ parallele Requests. Kubernetes-Orchestrierung garantiert 99.95% Uptime. PostgreSQL 15 Backend verarbeitet 50.000 Transaktionen/Sekunde bei durchschnittlich 35ms Latenz. Redis Cache reduziert Datenbankzugriffe um 80%. REST API v3 unterstützt OAuth 2.0 und liefert JSON-Responses mit <5ms."

BEISPIEL TECHNICAL ZITAT (SO MUSS ES SEIN!):
❌ FALSCH: "Das wird den Markt revolutionieren!", freut sich der CEO.
✅ RICHTIG: "Mit der neuen gRPC-Implementierung reduzieren wir die Netzwerk-Latenz um 60% verglichen mit v2.8. Kubernetes Auto-Scaling ermöglicht uns 10.000+ concurrent connections", erklärt Dr. Schmidt, CTO.

BEISPIEL TECHNICAL CTA (SO MUSS ES SEIN!):
❌ FALSCH: [[CTA: Schau dir das unbedingt an unter unserer Website!]]
✅ RICHTIG: [[CTA: API-Dokumentation: docs.techcorp.dev/api/v3 | SDK Download: github.com/techcorp/sdk | OpenAPI Spec: api.techcorp.dev/openapi.json]]

VERBOTEN:
- ❌ Marketing-Sprache ohne Fakten ("revolutionär", "bahnbrechend", "game-changing")
- ❌ Unspezifische Aussagen ("sehr schnell", "ziemlich gut", "hochperformant")
- ❌ Emotionale Sprache oder Ausrufezeichen
- ❌ Vereinfachungen für Laien

💾 OHNE KONKRETE SPECS (Zahlen, Versionen, Architekturen) IST DER TEXT FALSCH! 💾

BEISPIEL TECHNICAL LEAD:
❌ FALSCH: "Firma XY bringt eine mega innovative Cloud-Lösung raus!"
✅ RICHTIG: "**TechCorp released v3.0 der Analytics-Platform mit REST API, PostgreSQL 15 Backend und <50ms Query-Latenz.**"

BEISPIEL TECHNICAL BODY:
❌ FALSCH: "Das System ist sehr schnell und macht vieles einfacher."
✅ RICHTIG: "Die Microservices-Architektur ermöglicht horizontal Skalierung auf 10.000+ parallele Requests. Kubernetes-Orchestrierung garantiert 99.95% Uptime. Das PostgreSQL 15 Backend verarbeitet 50.000 Transaktionen/Sekunde bei durchschnittlich 35ms Latenz."

BEISPIEL TECHNICAL ZITAT:
❌ FALSCH: "Das wird den Markt revolutionieren!", freut sich der CEO.
✅ RICHTIG: "Mit der neuen gRPC-Implementierung reduzieren wir die Netzwerk-Latenz um 60% verglichen mit v2.8", erklärt Dr. Schmidt, CTO.

BEISPIEL TECHNICAL CTA:
❌ FALSCH: [[CTA: Schau dir das unbedingt an unter unserer Website!]]
✅ RICHTIG: [[CTA: API-Dokumentation und SDK Download: docs.techcorp.dev/api/v3 | GitHub: github.com/techcorp/analytics-sdk]]`,

    startup: `🚨 STARTUP-TON - ÜBERSCHREIBT ALLE ANDEREN REGELN! 🚨

Du schreibst NICHT für etablierte Unternehmen. Du schreibst für STARTUPS und INVESTOREN!

⚡ PFLICHT-ELEMENTE (MINDESTENS 4 VON 6 IN LEAD/BODY):
1. **Growth-Metrik:** "300% YoY Growth", "10x Wachstum in 6 Monaten", "ARR von €500K auf €3M"
2. **Funding:** "raised €8M Series A led by Sequoia", "€5M Seed-Runde abgeschlossen", "Backed by Y Combinator"
3. **User-Zahlen:** "50.000 User in 6 Monaten", "10K+ Beta-Signups", "5.000 zahlende Kunden"
4. **Traction:** "Product-Market-Fit erreicht Q2 2024", "MRR €100K", "Break-even in Q4"
5. **Action-Verben:** "skaliert", "disrupted", "expandiert", "wächst um X%", "launcht"
6. **Vision/Mission:** "Mission: X für 1M User demokratisieren", "Vision: Next Unicorn 2027"

ZWINGEND IN HEADLINE ODER LEAD:
- Mindestens 1 Growth-Zahl ("300% YoY", "50.000 User", "€5M raised")
- Mindestens 1 Action-Verb ("skaliert", "raised", "expandiert")

BEISPIEL STARTUP LEAD (SO MUSS ES SEIN!):
❌ FALSCH: "TechVision lanciert DataSense Pro ab Januar 2025."
✅ RICHTIG: "**TechVision raised €5M Series A für DataSense Pro – skaliert auf 50.000 User in 6 Monaten mit 400% YoY Growth.**"

BEISPIEL STARTUP BODY (SO MUSS ES SEIN!):
❌ FALSCH: "Die Plattform wurde entwickelt um KMU zu unterstützen."
✅ RICHTIG: "TechVision erreichte Product-Market-Fit im Q3 2024. Wuchs von 1.000 auf 50.000 aktive User in nur 6 Monaten. ARR stieg von €500K auf €3M. Series-A-Funding von €5M led by Index Ventures sichert aggressive Europa-Expansion 2025. Target: 200.000 User bis Q4 2025."

BEISPIEL STARTUP ZITAT (SO MUSS ES SEIN!):
❌ FALSCH: "Wir freuen uns über diese Entwicklung."
✅ RICHTIG: "Unsere Mission: Datenanalyse für 1 Million KMUs demokratisieren. Mit €5M Series-A-Funding skalieren wir jetzt europaweit – Target: 200.000 User bis Q4 2025", sagt Anna Weber, Co-Founder & CEO.

BEISPIEL STARTUP CTA (SO MUSS ES SEIN!):
❌ FALSCH: [[CTA: Für weitere Informationen kontaktieren Sie uns.]]
✅ RICHTIG: [[CTA: Join waitlist (10K+ bereits registriert): startup.io/join | Investors: pitch@startup.io]]

VERBOTEN:
- ❌ "etabliert", "bewährt", "langjährige Erfahrung", "traditionell"
- ❌ Vorsichtige Sprache ("möglicherweise", "plant", "erwägt", "eventuell")
- ❌ Texte OHNE konkrete Zahlen und Metriken
- ❌ Passive Konstruktionen
- ❌ Langweilige Corporate-Sprache

💥 WENN DU DIESE REGELN IGNORIERST, IST DER OUTPUT FALSCH! 💥
💥 OHNE GROWTH-ZAHLEN UND FUNDING-INFO IST ES KEIN STARTUP-TON! 💥

BEISPIEL STARTUP LEAD:
❌ FALSCH: "Die Firma XY präsentiert eine neue Software-Lösung."
✅ RICHTIG: "**FinTech-Startup PayFast raised €8M Series A, skaliert auf 50.000 User in 6 Monaten – 400% YoY Growth.**"

BEISPIEL STARTUP BODY:
❌ FALSCH: "Das Unternehmen wächst stetig und gewinnt Kunden."
✅ RICHTIG: "PayFast erreichte Product-Market-Fit im Q2 2024. Wuchs von 1.000 auf 50.000 aktive User in nur 6 Monaten. ARR stieg von €500K auf €3M. Series-A-Funding von €8M led by Sequoia Capital sichert aggressive Europa-Expansion für 2025."

BEISPIEL STARTUP ZITAT:
❌ FALSCH: "Wir freuen uns über diese Entwicklung", sagt der Geschäftsführer.
✅ RICHTIG: "Unsere Mission: Banking für 10 Millionen Freelancer demokratisieren. Mit €8M Funding skalieren wir jetzt europaweit", sagt Max Bauer, Co-Founder & CEO.

BEISPIEL STARTUP CTA:
❌ FALSCH: [[CTA: Für weitere Informationen besuchen Sie unsere Website.]]
✅ RICHTIG: [[CTA: Join waitlist (10K+ already signed up): payfast.io/join | Investors: pitch@payfast.io]]

HASHTAGS ZWINGEND:
#Startup #Funding #SeriesA #TechNews #ScaleUp #Growth #Innovation #SaaS #Disruption`
  },

  // Zielgruppen-spezifische Anpassungen
  audiences: {
    b2b: `ZIELGRUPPE: B2B - SCORE-OPTIMIERT
✓ Zahlen/ROI prominent (erhöht Konkretheit-Score)
✓ Fachbegriffe moderat (erhöht Relevanz-Score)
✓ LinkedIn-optimierte Länge (erhöht Social-Score)
✓ Entscheider-Zitate (erhöht Engagement-Score)
Fokus: ROI, Effizienz, Kostenersparnisse, Benchmarks
Hashtags: #B2B #Business #Innovation #ROI #Effizienz #Digitalisierung`,
    consumer: `ZIELGRUPPE: CONSUMER - SCORE-OPTIMIERT
✓ Einfache Sprache (erhöht Struktur-Score)
✓ Nutzen prominent (erhöht Relevanz-Score)
✓ Lifestyle-Hashtags (erhöht Social-Score)
✓ Emotionales Zitat (erhöht Engagement-Score)
Fokus: Nutzen, einfache Sprache, Lifestyle, Verfügbarkeit
Hashtags: #Neu #Lifestyle #Innovation #Einfach #Praktisch #Nachhaltigkeit`,
    media: `ZIELGRUPPE: MEDIEN/JOURNALISTEN
Nachrichtenwert betonen, klare Story, zitierfähige Aussagen, Hintergrundinformationen, Kontaktdaten prominent
Hashtags: #Pressemitteilung #News #Medien #Aktuell #Newsroom`
  },

  // Industrie-spezifische Score-optimierte Prompts
  industries: {
    technology: `INDUSTRIE: TECHNOLOGIE - SCORE-OPTIMIERT
✓ Tech-Keywords (erhöht Relevanz-Score)
✓ Versionsnummern/Specs (erhöht Konkretheit-Score)
✓ Developer-Hashtags (erhöht Social-Score)
✓ CTO/Engineer-Zitate (erhöht Engagement-Score)
Fokus: Innovation, Effizienz, Skalierung, Performance-Metriken, API/Cloud
Hashtags: #TechNews #Innovation #Software #KI #Cloud #Digitalisierung`,
    healthcare: `INDUSTRIE: GESUNDHEITSWESEN - SCORE-OPTIMIERT
✓ Patientensicherheit (erhöht Relevanz-Score)
✓ Studien/Erfolgsraten (erhöht Konkretheit-Score)
✓ Medical-Hashtags (erhöht Social-Score)
✓ Arzt/Experten-Zitate (erhöht Engagement-Score)
Fokus: Patientenwohl, Evidenz, Compliance, Zertifizierungen
Hashtags: #Gesundheit #Medizin #Innovation #Therapie #Forschung #Patientenwohl`,
    finance: `INDUSTRIE: FINANZWESEN - SCORE-OPTIMIERT
✓ Compliance/Sicherheit (erhöht Relevanz-Score)
✓ ROI/Performance-Zahlen (erhöht Konkretheit-Score)
✓ FinTech-Hashtags (erhöht Social-Score)
✓ CFO/Analyst-Zitate (erhöht Engagement-Score)
Fokus: Sicherheit, Compliance, ROI, Risikomanagement
Hashtags: #FinTech #Banking #Investment #Compliance #Digitalisierung #Sicherheit`,
    manufacturing: `INDUSTRIE: PRODUKTION/FERTIGUNG - SCORE-OPTIMIERT
✓ Effizienz/Nachhaltigkeit (erhöht Relevanz-Score)
✓ Produktionszahlen/KPIs (erhöht Konkretheit-Score)
✓ Industry4.0-Hashtags (erhöht Social-Score)
✓ Operations-Manager-Zitate (erhöht Engagement-Score)
Fokus: Effizienz, Nachhaltigkeit, Automatisierung, CO2-Reduktion
Hashtags: #Produktion #Industrie40 #Nachhaltigkeit #Effizienz #Innovation #Fertigung`,
    retail: `INDUSTRIE: EINZELHANDEL - SCORE-OPTIMIERT
✓ Kundenerlebnis (erhöht Relevanz-Score)
✓ Umsatz/Conversion-Zahlen (erhöht Konkretheit-Score)
✓ Commerce-Hashtags (erhöht Social-Score)
✓ Kunden/CEO-Zitate (erhöht Engagement-Score)
Fokus: Kundenerlebnis, Omnichannel, Personalisierung
Hashtags: #Retail #Ecommerce #Shopping #Kundenerlebnis #Omnichannel #Digital`,
    automotive: `INDUSTRIE: AUTOMOTIVE - SCORE-OPTIMIERT
✓ Nachhaltigkeit/E-Mobilität (erhöht Relevanz-Score)
✓ Verbrauch/Performance-Werte (erhöht Konkretheit-Score)
✓ Auto-Tech-Hashtags (erhöht Social-Score)
✓ Ingenieur/CEO-Zitate (erhöht Engagement-Score)
Fokus: Nachhaltigkeit, Performance, Sicherheit, Connectivity
Hashtags: #Automotive #EMobilität #Innovation #Nachhaltigkeit #AutoTech #Zukunft`,
    education: `INDUSTRIE: BILDUNG - SCORE-OPTIMIERT
✓ Lernfortschritt-Kennzahlen (erhöht Konkretheit-Score)
✓ Pädagogik-Relevanz (erhöht Relevanz-Score)
✓ EdTech-Hashtags (erhöht Social-Score)
✓ Lehrer/Direktor-Zitate (erhöht Engagement-Score)
Fokus: Lernerfolg, Zugänglichkeit, Digitale Transformation, Inklusion
Hashtags: #Bildung #EdTech #Lernen #Innovation #Digital #Zukunft`
  }
};

const FINAL_CHECK = `
FINALER SCORE-CHECK vor Ausgabe:
□ Headline: 40-75 Zeichen mit Keywords? ✓
□ Lead: 80-200 Zeichen mit W-Fragen? ✓
□ Keywords: In Headline + Lead + verteilt? ✓
□ Zahlen: Mindestens 2 konkrete Werte? ✓
□ Datum: Spezifisch genannt? ✓
□ Zitat: Mit voller Attribution? ✓
□ CTA: Konkret mit Kontakt? ✓
□ Hashtags: 2-3 relevant? ✓
□ Twitter: Headline ≤ 280 Zeichen? ✓

Wenn alle Checks ✓ → Text erreicht 85-95% Score!`;

// ══════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ══════════════════════════════════════════════════════════════

function buildSystemPrompt(context?: GeneratePressReleaseStructuredInput['context']): string {
  let systemPrompt = '';

  // QUICK WIN: Ton-Prompt ZUERST für maximale Priorität
  // LLMs priorisieren frühere Instruktionen - Ton muss Base-Regeln dominieren
  if (context?.tone && SYSTEM_PROMPTS.tones[context.tone as keyof typeof SYSTEM_PROMPTS.tones]) {
    systemPrompt += SYSTEM_PROMPTS.tones[context.tone as keyof typeof SYSTEM_PROMPTS.tones];
    systemPrompt += '\n\n';
  }

  // Base-Prompt kommt NACH Ton
  systemPrompt += SYSTEM_PROMPTS.base;
  systemPrompt += '\n' + SYSTEM_PROMPTS.scoreRules;
  systemPrompt += '\n' + SYSTEM_PROMPTS.exampleOptimizations;
  systemPrompt += '\n' + SYSTEM_PROMPTS.rules;

  // Zielgruppe
  if (context?.audience && SYSTEM_PROMPTS.audiences[context.audience as keyof typeof SYSTEM_PROMPTS.audiences]) {
    systemPrompt += '\n' + SYSTEM_PROMPTS.audiences[context.audience as keyof typeof SYSTEM_PROMPTS.audiences];
  }

  // Industrie
  if (context?.industry && SYSTEM_PROMPTS.industries[context.industry as keyof typeof SYSTEM_PROMPTS.industries]) {
    systemPrompt += '\n' + SYSTEM_PROMPTS.industries[context.industry as keyof typeof SYSTEM_PROMPTS.industries];
  }

  systemPrompt += '\n' + FINAL_CHECK;
  systemPrompt += '\n\nAntworte AUSSCHLIESSLICH mit der strukturierten Pressemitteilung.';

  return systemPrompt;
}

// ══════════════════════════════════════════════════════════════
// PARSING LOGIC - Strukturierter Output
// ══════════════════════════════════════════════════════════════

function parseStructuredOutput(text: string): Omit<StructuredPressRelease, 'htmlContent'> {
  const lines = text.split('\n');

  let headline = '';
  let leadParagraph = '';
  let bodyParagraphs: string[] = [];
  let quote: Quote = { text: '', person: '', role: '', company: '' };
  let cta = '';
  let hashtags: string[] = [];

  let currentSection = 'searching';
  let bodyCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. Headline
    if (!headline && currentSection === 'searching') {
      headline = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
      currentSection = 'lead';
      continue;
    }

    // 2. Lead-Absatz
    if (!leadParagraph && currentSection === 'lead') {
      if (line.startsWith('**') && line.endsWith('**')) {
        leadParagraph = line.substring(2, line.length - 2);
        currentSection = 'body';
        continue;
      }

      const hasWQuestions =
        (line.includes('Wer') || line.includes('Was') || line.includes('Wann') ||
         line.includes('Wo') || line.includes('Warum')) ||
        (line.length > 100 && line.length < 400);

      if (hasWQuestions) {
        leadParagraph = line;
        currentSection = 'body';
        continue;
      }

      currentSection = 'body';
    }

    // 3. Zitat - MEHRERE FORMATE UNTERSTÜTZEN
    if (line.startsWith('"') || line.includes('sagt:') || line.includes('sagt "')) {
      currentSection = 'quote';

      // Format 1: "Text", sagt Person, Rolle bei Firma.
      const quoteMatch1 = line.match(/"([^"]+)"[,\s]*sagt\s+([^,]+?)(?:,\s*([^,]+?))?(?:\s+bei\s+([^.]+))?\.?$/);
      if (quoteMatch1) {
        quote = {
          text: quoteMatch1[1],
          person: quoteMatch1[2].trim(),
          role: quoteMatch1[3] ? quoteMatch1[3].trim() : 'Sprecher',
          company: quoteMatch1[4] ? quoteMatch1[4].trim() : ''
        };
        currentSection = 'cta';
        continue;
      }

      // Format 2: Rolle Person sagt: "Text"
      const quoteMatch2 = line.match(/([A-ZÄÖÜ][a-zäöüß]+)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)\s+sagt:\s*"([^"]+)"/);
      if (quoteMatch2) {
        quote = {
          text: quoteMatch2[3],
          person: quoteMatch2[2].trim(),
          role: quoteMatch2[1].trim(),
          company: ''
        };
        currentSection = 'cta';
        continue;
      }

      // Format 3: "Text" mit Person in nächster Zeile
      const simpleMatch = line.match(/"([^"]+)"/);
      if (simpleMatch) {
        quote.text = simpleMatch[1];
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const personMatch = nextLine.match(/[-–—]\s*(.+)/);
          if (personMatch) {
            const parts = personMatch[1].split(',').map(p => p.trim());
            quote.person = parts[0] || 'Sprecher';
            quote.role = parts[1] || 'Geschäftsführer';
            quote.company = parts[2] || '';
            i++;
          }
        }
      }
      currentSection = 'cta';
      continue;
    }

    // 4. Hashtags
    if (line.includes('[[HASHTAGS:') || line.includes('HASHTAGS:')) {
      const hashtagMatch = line.match(/\[\[HASHTAGS?:?\s*([^\]]+)\]\]/i);
      if (hashtagMatch) {
        const hashtagString = hashtagMatch[1];
        const foundTags = hashtagString.match(/#[a-zA-ZäöüÄÖÜß0-9_]+/g);
        if (foundTags && foundTags.length > 0) {
          hashtags = foundTags.slice(0, 3);
        }
      }
      continue;
    }

    // 5. CTA
    if (line.includes('[[CTA:') || line.includes('CTA:') ||
        line.includes('Kontakt:') || line.includes('Weitere Informationen:') ||
        currentSection === 'cta') {
      const ctaMatch = line.match(/\[\[CTA:\s*(.+?)\]\]/) ||
                       line.match(/CTA:\s*(.+)/) ||
                       line.match(/Kontakt:\s*(.+)/) ||
                       line.match(/Weitere Informationen:\s*(.+)/);
      if (ctaMatch) {
        cta = ctaMatch[1].trim();
      } else if (currentSection === 'cta') {
        cta = line;
      }
      continue;
    }

    // 6. Body-Absätze
    if (currentSection === 'body' && bodyCount < 4) {
      if (line.startsWith('"') || line.startsWith('*')) {
        continue;
      }
      bodyParagraphs.push(line);
      bodyCount++;
    }
  }

  // Fallback: Hashtags aus Text extrahieren
  if (hashtags.length === 0) {
    for (const line of lines) {
      if (line.includes('#')) {
        const foundTags = line.match(/#[a-zA-ZäöüÄÖÜß0-9_]+/g);
        if (foundTags && foundTags.length >= 2) {
          hashtags = foundTags.slice(0, 3);
          break;
        }
      }
    }
  }

  // Standardisiere Hashtags
  hashtags = hashtags.map(tag =>
    tag.startsWith('#') ? tag : '#' + tag
  ).slice(0, 3);

  // Defaults
  if (hashtags.length === 0) {
    hashtags = ['#Pressemitteilung', '#News'];
  }

  if (!leadParagraph && bodyParagraphs.length > 0) {
    leadParagraph = bodyParagraphs[0];
    bodyParagraphs = bodyParagraphs.slice(1);
  }

  if (!headline) headline = 'Pressemitteilung';
  if (!leadParagraph) leadParagraph = 'Lead-Absatz fehlt';
  if (bodyParagraphs.length === 0) bodyParagraphs = ['Haupttext der Pressemitteilung'];
  // Fallback: Zitat aus Body-Paragraphen extrahieren
  if (!quote.text) {
    for (let i = 0; i < bodyParagraphs.length; i++) {
      const paragraph = bodyParagraphs[i];

      // Suche nach Zitat im Paragraph
      const quoteMatch = paragraph.match(/"([^"]+)"[,\s]*sagt\s+([^,]+?)(?:,\s*([^,]+?))?(?:\s+(?:von|bei)\s+([^.]+))?\.?$/);
      if (quoteMatch) {
        quote = {
          text: quoteMatch[1],
          person: quoteMatch[2].trim(),
          role: quoteMatch[3] ? quoteMatch[3].trim() : 'Sprecher',
          company: quoteMatch[4] ? quoteMatch[4].trim() : ''
        };
        // Entferne den Paragraph mit dem Zitat aus den Body-Paragraphen
        bodyParagraphs.splice(i, 1);
        break;
      }

      // Alternative: Suche nach „..." (deutsche Anführungszeichen)
      const germanQuoteMatch = paragraph.match(/„([^"]+)"[,\s]*sagt\s+([^,]+?)(?:,\s*([^,]+?))?(?:\s+(?:von|bei|der)\s+([^.]+))?\.?$/);
      if (germanQuoteMatch) {
        quote = {
          text: germanQuoteMatch[1],
          person: germanQuoteMatch[2].trim(),
          role: germanQuoteMatch[3] ? germanQuoteMatch[3].trim() : 'Sprecher',
          company: germanQuoteMatch[4] ? germanQuoteMatch[4].trim() : ''
        };
        // Entferne den Paragraph mit dem Zitat aus den Body-Paragraphen
        bodyParagraphs.splice(i, 1);
        break;
      }
    }
  }

  // Letzter Fallback: Generisches Zitat
  if (!quote.text) {
    quote = {
      text: 'Wir freuen uns über diese Entwicklung',
      person: 'Sprecher',
      role: 'Geschäftsführer',
      company: 'Unternehmen'
    };
  }
  if (!cta) {
    cta = 'Für weitere Informationen kontaktieren Sie uns unter info@example.com';
  }

  const socialOptimized = headline.length <= 280 && hashtags.length >= 2;

  return {
    headline,
    leadParagraph,
    bodyParagraphs,
    quote,
    cta,
    hashtags,
    socialOptimized
  };
}

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW
// ══════════════════════════════════════════════════════════════

/**
 * Genkit Flow: Strukturierte Pressemitteilungs-Generierung mit PR-SEO Score Optimierung
 *
 * Features:
 * - Strukturierter Output (headline, lead, body, quote, cta, hashtags)
 * - PR-SEO Score Optimierung (85-95% Ziel)
 * - Dokumenten-Kontext Support (bis zu 3 Dokumente)
 * - Industrie/Tonalität/Zielgruppen-spezifische Prompts
 * - Umfangreiche Prompt Library (700+ Zeilen)
 * - Automatische HTML-Generierung
 */
export const generatePressReleaseStructuredFlow = ai.defineFlow(
  {
    name: 'generatePressReleaseStructured',
    inputSchema: GeneratePressReleaseStructuredInputSchema,
    outputSchema: StructuredPressReleaseSchema
  },
  async (input: GeneratePressReleaseStructuredInput): Promise<StructuredPressRelease> => {

    console.log('🚀 Strukturierte PR-Generierung gestartet', {
      hasDocuments: !!input.documentContext?.documents?.length,
      documentCount: input.documentContext?.documents?.length || 0,
      industry: input.context?.industry,
      tone: input.context?.tone,
      audience: input.context?.audience
    });

    // ══════════════════════════════════════════════════════════════
    // 1. VALIDIERUNG Dokumenten-Kontext
    // ══════════════════════════════════════════════════════════════

    if (input.documentContext?.documents) {
      if (input.documentContext.documents.length > 3) {
        throw new Error('Maximal 3 Dokumente erlaubt');
      }

      const totalSize = input.documentContext.documents.reduce(
        (sum, doc) => sum + doc.plainText.length,
        0
      );

      if (totalSize > 15000) {
        throw new Error('Dokumente-Kontext zu groß (max. 15000 Zeichen)');
      }
    }

    // ══════════════════════════════════════════════════════════════
    // 2. PROMPT BUILDING
    // ══════════════════════════════════════════════════════════════

    const systemPrompt = buildSystemPrompt(input.context);

    // Kontext-Info
    let contextInfo = '';
    if (input.context?.industry) {
      contextInfo += `\nBRANCHE: ${input.context.industry}`;
    }
    if (input.context?.companyName) {
      contextInfo += `\nUNTERNEHMEN: ${input.context.companyName}`;
    }

    // Enhanced Prompt mit Dokumenten-Kontext
    let enhancedPrompt = input.prompt;

    if (input.documentContext?.documents && input.documentContext.documents.length > 0) {
      const documentsContext = input.documentContext.documents.map(doc => `
--- ${doc.fileName} ---
${doc.plainText.substring(0, 2000)}${doc.plainText.length > 2000 ? '...' : ''}
      `).join('\n\n');

      enhancedPrompt = `
PLANUNGSDOKUMENTE ALS KONTEXT:

${documentsContext}

---

AUFGABE:
${input.prompt}

ANWEISUNG:
Nutze die Informationen aus den Planungsdokumenten oben, um eine zielgruppengerechte
und strategisch passende Pressemitteilung zu erstellen. Beachte dabei:
- Die definierten Zielgruppen
- Die Key Messages/Kernbotschaften
- Das Alleinstellungsmerkmal (USP)
- Den Ton und Stil aus den Dokumenten

Erstelle eine professionelle Pressemitteilung nach journalistischen Standards.
      `.trim();
    }

    const userPrompt = `Erstelle eine professionelle Pressemitteilung für: ${enhancedPrompt}${contextInfo}`;

    // ══════════════════════════════════════════════════════════════
    // 3. AI GENERIERUNG MIT GEMINI 2.5 FLASH
    // ══════════════════════════════════════════════════════════════

    const result = await ai.generate({
      model: gemini25FlashModel,
      prompt: [
        { text: systemPrompt },
        { text: userPrompt }
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      }
    });

    // ══════════════════════════════════════════════════════════════
    // 4. TEXT EXTRAKTION
    // ══════════════════════════════════════════════════════════════

    const generatedText = result.message?.content?.[0]?.text || result.text;

    if (!generatedText || generatedText.trim() === '') {
      throw new Error('Keine Antwort von Gemini erhalten');
    }

    console.log('✅ Text generiert, starte Parsing...');

    // ══════════════════════════════════════════════════════════════
    // 5. STRUKTURIERTES PARSING
    // ══════════════════════════════════════════════════════════════

    const structured = parseStructuredOutput(generatedText);

    // ══════════════════════════════════════════════════════════════
    // 6. HTML-GENERIERUNG
    // ══════════════════════════════════════════════════════════════

    // Hashtags als TipTap-kompatible spans (data-type="hashtag")
    const hashtagsHTML = structured.hashtags && structured.hashtags.length > 0
      ? `<p>${structured.hashtags.map(tag =>
          `<span data-type="hashtag" class="hashtag text-blue-600 font-semibold cursor-pointer hover:text-blue-800 transition-colors duration-200">${tag}</span>`
        ).join(' ')}</p>`
      : '';

    const htmlContent = `
<p><strong>${structured.leadParagraph}</strong></p>

${structured.bodyParagraphs.map(p => `<p>${p}</p>`).join('\n\n')}

<blockquote>
  <p>"${structured.quote.text}"</p>
  <footer>— <strong>${structured.quote.person}</strong>, ${structured.quote.role}${structured.quote.company ? ` bei ${structured.quote.company}` : ''}</footer>
</blockquote>

<p><span data-type="cta-text" class="cta-text font-bold text-black">${structured.cta}</span></p>

${hashtagsHTML}
`.trim();

    console.log('✅ Strukturierte PR erfolgreich generiert!', {
      headline: structured.headline.substring(0, 50) + '...',
      bodyParagraphs: structured.bodyParagraphs.length,
      hashtags: structured.hashtags.length,
      socialOptimized: structured.socialOptimized
    });

    // ══════════════════════════════════════════════════════════════
    // 7. RÜCKGABE
    // ══════════════════════════════════════════════════════════════

    return {
      ...structured,
      htmlContent
    };
  }
);
