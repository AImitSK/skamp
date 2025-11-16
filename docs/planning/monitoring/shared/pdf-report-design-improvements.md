# PDF-Report Design Verbesserungen - ToDo Liste

**Version:** 1.0
**Erstellt:** 2025-11-16
**Status:** ⏳ AUSSTEHEND
**Priorität:** 🔴 HIGH (vor Refactoring!)

---

## 📊 ANALYSE-ERGEBNISSE

### IST-Zustand des aktuellen PDF-Reports

**Probleme identifiziert:**

#### 🎨 Design-Probleme
1. ❌ **Zu groß und fett**: Alles ist sehr plakativ (32px H1, 28px KPI-Werte)
2. ❌ **Emojis im Report**: 📊📈📧💭🏆📰🤖 - Nicht seriös für Kunden-Reports
3. ❌ **Harte Farben**: #005fab, #DEDC00 (Gelb) zu stark, nicht dezent
4. ❌ **Fehlende Hierarchie**: Keine klare visuelle Abstufung
5. ❌ **Kein Branding**: Kein Logo, kein Firmenname, keine Kontaktdaten
6. ❌ **Generisches Footer**: "🤖 Generiert mit CeleroPress PR-Monitoring System"

#### 📈 Metriken-Probleme
1. ⚠️ **Fehlende Metriken:**
   - Conversion-Rate (Öffnungen → Clippings) - ✅ **VORHANDEN im Dashboard, fehlt im Report!**
   - Durchschnittliche Reichweite pro Clipping
   - Medientyp-Verteilung (Online, Print, Radio, TV)
   - Click-Through-Rate (CTR) der E-Mails
   - Bounce-Rate detailliert

2. ⚠️ **Timeline fehlt Visualisierung:**
   - Aktuell: Nur Daten gesammelt, keine Charts im PDF
   - Dashboard: Hat schöne Line-Charts mit Recharts

3. ✅ **Bereits vorhanden (gut):**
   - E-Mail Stats (Öffnungsrate, Klickrate)
   - Clipping Stats (Reichweite, AVE, Sentiment)
   - Top 5 Medien
   - Alle Veröffentlichungen (Tabelle)

#### 🎯 Referenz: Monitoring-Dashboard Design

**Was gut funktioniert:**
- ✅ Dezente Grautöne (bg-gray-50, border-gray-200)
- ✅ Kleine, saubere Icons (h-5 w-5)
- ✅ Klare Hierarchie (text-2xl für Werte, text-sm für Labels)
- ✅ Recharts-Library für professionelle Diagramme
- ✅ Conversion-Rate prominent angezeigt

**Design-Pattern:**
```typescript
// KPI-Card Pattern (Dashboard)
<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
  <div className="flex items-center gap-2 mb-2">
    <Icon className="h-5 w-5 text-gray-600" />
    <Text className="text-sm text-gray-600">Label</Text>
  </div>
  <div className="text-2xl font-semibold text-gray-900">
    {value}
  </div>
</div>
```

---

## 🎯 DESIGN-VERBESSERUNGEN

### 1. BRANDING INTEGRATION ⭐ KRITISCH

**Ziel:** Agentur-Branding in PDF-Report integrieren

#### 1.1 Header mit Logo & Firmeninfo

**IST:**
```html
<div class="report-header">
  <h1>📊 Monitoring Report</h1>
  <h2>Campaign Title</h2>
  <p>Zeitraum: 01.01.2025 - 15.01.2025</p>
</div>
```

**SOLL:**
```html
<div class="report-header">
  <!-- BRANDING: Logo & Firmenname -->
  <div class="header-branding">
    <img src="{branding.logoUrl}" alt="{branding.companyName}" class="logo" />
    <div class="company-info">
      <h3 class="company-name">{branding.companyName}</h3>
      <p class="company-tagline">PR-Monitoring Report</p>
    </div>
  </div>

  <!-- Report-Titel -->
  <h1 class="report-title">{campaign.title}</h1>

  <!-- Meta-Informationen -->
  <div class="report-meta">
    <span>Zeitraum: {start} - {end}</span>
    <span class="separator">•</span>
    <span>Generiert am: {generatedDate}</span>
  </div>
</div>
```

**Datenquelle:**
- `BrandingSettings` aus Firestore
- Collection: `brandingSettings` (organizationId)
- Felder: `logoUrl`, `companyName`, `address`, `phone`, `email`, `website`

#### 1.2 Footer mit Kontaktdaten

**IST:**
```html
<div class="footer">
  <p>🤖 Generiert mit CeleroPress PR-Monitoring System</p>
  <p>Organisation ID: {organizationId}</p>
</div>
```

**SOLL:**
```html
<div class="footer">
  <!-- Kontaktdaten der Agentur -->
  <div class="footer-contact">
    <div class="footer-column">
      <strong>{branding.companyName}</strong>
      <p>{branding.address.street}</p>
      <p>{branding.address.postalCode} {branding.address.city}</p>
    </div>
    <div class="footer-column">
      <p>📞 {branding.phone}</p>
      <p>✉️ {branding.email}</p>
      <p>🌐 {branding.website}</p>
    </div>
  </div>

  <!-- Copyright (optional) -->
  {branding.showCopyright && (
    <div class="footer-copyright">
      <p>© {currentYear} {branding.companyName} - Alle Rechte vorbehalten</p>
    </div>
  )}
</div>
```

**ToDo:**
- [ ] BrandingSettings aus Firestore laden (per organizationId)
- [ ] Logo-URL in PDF-Template integrieren
- [ ] Firmenname, Adresse, Kontaktdaten in Header/Footer
- [ ] Copyright-Option berücksichtigen (showCopyright)
- [ ] Fallback: Wenn kein Branding → Standard-Footer

---

### 2. DESIGN-ÜBERARBEITUNG ⭐ KRITISCH

**Ziel:** Seriöses, dezentes, professionelles Design (wie Monitoring-Dashboard)

#### 2.1 Typografie & Größen

**IST (zu groß):**
```css
.report-header h1 { font-size: 32px; font-weight: 700; } /* Zu fett */
.kpi-value { font-size: 28px; font-weight: 700; } /* Zu groß */
.section-title { font-size: 24px; font-weight: 600; } /* OK */
```

**SOLL (dezenter):**
```css
.report-title {
  font-size: 24px; /* -8px */
  font-weight: 600; /* -100 */
  color: #111827; /* Nicht primary! */
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 20px; /* -8px */
  font-weight: 600; /* -100 */
  color: #111827;
}

.section-title {
  font-size: 18px; /* -6px */
  font-weight: 600;
  color: #374151; /* Grau statt Schwarz */
  border-bottom: 1px solid #e5e7eb; /* Dezenter */
}
```

**ToDo:**
- [ ] Font-Sizes reduzieren (H1: 32→24px, KPI: 28→20px)
- [ ] Font-Weights reduzieren (700→600)
- [ ] Farben dezenter (primary nur für Akzente, nicht für Text)

#### 2.2 Emojis entfernen

**IST:**
```html
<h1>📊 Monitoring Report</h1>
<h2>📈 Performance-Übersicht</h2>
<h2>📧 E-Mail Performance Details</h2>
<h2>💭 Sentiment-Analyse</h2>
<h2>🏆 Top 5 Medien</h2>
<h2>📰 Alle Veröffentlichungen</h2>
<p>🤖 Generiert mit...</p>
```

**SOLL:**
```html
<h1>Monitoring Report</h1>
<h2>Performance-Übersicht</h2>
<h2>E-Mail Performance</h2>
<h2>Sentiment-Analyse</h2>
<h2>Top 5 Medien nach Reichweite</h2>
<h2>Alle Veröffentlichungen</h2>
<p>Generiert mit CeleroPress</p>
```

**ToDo:**
- [ ] ALLE Emojis entfernen (📊📈📧💭🏆📰🤖)
- [ ] Nur Text verwenden

#### 2.3 Farbschema anpassen

**IST (zu stark):**
```css
:root {
  --primary: #005fab; /* OK, aber zu oft verwendet */
  --secondary: #DEDC00; /* GELB - zu grell! */
  --success: #10b981; /* OK */
  --danger: #ef4444; /* OK */
}

.kpi-value.primary { color: var(--primary); } /* Zu oft primary */
border-bottom: 4px solid var(--primary); /* Zu dick! */
```

**SOLL (dezenter):**
```css
:root {
  --primary: #005fab; /* Nur für Akzente! */
  --text-primary: #111827; /* Haupttext */
  --text-secondary: #6b7280; /* Labels */
  --border: #e5e7eb; /* Borders */
  --bg-light: #f9fafb; /* Cards */
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}

/* Primary nur für wichtige Akzente */
.logo { /* Logo kann primary haben */ }
.highlight { color: var(--primary); } /* Nur Highlights */

/* Standard: Grautöne */
.kpi-value { color: var(--text-primary); } /* Schwarz, nicht primary */
border-bottom: 1px solid var(--border); /* Dünn, grau */
```

**ToDo:**
- [ ] Gelb (#DEDC00) komplett entfernen
- [ ] Primary (#005fab) nur für Akzente (Logo, Highlight)
- [ ] Grautöne für Hauptelemente (Text, Borders, Backgrounds)
- [ ] Border-Dicke reduzieren (4px → 1px)

#### 2.4 KPI-Cards dezenter gestalten

**IST:**
```html
<div class="kpi-card" style="background: #f9fafb; border: 1px solid #e5e7eb;">
  <div class="kpi-label">E-Mail Öffnungsrate</div>
  <div class="kpi-value primary">42%</div> <!-- primary color! -->
</div>
```

**SOLL:**
```html
<div class="kpi-card">
  <div class="kpi-label">
    <span class="label-text">E-Mail Öffnungsrate</span>
  </div>
  <div class="kpi-value">42%</div> <!-- Grau/Schwarz, nicht primary -->
  <div class="kpi-trend">↑ +5% vs. Vormonat</div> <!-- Optional: Trend -->
</div>
```

**Styles:**
```css
.kpi-card {
  background: #ffffff; /* Weiß statt #f9fafb */
  border: 1px solid #e5e7eb;
  border-radius: 6px; /* Kleiner Radius */
  padding: 16px; /* Kompakter */
}

.kpi-label {
  font-size: 13px; /* Kleiner */
  color: #6b7280; /* Grau */
  margin-bottom: 6px;
}

.kpi-value {
  font-size: 20px; /* Kleiner (war 28px) */
  font-weight: 600; /* Nicht 700 */
  color: #111827; /* Schwarz, NICHT primary */
  line-height: 1.2;
}
```

**ToDo:**
- [ ] KPI-Werte: Keine primary-Farbe mehr
- [ ] Kleinere Font-Sizes (20px statt 28px)
- [ ] Weiß statt Grau-Background
- [ ] Kompakteres Padding (16px statt 20px)

---

### 3. FEHLENDE METRIKEN HINZUFÜGEN ⭐ WICHTIG

**Ziel:** Alle wichtigen Metriken aus Dashboard auch im Report

#### 3.1 Conversion-Rate hinzufügen

**Berechnung (aus Dashboard):**
```typescript
const withClippings = sends.filter(s => s.clippingId).length;
const conversionRate = opened > 0 ? Math.round((withClippings / opened) * 100) : 0;
```

**Anzeige:**
```html
<div class="kpi-card">
  <div class="kpi-label">Conversion-Rate</div>
  <div class="kpi-value">{conversionRate}%</div>
  <div class="kpi-description">Öffnungen → Veröffentlichungen</div>
</div>
```

**ToDo:**
- [ ] Conversion-Rate berechnen (Öffnungen → Clippings)
- [ ] In Performance-Übersicht einfügen
- [ ] Beschreibung hinzufügen

#### 3.2 Medientyp-Verteilung hinzufügen

**Berechnung (aus Dashboard):**
```typescript
const outletDistribution = clippings.reduce((acc, clipping) => {
  const type = clipping.outletType || 'Unbekannt';
  if (!acc[type]) acc[type] = { name: type, count: 0, reach: 0 };
  acc[type].count += 1;
  acc[type].reach += clipping.reach || 0;
  return acc;
}, {});
```

**Anzeige (Neue Sektion):**
```html
<div class="section">
  <h2 class="section-title">Medientyp-Verteilung</h2>
  <table>
    <thead>
      <tr>
        <th>Medientyp</th>
        <th>Anzahl</th>
        <th>Reichweite</th>
        <th>Anteil</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Online</td>
        <td>{online.count}</td>
        <td>{online.reach.toLocaleString()}</td>
        <td>{online.percentage}%</td>
      </tr>
      <!-- ... weitere Typen -->
    </tbody>
  </table>
</div>
```

**ToDo:**
- [ ] outletType-Verteilung berechnen (Online, Print, Radio, TV)
- [ ] Tabelle hinzufügen
- [ ] Prozent-Anteile berechnen

#### 3.3 Click-Through-Rate (CTR) hinzufügen

**Berechnung:**
```typescript
const ctr = totalSent > 0 ? Math.round((clicked / totalSent) * 100) : 0;
```

**Anzeige:**
```html
<div class="kpi-card">
  <div class="kpi-label">Click-Through-Rate (CTR)</div>
  <div class="kpi-value">{ctr}%</div>
  <div class="kpi-description">{clicked} von {totalSent} E-Mails</div>
</div>
```

**ToDo:**
- [ ] CTR berechnen (clicked / totalSent)
- [ ] In E-Mail Performance einfügen

#### 3.4 Durchschnittliche Reichweite pro Clipping

**Berechnung:**
```typescript
const avgReach = totalClippings > 0 ? Math.round(totalReach / totalClippings) : 0;
```

**Anzeige:**
```html
<div class="kpi-card">
  <div class="kpi-label">Ø Reichweite pro Artikel</div>
  <div class="kpi-value">{avgReach.toLocaleString('de-DE')}</div>
</div>
```

**ToDo:**
- [ ] Durchschnitts-Reichweite berechnen
- [ ] In Performance-Übersicht einfügen

---

### 4. TIMELINE VISUALISIERUNG ⭐ WICHTIG

**Ziel:** Timeline-Chart wie im Dashboard auch im PDF

**Problem:** PDF kann keine JavaScript-Charts (Recharts) ausführen!

**Lösung:** Chart als SVG oder Base64-Image einbetten

#### 4.1 Option A: SVG-Chart (empfohlen)

**Vorteile:**
- ✅ Vector-Grafik (skalierbar)
- ✅ Klein (inline im HTML)
- ✅ Kein JavaScript nötig

**Implementierung:**
```typescript
// timeline-chart-generator.ts
export function generateTimelineSVG(data: TimelineData[]): string {
  // SVG-Chart mit <svg>, <path>, <rect> generieren
  // Ähnlich wie Recharts, aber statisches SVG
  return `
    <svg width="800" height="300" xmlns="http://www.w3.org/2000/svg">
      <!-- Grid Lines -->
      <line x1="50" y1="0" x2="50" y2="250" stroke="#e5e7eb" />

      <!-- Data Path -->
      <path d="M50,200 L150,180 L250,150..." stroke="#005fab" fill="none" />

      <!-- Axis Labels -->
      <text x="50" y="280" font-size="12" fill="#6b7280">{date1}</text>

      <!-- ... -->
    </svg>
  `;
}
```

**ToDo:**
- [ ] SVG-Chart-Generator erstellen (timeline-chart.ts)
- [ ] Grid, Achsen, Path generieren
- [ ] Responsive Width (800px)
- [ ] In Report-Template einbetten

#### 4.2 Option B: Server-Side Chart (Quickchart.io)

**Vorteile:**
- ✅ Professionelle Charts
- ✅ Keine SVG-Logik schreiben

**Nachteil:**
- ❌ Externe API-Abhängigkeit

**Implementierung:**
```typescript
// Quickchart.io API nutzen
const chartUrl = `https://quickchart.io/chart?c={
  type: 'line',
  data: {
    labels: ${JSON.stringify(timelineData.map(d => d.date))},
    datasets: [{
      label: 'Clippings',
      data: ${JSON.stringify(timelineData.map(d => d.clippings))},
      borderColor: '#005fab',
      fill: false
    }]
  }
}`;

// Im HTML:
<img src="{chartUrl}" alt="Timeline" />
```

**ToDo (falls Option B):**
- [ ] Quickchart.io API integrieren
- [ ] Timeline-Daten in Chart-Format konvertieren
- [ ] Chart-URL im Template einbetten

**Empfehlung:** Option A (SVG) - Keine externe Abhängigkeit!

---

### 5. TABELLEN-DESIGN VERBESSERN ⭐ MEDIUM

**Ziel:** Dezentere, professionellere Tabellen

#### 5.1 Table-Header dezenter

**IST:**
```css
thead { background: #f3f4f6; }
th {
  font-size: 12px;
  text-transform: uppercase;
  border-bottom: 2px solid var(--primary); /* Zu dick, primary! */
}
```

**SOLL:**
```css
thead { background: #f9fafb; } /* Heller */
th {
  font-size: 11px; /* Kleiner */
  text-transform: uppercase;
  font-weight: 600; /* Nicht bold */
  color: #6b7280; /* Grau */
  border-bottom: 1px solid #e5e7eb; /* Dünn, grau */
  padding: 10px 12px; /* Kompakter */
}
```

**ToDo:**
- [ ] Table-Header: Border dünn und grau (nicht primary)
- [ ] Font-Size kleiner (11px)
- [ ] Background heller (#f9fafb)

#### 5.2 Row-Hover entfernen (PDF!)

**IST:**
```css
tr:hover { background: #f9fafb; } /* Funktioniert nicht in PDF! */
```

**SOLL:**
```css
tbody tr:nth-child(even) {
  background: #f9fafb; /* Zebra-Streifen stattdessen */
}
```

**ToDo:**
- [ ] Hover-Effekt entfernen
- [ ] Zebra-Streifen hinzufügen (jede 2. Zeile)

---

### 6. LAYOUT & SPACING ⭐ MEDIUM

**Ziel:** Bessere Hierarchie, weniger Clutter

#### 6.1 Section-Spacing reduzieren

**IST:**
```css
.section { margin-bottom: 40px; } /* Zu viel */
```

**SOLL:**
```css
.section { margin-bottom: 32px; } /* Kompakter */
.section:last-child { margin-bottom: 0; }
```

**ToDo:**
- [ ] Section-Spacing: 40px → 32px

#### 6.2 KPI-Grid kompakter

**IST:**
```css
.kpi-grid {
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
```

**SOLL:**
```css
.kpi-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
```

**ToDo:**
- [ ] Grid-Gap: 20px → 16px
- [ ] Auto-fit für flexible Spalten

---

## 📋 MASTER TODO-LISTE

### Phase 1: Branding Integration (KRITISCH)

- [ ] **1.1** BrandingSettings-Service erstellen/integrieren
  - [ ] getBrandingSettings(organizationId) Methode
  - [ ] Fallback: Default-Branding wenn leer

- [ ] **1.2** Logo in Header integrieren
  - [ ] Logo-URL aus BrandingSettings laden
  - [ ] Logo-Size: max 200x80px
  - [ ] Fallback: Kein Logo wenn nicht gesetzt

- [ ] **1.3** Firmenname & Tagline
  - [ ] companyName aus BrandingSettings
  - [ ] Tagline: "PR-Monitoring Report"

- [ ] **1.4** Footer mit Kontaktdaten
  - [ ] Adresse (Straße, PLZ, Stadt)
  - [ ] Telefon, E-Mail, Website
  - [ ] Copyright-Option (showCopyright)

### Phase 2: Design-Überarbeitung (KRITISCH)

- [ ] **2.1** Typografie anpassen
  - [ ] H1: 32px → 24px
  - [ ] KPI-Values: 28px → 20px
  - [ ] Section-Titles: 24px → 18px
  - [ ] Font-Weights: 700 → 600

- [ ] **2.2** Emojis entfernen
  - [ ] ALLE Emojis löschen (📊📈📧💭🏆📰🤖)

- [ ] **2.3** Farbschema anpassen
  - [ ] Gelb (#DEDC00) entfernen
  - [ ] Primary nur für Akzente
  - [ ] Grautöne für Hauptelemente
  - [ ] Borders: 4px → 1px

- [ ] **2.4** KPI-Cards dezenter
  - [ ] Background: #f9fafb → #ffffff
  - [ ] Keine primary-Farbe für Werte
  - [ ] Padding: 20px → 16px

### Phase 3: Fehlende Metriken (WICHTIG)

- [ ] **3.1** Conversion-Rate hinzufügen
  - [ ] Berechnung: withClippings / opened
  - [ ] KPI-Card erstellen
  - [ ] Beschreibung: "Öffnungen → Veröffentlichungen"

- [ ] **3.2** Medientyp-Verteilung
  - [ ] outletDistribution berechnen
  - [ ] Tabelle erstellen
  - [ ] Prozent-Anteile

- [ ] **3.3** Click-Through-Rate (CTR)
  - [ ] Berechnung: clicked / totalSent
  - [ ] In E-Mail Performance einfügen

- [ ] **3.4** Durchschnitts-Reichweite
  - [ ] Berechnung: totalReach / totalClippings
  - [ ] KPI-Card erstellen

### Phase 4: Timeline-Visualisierung (WICHTIG)

- [ ] **4.1** SVG-Chart-Generator erstellen
  - [ ] timeline-chart.ts Datei
  - [ ] Grid-Lines generieren
  - [ ] Data-Path generieren
  - [ ] Axis-Labels generieren

- [ ] **4.2** SVG in Template einbetten
  - [ ] Neue Sektion "Veröffentlichungen über Zeit"
  - [ ] SVG inline einfügen
  - [ ] Responsive Width (800px)

### Phase 5: Tabellen-Design (MEDIUM)

- [ ] **5.1** Table-Header dezenter
  - [ ] Border: 2px primary → 1px grau
  - [ ] Font-Size: 12px → 11px
  - [ ] Background: #f3f4f6 → #f9fafb

- [ ] **5.2** Zebra-Streifen
  - [ ] Hover entfernen
  - [ ] nth-child(even) Background

### Phase 6: Layout & Spacing (MEDIUM)

- [ ] **6.1** Section-Spacing reduzieren
  - [ ] margin-bottom: 40px → 32px

- [ ] **6.2** KPI-Grid kompakter
  - [ ] gap: 20px → 16px
  - [ ] auto-fit für flexible Spalten

### Phase 7: Testing & Validation

- [ ] **7.1** Manueller Test
  - [ ] PDF generieren (Dev-Environment)
  - [ ] Alle Metriken prüfen
  - [ ] Branding prüfen (Logo, Firmenname, Footer)
  - [ ] Design prüfen (Farben, Fonts, Spacing)

- [ ] **7.2** Edge Cases testen
  - [ ] Kein Branding gesetzt → Fallback
  - [ ] Keine Clippings → Empty State
  - [ ] Sehr lange Firmennamen → Umbruch
  - [ ] Sehr viele Clippings → Page Break

- [ ] **7.3** Cross-Browser PDF
  - [ ] Chrome PDF-Viewer
  - [ ] Adobe Acrobat Reader
  - [ ] Mobile PDF-Viewer

---

## 🎯 PRIORITÄTEN

### 🔴 HIGH (MUSS vor Refactoring)
1. ✅ Phase 1: Branding Integration
2. ✅ Phase 2: Design-Überarbeitung
3. ✅ Phase 3: Fehlende Metriken

### 🟡 MEDIUM (Sollte vor Refactoring)
4. ⚠️ Phase 4: Timeline-Visualisierung
5. ⚠️ Phase 5: Tabellen-Design
6. ⚠️ Phase 6: Layout & Spacing

### 🟢 LOW (Kann während Refactoring)
7. ℹ️ Phase 7: Testing & Validation

---

## 📊 ERFOLGS-KRITERIEN

### Design
- [ ] Keine Emojis mehr im Report
- [ ] Logo der Agentur prominent im Header
- [ ] Firmenname & Kontaktdaten im Footer
- [ ] Dezente Farben (Grautöne, primary nur Akzente)
- [ ] Kleinere Schriftgrößen (24px H1, 20px KPI)
- [ ] Dünne Borders (1px statt 4px)

### Metriken
- [ ] Conversion-Rate vorhanden
- [ ] Medientyp-Verteilung vorhanden
- [ ] CTR vorhanden
- [ ] Durchschnitts-Reichweite vorhanden
- [ ] Timeline-Chart vorhanden

### Professionalität
- [ ] Seriöser Eindruck (wie Dashboard)
- [ ] Kundenreportings-tauglich
- [ ] Saubere Hierarchie
- [ ] Klare Struktur

---

## 🔗 REFERENZEN

### Design-Referenzen
- **Monitoring-Dashboard:** `src/components/monitoring/MonitoringDashboard.tsx`
  - Zeilen 177-239: KPI-Cards Pattern
  - Zeilen 241-280: Timeline-Chart (Recharts)

- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
  - Primary: #005fab
  - Grautöne: zinc-50 bis zinc-900
  - Heroicons /24/outline

### Daten-Referenzen
- **BrandingSettings:** `src/types/branding.ts`
  - Interface: BrandingSettings
  - Felder: logoUrl, companyName, address, phone, email, website, showCopyright

- **Branding-Service:** `src/lib/firebase/branding-service.ts` (vermutlich vorhanden)
  - getBrandingSettings(organizationId)

### Metriken-Referenzen
- **Dashboard-Metriken:** `src/components/monitoring/MonitoringDashboard.tsx`
  - Zeilen 147-161: emailStats Berechnung
  - Zeile 159: conversionRate = withClippings / opened
  - Zeilen 103-115: outletDistribution

---

**Erstellt:** 2025-11-16
**Status:** ⏳ READY TO IMPLEMENT
**Next Step:** Phase 1 - Branding Integration starten

🤖 Generated with Claude Code
