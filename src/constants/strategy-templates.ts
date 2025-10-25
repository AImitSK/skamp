// src/constants/strategy-templates.ts
export type TemplateType = 'blank' | 'table' | 'company-profile' | 'situation-analysis' | 'audience-analysis' | 'core-messages';

export interface StrategyTemplate {
  title: string;
  description: string;
  content: string;
}

export const STRATEGY_TEMPLATES: Record<TemplateType, StrategyTemplate> = {
  'blank': {
    title: 'Neues Dokument erstellen',
    description: 'Beginnen Sie mit einem leeren Blatt für Ihre Notizen und Ideen.',
    content: ''
  },
  'table': {
    title: 'Leere Tabelle erstellen',
    description: 'Strukturieren Sie Ihre Daten in einer einfachen Tabelle.',
    content: `# Neue Tabelle

| Spalte 1 | Spalte 2 | Spalte 3 |
|----------|----------|----------|
|          |          |          |
|          |          |          |
|          |          |          |`
  },
  'company-profile': {
    title: 'Unternehmensprofil & Senderanalyse',
    description: 'Erfassen Sie die Kernfakten des Absenders, die als Grundlage für die gesamte Kommunikation dienen.',
    content: `<h1>Unternehmensprofil & Senderanalyse</h1>

<h2>I. Das Unternehmen (Wer sind wir?)</h2>

<h3>1. Hard Facts</h3>
<ul>
<li><strong>Name des Unternehmens:</strong> [Muster GmbH / Tech-Solutions S.A.]</li>
<li><strong>Gründungsjahr:</strong> [JJJJ]</li>
<li><strong>Standort:</strong> [Hauptsitz, z.B. Berlin, Deutschland / Internationaler Standort]</li>
<li><strong>Mitarbeiterzahl:</strong> [50-100 Mitarbeiter]</li>
<li><strong>Kernkompetenz:</strong> [Entwicklung von KI-gestützter Logistik-Software]</li>
<li><strong>Umsatz/Wachstum (optional):</strong> [Jährliches Wachstum von 20 %]</li>
</ul>

<h3>2. Unternehmensphilosophie & Mission</h3>
<ul>
<li><strong>Mission Statement:</strong> [Z.B. "Wir machen globale Lieferketten effizienter und nachhaltiger."]</li>
<li><strong>Vision:</strong> [Z.B. Marktführer in Europa für CO2-neutrale Transportlösungen zu werden.]</li>
<li><strong>Werte:</strong> [Z.B. <em>Nachhaltigkeit</em>, <strong>Innovation</strong>, Transparenz]</li>
</ul>

<h2>II. Senderanalyse (Was macht uns einzigartig?)</h2>

<h3>3. USP (Unique Selling Proposition)</h3>
<ul>
<li><strong>Das "Was":</strong> [Unsere Software reduziert die Leerfahrten von LKW um durchschnittlich 50 %.]</li>
<li><strong>Der Beweis:</strong> [Unabhängiges Gutachten von TU Berlin bestätigt 50 % Einsparung von Treibstoff und Emissionen.]</li>
<li><strong>Zielmarkt-Positionierung:</strong> [Wir sind die <em>einzige</em> Lösung am Markt, die Echtzeit-Routenoptimierung mit umfassendem ESG-Reporting kombiniert.]</li>
</ul>

<h3>4. Bisherige Kommunikation & Haltung</h3>
<ul>
<li><strong>Bisherige Kommunikationsformate:</strong> [Z.B. Hauptsächlich Social Media, Fachartikel, keine offiziellen Pressemitteilungen.]</li>
<li><strong>Wahrgenommene Haltung (Sender-Image):</strong> [Wird von der Branche als jung, dynamisch, aber noch klein wahrgenommen.]</li>
<li><strong>Gewünschte Haltung (Zukunft):</strong> [Soll als <strong>vertrauenswürdig</strong>, marktführend und technisch überlegen wahrgenommen werden.]</li>
</ul>

<h3>5. Key-Personen für Zitate und Interviews</h3>
<ul>
<li><strong>CEO (Strategie & Vision):</strong> [Name des CEO, Titel: Z.B. Hans Mustermann]</li>
<li><strong>CTO (Technische Details):</strong> [Name des CTO, Titel: Z.B. Dr. Lena Schmidt]</li>
<li><strong>Kunde (Testimonial, optional):</strong> [Name des Kunden, Titel: Z.B. Max Meier, Logistikleiter bei XYZ AG]</li>
</ul>`
  },
  'situation-analysis': {
    title: 'Situationsanalyse',
    description: 'Eine fundierte Analyse der aktuellen Marktposition, des Wettbewerbsumfelds sowie der internen Stärken und Schwächen.',
    content: `<h1>Situationsanalyse</h1>

<h2>I. Ausgangslage (Der aktuelle Status)</h2>

<h3>1. Interner Auslöser</h3>
<ul>
<li><strong>Grund der Pressemitteilung:</strong> [Z.B. Produkt-Launch, Fusion, neuer CEO, wichtiges Quartalsergebnis.]</li>
<li><strong>Zeitrahmen:</strong> [Wann soll die PM veröffentlicht werden? Z.B. Nächste Woche Dienstag, 09:00 Uhr.]</li>
<li><strong>Interne Ressourcen:</strong> [Wer ist verantwortlich? Ist das nötige Budget/Bildmaterial vorhanden?]</li>
<li><strong>Verfügbarkeit der Key-Personen:</strong> [Stehen CEO/CTO für Interviews bereit? Wann?]</li>
</ul>

<h3>2. Externer Kontext</h3>
<ul>
<li><strong>Branchen-Trends:</strong> [Z.B. Aktueller Fokus auf ESG/Nachhaltigkeit, KI-Hype, Lieferkettenprobleme.]</li>
<li><strong>Mediale Relevanz:</strong> [Warum ist unser Thema gerade jetzt für Journalisten wichtig?]</li>
<li><strong>Saisonale Faktoren:</strong> [Gibt es saisonale Spitzen/Tiefs (z.B. vor Weihnachten, Urlaubszeit) zu beachten?]</li>
</ul>

<h2>II. SWOT-Analyse der Kommunikation</h2>

<h3>3. Stärken (Strengths)</h3>
<ul>
<li><strong>S1 (Produkt):</strong> [Z.B. Technologische Überlegenheit (Patent, Alleinstellungsmerkmal).]</li>
<li><strong>S2 (Team):</strong> [Z.B. Renommierte Experten im Beirat oder Management.]</li>
<li><strong>S3 (Zahlen):</strong> [Z.B. Belegbare Erfolge, überzeugende Kundenzahlen (50 % Kostenersparnis).]</li>
</ul>

<h3>4. Schwächen (Weaknesses)</h3>
<ul>
<li><strong>W1 (Bekanntheit):</strong> [Z.B. Das Unternehmen ist in der breiten Öffentlichkeit noch unbekannt.]</li>
<li><strong>W2 (Komplexität):</strong> [Das Produkt ist technisch schwer zu erklären.]</li>
<li><strong>W3 (Vergangenheit):</strong> [Z.B. Frühere negative Presseberichte oder ein Imageproblem.]</li>
</ul>

<h3>5. Chancen (Opportunities)</h3>
<ul>
<li><strong>O1:</strong> [Die Konkurrenz hat noch keine vergleichbare Green-Tech-Lösung.]</li>
<li><strong>O2:</strong> [Neue Gesetze (z.B. Lieferkettengesetz) erhöhen den Bedarf an unserer Lösung.]</li>
<li><strong>O3:</strong> [Große Branchenkonferenz in vier Wochen bietet optimale Bühne.]</li>
</ul>

<h3>6. Risiken (Threats)</h3>
<ul>
<li><strong>T1:</strong> [Ein großer Wettbewerber plant einen ähnlichen Launch zur gleichen Zeit.]</li>
<li><strong>T2:</strong> [Negative Berichterstattung über die Branche insgesamt (z.B. Logistik-Krise).]</li>
<li><strong>T3:</strong> [Medien reagieren skeptisch auf neue KI-Lösungen.]</li>
</ul>`
  },
  'audience-analysis': {
    title: 'Zielgruppenanalyse',
    description: 'Erstellen Sie detaillierte Profile Ihrer Zielgruppen, um die Kommunikation präzise auf ihre Bedürfnisse abzustimmen.',
    content: `<h1>Zielgruppenanalyse</h1>

<h2>I. Primärzielgruppen (Key-Stakeholder)</h2>

<h3>1. Medien-Zielgruppen (Reichweite und Multiplikatoren)</h3>
<ul>
<li><strong>Primäre Medien:</strong> [Z.B. Fachpresse Logistik ("VerkehrsRundschau"), IT-Wirtschaftspresse ("Handelsblatt"), Regionalzeitungen]</li>
<li><strong>Sekundäre Medien:</strong> [Z.B. Allgemeine Lifestyle-Magazine, relevante Blogs, Podcasts]</li>
<li><strong>Key-Journalisten/Influencer:</strong> [Nennen Sie 3-5 wichtige Kontakte, die Sie erreichen wollen. Z.B. Frau Schmidt (Handelsblatt), Herr Meyer (Logistik-Blog)]</li>
<li><strong>Medien-Verhalten:</strong> [Wie konsumieren sie Inhalte? Z.B. Lesen <em>tagesaktuelle News-Feeds</em> online; benötigen hochauflösendes Bildmaterial.]</li>
<li><strong>Gewünschte Story-Angles (Themeninteressen):</strong> [Z.B. Interesse an: Regulatorischen Änderungen, messbarer Kostenersparnis, Green-Tech-Innovationen.]</li>
</ul>

<h3>2. End-Zielgruppen (Die wir durch die PM erreichen wollen)</h3>
<ul>
<li><strong>Wer sind sie?</strong> [Z.B. CEOs, Logistik-Manager, IT-Einkäufer im B2B-Mittelstand.]</li>
<li><strong>Demografische Eckdaten:</strong> [Z.B. Alter 40-60 Jahre, Akademiker, Entscheidungsträger.]</li>
<li><strong>Geografischer Fokus:</strong> [DACH-Region, Fokus auf Industriezentren.]</li>
</ul>

<h2>II. Bedürfnisse, Probleme und Haltung</h2>

<h3>3. Aktuelle Probleme und Pain Points</h3>
<ul>
<li><strong>Problem 1:</strong> [Hohe Kraftstoffkosten aufgrund ineffizienter Routenplanung.]</li>
<li><strong>Problem 2:</strong> [Der interne Druck zur Erfüllung neuer Nachhaltigkeitsrichtlinien (ESG) wächst.]</li>
<li><strong>Problem 3:</strong> [Mangel an transparenten Daten über die CO2-Emissionen der Lieferketten.]</li>
</ul>

<h3>4. Bedürfnisse und Informationsbedarf</h3>
<ul>
<li><strong>Primäres Bedürfnis:</strong> [Sie suchen nach einer <strong>sofort wirksamen</strong> Lösung, die Kosten senkt und Zeit spart.]</li>
<li><strong>Sekundäres Bedürfnis:</strong> [Sie benötigen leicht verständliche Informationen über die Komplexität der KI-Technologie.]</li>
<li><strong>Informationsbedarf:</strong> [Benötigen <strong>konkrete Zahlen</strong>, <em>Best Practices</em> und Zitate von Branchenexperten zur Bestätigung.]</li>
</ul>

<h3>5. Haltung zum Thema und zum Sender</h3>
<ul>
<li><strong>Haltung zum Thema (z.B. Green Tech):</strong> [Grundsätzlich positiv, aber skeptisch bezüglich der Kosten und des Aufwands der Implementierung.]</li>
<li><strong>Haltung zum Sender (Unternehmens-Wahrnehmung):</strong> [Bislang unbekannt, daher muss die PM zunächst Glaubwürdigkeit und Fachwissen vermitteln.]</li>
<li><strong>Einwände/Barrieren, die überwunden werden müssen:</strong> [Der weit verbreitete Irrglaube, dass KI-Software für den Mittelstand zu teuer ist.]</li>
</ul>

<h2>III. Mediale Erwartungen und Aufbereitung</h2>

<h3>6. Erwartete Kommunikationskanäle der Zielgruppe</h3>
<ol>
<li>[LinkedIn (Branchen-News)]</li>
<li>[Gedruckte Fachzeitschriften]</li>
<li>[Branchen-Newsletter und E-Mail-Updates]</li>
</ol>

<h3>7. Ideale Aufbereitung des Inhalts</h3>
<ul>
<li><strong>Formatpräferenzen:</strong> [Bevorzugen Infografiken und klar gegliederte Listen statt Fließtext.]</li>
<li><strong>Sprachstil-Erwartung:</strong> [Kurz, prägnant, mit hohem Nutzenversprechen ("Was bringt es mir?").]</li>
<li><strong>Idealer Call-to-Action:</strong> [Direkt zur kostenlosen Demo oder zum Whitepaper-Download leiten.]</li>
</ul>`
  },
  'core-messages': {
    title: 'Kernbotschaften & Kommunikationsziele',
    description: 'Definieren Sie die zentralen Aussagen und die übergeordneten Ziele, die durch die PR-Aktivität erreicht werden sollen.',
    content: `<h1>Kernbotschaften & Kommunikationsziele</h1>

<h2>I. Kommunikationsziele (Was wollen wir erreichen?)</h2>

<h3>1. Kognitive Ziele (Wissen/Information)</h3>
<ul>
<li><strong>Ziel 1:</strong> [Die Zielgruppe soll wissen, dass unsere neue Software <strong>KI-gestützt</strong> ist und nicht nur ein herkömmliches Update.]</li>
<li><strong>Ziel 2:</strong> [Der Markt soll die <strong>50 % Kostenersparnis</strong> durch optimierte Routen als realistisch und belegbar anerkennen.]</li>
<li><strong>Ziel 3:</strong> [Wir wollen die <strong>Alleinstellung</strong> in Bezug auf die CO2-Neutralität der Lösung im Gedächtnis der Journalisten verankern.]</li>
</ul>

<h3>2. Affektive Ziele (Einstellung/Gefühl)</h3>
<ul>
<li><strong>Ziel 1:</strong> [Die Zielgruppe soll unseren CEO als <strong>vertrauenswürdigen Vordenker</strong> im Bereich Green Tech wahrnehmen.]</li>
<li><strong>Ziel 2:</strong> [Die Berichterstattung soll ein Gefühl von <strong>Innovation, Sicherheit und Zukunftsfähigkeit</strong> vermitteln.]</li>
<li><strong>Ziel 3:</strong> [Negative Assoziationen (z.B. "KI ist zu teuer/komplex") sollen <em>abgebaut</em> werden.]</li>
</ul>

<h3>3. Konative Ziele (Verhalten/Handlung)</h3>
<ul>
<li><strong>Ziel 1 (Primär):</strong> [Journalisten sollen unsere Pressemitteilung verwenden und über das Thema <strong>berichten</strong>.]</li>
<li><strong>Ziel 2 (Endkunde):</strong> [Interessenten sollen die <strong>kostenlose Demo</strong> auf unserer Website anfordern.]</li>
<li><strong>Ziel 3 (Folge-Aktion):</strong> [Lead-Generierung: Registrierung für das <em>Whitepaper</em> "Zukunft der Logistik 5.0".]</li>
</ul>

<hr>

<h2>II. Kernbotschaften (Was müssen wir sagen?)</h2>

<h3>4. Hauptbotschaft (Der eine Satz)</h3>
<ul>
<li><strong>Der Kern:</strong> [Mit unserer KI-Lösung transformieren mittelständische Logistiker <strong>sofort</strong> ihre Kostenstrukturen und erfüllen <em>mühelos</em> die neuen Nachhaltigkeitsstandards.]</li>
</ul>

<h3>5. Stützende Botschaften (Details und Proof Points)</h3>
<ul>
<li><strong>Botschaft 1 (Nutzen):</strong> [50 % Kostenersparnis. Unsere Algorithmen reduzieren die Leerfahrten und optimieren die Routenplanung in Echtzeit um durchschnittlich 50 %.]</li>
<li><strong>Botschaft 2 (Technologie):</strong> [Green Tech ist machbar. Wir bieten die einzige KI-Plattform, die nachweislich zur Reduktion der operativen CO2-Emissionen um <strong>mindestens 30 %</strong> beiträgt.]</li>
<li><strong>Botschaft 3 (Glaubwürdigkeit):</strong> [Einfache Integration. Die Lösung ist speziell für den Mittelstand konzipiert und innerhalb von <strong>zwei Werktagen</strong> in bestehende ERP-Systeme integrierbar.]</li>
</ul>

<h3>6. Sekundärbotschaften und Hintergrund</h3>
<ul>
<li><strong>Sekundärbotschaft 1:</strong> [Der CEO wird in der PM als Experte für die Schnittstelle von Ökonomie und Ökologie zitiert.]</li>
<li><strong>Sekundärbotschaft 2:</strong> [Wir betonen unsere Rolle als Jobmotor und Ausbilder in der Region.]</li>
<li><strong>Hintergrund-Fakten:</strong> [Hinweis auf eine aktuelle Studie (Drittquelle), die den steigenden Druck auf die Logistikbranche belegt.]</li>
</ul>

<h3>7. Tonalität und Call-to-Action (Handlungsaufforderung)</h3>
<ul>
<li><strong>Gewünschte Tonalität:</strong> [Selbstbewusst, faktenorientiert, zukunftsgewandt.]</li>
<li><strong>Call-to-Action (CTA):</strong> [Wir laden Journalisten zu einem exklusiven Interview mit unserem <strong>Chief Technology Officer</strong> ein, um die Technologie tiefergehend zu besprechen. Der Endkunde wird auf die Demo geleitet.]</li>
</ul>`
  }
};