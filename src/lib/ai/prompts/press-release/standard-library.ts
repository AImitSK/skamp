// src/lib/ai/prompts/press-release/standard-library.ts
// STANDARD LIBRARY: Generische Prompts für User OHNE DNA-Strategie

/**
 * STANDARD LIBRARY
 *
 * Generische Prompts für User OHNE DNA-Strategie.
 * Wird geladen wenn: if (!dnaSynthese) { loadStandardLibrary(); }
 *
 * KRITISCH: Diese detaillierten Prompts mit Beispielen MÜSSEN 1:1 aus der
 * aktuellen Implementierung übernommen werden!
 */
export const STANDARD_LIBRARY = {
  /**
   * TONALITÄTS-PROMPTS
   * KRITISCH: Diese detaillierten Prompts mit Beispielen MÜSSEN erhalten bleiben!
   * Sie überschreiben die Base-Regeln für den jeweiligen Ton.
   *
   * Quelle: SYSTEM_PROMPTS.tones in generate-press-release-structured.ts
   */
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
✅ RICHTIG: [[CTA: Für weitere Informationen und Terminvereinbarungen kontaktieren Sie uns unter info@firma.de oder +49 89 12345678]]
    `,

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
✅ RICHTIG: "**Na, aufgepasst! Ab Januar haut Firma XY ihr neues Ding raus – und das ist echt mega cool!**"

BEISPIEL CASUAL BODY:
❌ FALSCH: "Das System optimiert Prozesse erheblich."
✅ RICHTIG: "Das Teil macht eure Arbeit mega viel einfacher!"

BEISPIEL CASUAL ZITAT:
❌ FALSCH: "Dies stellt einen bedeutenden Fortschritt dar", erklärt der CEO.
✅ RICHTIG: "Das wird echt ein Gamechanger für euch sein!", freut sich der CEO.

BEISPIEL CASUAL CTA:
❌ FALSCH: [[CTA: Für weitere Informationen kontaktieren Sie uns unter...]]
✅ RICHTIG: [[CTA: Bock drauf? Schreibt uns einfach an info@firma.de!]]
    `,

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
✅ RICHTIG: [[CTA: Live-Demo jetzt starten: demo.techcorp.io]]
    `,

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
    `,

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

HASHTAGS ZWINGEND:
#Startup #Funding #SeriesA #TechNews #ScaleUp #Growth #Innovation #SaaS #Disruption
    `
  },

  /**
   * INDUSTRIE-PROMPTS (Score-optimiert)
   * Quelle: SYSTEM_PROMPTS.industries in generate-press-release-structured.ts
   */
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
  },

  /**
   * ZIELGRUPPEN-PROMPTS (Score-optimiert)
   * Quelle: SYSTEM_PROMPTS.audiences in generate-press-release-structured.ts
   */
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
✓ Nachrichtenwert betonen
✓ Klare Story
✓ Zitierfähige Aussagen
✓ Hintergrundinformationen
✓ Kontaktdaten prominent
Hashtags: #Pressemitteilung #News #Medien #Aktuell #Newsroom`
  },

  /**
   * Getter für selektives Laden
   */
  getTone(tone: string): string {
    return this.tones[tone as keyof typeof this.tones] || '';
  },

  getIndustry(industry: string): string {
    return this.industries[industry as keyof typeof this.industries] || '';
  },

  getAudience(audience: string): string {
    return this.audiences[audience as keyof typeof this.audiences] || '';
  }
};
