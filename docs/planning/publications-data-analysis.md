# Publications-Modul: Datenfeld-Analyse

**Erstellt:** 2025-10-15
**Modul:** `/dashboard/library/publications/`
**Zweck:** Analyse aller erfassten Felder vs. tatsächlich verwendete Daten

---

## 📝 1. Felder im Erstellungs-Modal (PublicationModal.tsx)

### Tab 1: Grunddaten (Basic)

| Feld | Typ | Erforderlich | Zeile |
|------|-----|-------------|-------|
| `title` | string | ✅ Ja | 843-848 |
| `subtitle` | string | ❌ Nein | 853-859 |
| `publisherId` | string | ✅ Ja | 889-904 |
| `publisherName` | string | Auto | 488-490 |
| `websiteUrl` | string | ❌ Nein | 912-917 |
| `geographicScope` | enum | ❌ Nein | 924-932 |
| `type` | enum | ✅ Ja | 942-950 |
| `format` | enum | ❌ Nein | 957-964 |
| `status` | enum | ❌ Nein | 970-978 |
| `languages` | LanguageCode[] | ✅ Ja | 987-992 |
| `geographicTargets` | CountryCode[] | ✅ Ja | 1000-1005 |
| `focusAreas` | string[] | ❌ Nein | 1012-1019 |
| `verified` | boolean | ❌ Nein | 1025-1031 |
| `internalNotes` | string | ❌ Nein | 1038-1043 |

**Zählwerte:**
- ✅ Pflichtfelder: 5 (title, publisherId, type, languages, geographicTargets)
- ❌ Optionale Felder: 9

---

### Tab 2: Metriken (Metrics)

#### Allgemeine Metriken

| Feld | Typ | Zeile |
|------|-----|-------|
| `metrics.frequency` | enum | 1057-1065 |
| `metrics.targetAudience` | string | 1073-1076 |
| `metrics.targetAgeGroup` | string | 1087-1090 |
| `metrics.targetGender` | enum | 1097-1103 |

#### Print-Metriken (wenn format = 'print' oder 'both')

| Feld | Typ | Zeile |
|------|-----|-------|
| `metrics.print.circulation` | number | 1118-1124 |
| `metrics.print.circulationType` | enum | 1131-1142 |
| `metrics.print.pricePerIssue` | number → Price | 1149-1157 |
| `metrics.print.subscriptionPriceMonthly` | number → Price | 1166-1172 |
| `metrics.print.subscriptionPriceAnnual` | number → Price | - |
| `metrics.print.paperFormat` | string | 1180-1186 |
| `metrics.print.pageCount` | number | 1194-1200 |

#### Online-Metriken (wenn format = 'online' oder 'both')

| Feld | Typ | Zeile |
|------|-----|-------|
| `metrics.online.monthlyUniqueVisitors` | number | 1217-1223 |
| `metrics.online.monthlyPageViews` | number | 1230-1236 |
| `metrics.online.avgSessionDuration` | number | 1245-1252 |
| `metrics.online.bounceRate` | number | 1259-1266 |
| `metrics.online.registeredUsers` | number | 1274-1280 |
| `metrics.online.paidSubscribers` | number | - |
| `metrics.online.newsletterSubscribers` | number | 1288-1294 |
| `metrics.online.domainAuthority` | number | - |
| `metrics.online.hasPaywall` | boolean | 1302-1308 |
| `metrics.online.hasMobileApp` | boolean | 1314-1320 |

**Zählwerte Metriken:**
- Allgemein: 4 Felder
- Print: 7 Felder
- Online: 10 Felder
- **Gesamt: 21 Metrik-Felder**

---

### Tab 3: Identifikatoren & Links (Identifiers)

#### Identifikatoren (dynamisches Array)

| Feld | Typ | Zeile |
|------|-----|-------|
| `identifiers[].type` | enum | 1338-1353 |
| `identifiers[].value` | string | 1357-1364 |
| `identifiers[].description` | string | Optional |

**Mögliche Typen:** ISSN, ISBN, DOI, URL, DOMAIN, SOCIAL_HANDLE, OTHER

#### Social Media URLs (dynamisches Array)

| Feld | Typ | Zeile |
|------|-----|-------|
| `socialMediaUrls[].platform` | string | 1394-1400 |
| `socialMediaUrls[].url` | string | 1404-1410 |

**Zählwerte Identifikatoren:**
- Identifiers: 3 Felder pro Eintrag (unbegrenzt)
- Social Media: 2 Felder pro Eintrag (unbegrenzt)

---

### Tab 4: Monitoring

| Feld | Typ | Zeile |
|------|-----|-------|
| `monitoringConfig.isEnabled` | boolean | 1445-1449 |
| `monitoringConfig.websiteUrl` | string | 1466-1478 |
| `monitoringConfig.rssFeedUrls` | string[] | 1554-1594 |
| `monitoringConfig.autoDetectRss` | boolean | Auto |
| `monitoringConfig.checkFrequency` | enum | 1604-1612 |
| `monitoringConfig.keywords` | string[] | 1621-1664 |
| `monitoringConfig.totalArticlesFound` | number | Read-only |

**Zählwerte Monitoring:**
- 7 Felder (inkl. Arrays)

---

## 📊 2. Felder in der Übersichtstabelle (page.tsx)

### Tabellen-Spalten (Header: Zeile 629-660)

| Spalte | Datenfeld | Zeile | Sichtbarkeit |
|--------|-----------|-------|--------------|
| **Checkbox** | Selection State | 633-636 | Immer |
| **Titel** | `title` | 689-691 | Immer (25% width) |
| **Verlag** | `publisherName` | 708-710 | Hidden < md (20%) |
| **Typ** | `type` | 713-716 | Hidden < lg (15%) |
| **Metrik** | Berechnet aus `metrics.print.circulation` oder `metrics.online.monthlyUniqueVisitors` | 718-720 | Hidden < lg (15%) |
| **Frequenz** | `metrics.frequency` | 722-724 | Hidden < xl (10%) |
| **RSS** | `monitoringConfig.isEnabled` & `rssFeedUrls.length` | 726-734 | Hidden < xl (5%) |
| **Zielgebiet** | `geographicTargets` (max 2) | 737-743 | Hidden < xl |

### Zusätzliche Display-Elemente

| Element | Datenfeld | Zeile |
|---------|-----------|-------|
| **Verifiziert Badge** | `verified` | 693-698 |
| **Verweis Badge** | `_isReference` | 699-703 |
| **Type Badge** | `type` | 713-716 |

### Berechnete Felder

```typescript
// Zeile 344-352: formatMetric()
formatMetric(pub: Publication): string {
  if (pub.metrics?.print?.circulation) {
    return `${circulation} Auflage`;
  }
  if (pub.metrics?.online?.monthlyUniqueVisitors) {
    return `${visitors} UV/Monat`;
  }
  return "—";
}
```

**Zählwerte Tabelle:**
- Direkt angezeigte Felder: 8
- Badge/Status-Felder: 3
- Berechnete Felder: 1 (formatMetric)
- **Gesamt: 12 verwendete Felder**

---

## 📄 3. Felder auf der Detailseite ([publicationId]/page.tsx)

### Header-Bereich (Zeile 354-436)

| Element | Datenfeld | Zeile |
|---------|-----------|-------|
| **Titel** | `title` | 357 |
| **Untertitel** | `subtitle` | 359-363 |
| **Erstellt am** | `createdAt` | 368-370 |
| **Publisher Link** | `publisher.name` + Link | 371-379 |
| **Type Badge** | `type` | 381 |
| **Format Badge** | `format` | 382 |
| **Scope Badge** | `geographicScope` | 383 |
| **Status Badge** | `status` | 384-390 |

### Stat Cards (Zeile 439-464)

| Card | Datenfeld | Zeile |
|------|-----------|-------|
| **Reichweite** | `formatMetric()` + `metrics.frequency` | 440-445 |
| **Geografisch** | `geographicTargets.length` | 448-451 |
| **Werbemittel** | `advertisements.length` | 454-457 |
| **Sprachen** | `languages.length` + join | 460-463 |

---

### Tab 1: Übersicht (overview) - Zeile 527-691

#### Grundinformationen

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Typ | `type` | 540 |
| Format | `format` | 541 |
| Geografischer Fokus | `geographicScope` | 542 |
| Status | `status` | 543-551 |
| Gegründet | `launchDate` | 552-554 |

#### Themenschwerpunkte

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Themen-Badges | `focusAreas[]` | 569-573 |

#### Zielbranchen

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Branchen-Badges | `targetIndustries[]` | 589-594 |

#### Notizen

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Öffentliche Notizen | `publicNotes` | 608-614 |
| Interne Notizen | `internalNotes` | 617-624 |

#### Sidebar: Sprachen & Länder

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Sprachen | `languages[]` | 643-653 |
| Zielländer | `geographicTargets[]` | 656-666 |

#### Sidebar: Verifizierung

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Verifiziert | `verified` | 671-687 |
| Verifiziert am | `verifiedAt` | 680-682 |

**Zählwerte Tab Übersicht: 14 Felder (+ 2 Arrays)**

---

### Tab 2: Metriken & Zahlen (metrics) - Zeile 694-842

#### Erscheinungsfrequenz

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Frequenz | `metrics.frequency` | 704 |

#### Print-Metriken

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Auflage | `metrics.print.circulation` | 722 |
| Auflagentyp | `metrics.print.circulationType` | 726-731 |
| Preis pro Ausgabe | `metrics.print.pricePerIssue.amount` + currency | 740-742 |

#### Online-Metriken

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Monatliche Unique Visitors | `metrics.online.monthlyUniqueVisitors` | 762 |
| Monatliche Page Views | `metrics.online.monthlyPageViews` | 772 |
| Ø Sitzungsdauer | `metrics.online.avgSessionDuration` | 782 |
| Bounce Rate | `metrics.online.bounceRate` | 792 |
| Registrierte Nutzer | `metrics.online.registeredUsers` | 802 |
| Zahlende Abonnenten | `metrics.online.paidSubscribers` | 812 |

#### Zielgruppe

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Zielgruppe | `metrics.targetAudience` | 827 |
| Altersgruppe | `metrics.targetAgeGroup` | 829 |
| Geschlecht | `metrics.targetGender` | 832-836 |

**Zählwerte Tab Metriken: 13 Felder**

---

### Tab 3: Redaktion & Einreichung (editorial) - Zeile 845-1006

#### Redaktionelle Kontakte

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Role | `editorialContacts[].role` | 857 |
| Name | `editorialContacts[].name` | 860 |
| E-Mail | `editorialContacts[].email` | 866 |
| Telefon | `editorialContacts[].phone` | 871 |
| Themen | `editorialContacts[].topics[]` | 877-883 |

#### Einreichungsrichtlinien

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Allgemeine Info | `submissionGuidelines.generalInfo` | 898-904 |
| Bevorzugte Methode | `submissionGuidelines.preferredSubmissionMethod` | 907-913 |
| E-Mail | `submissionGuidelines.submissionEmail` | 916-921 |
| Portal URL | `submissionGuidelines.submissionPortalUrl` | 924-928 |
| Bevorzugte Formate | `submissionGuidelines.preferredFormats[]` | 933-948 |
| Deadlines Type | `submissionGuidelines.deadlines.type` | 957 |
| Deadlines Time | `submissionGuidelines.deadlines.time` | 961 |
| Days Before Publication | `submissionGuidelines.deadlines.daysBeforePublication` | 962 |
| Deadline Notes | `submissionGuidelines.deadlines.notes` | 965 |

#### Ressorts & Rubriken

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Name | `sections[].name` | 984 |
| Beschreibung | `sections[].description` | 987-989 |
| Themen | `sections[].focusTopics[]` | 992-997 |

**Zählwerte Tab Editorial: 17 Felder (+ 3 Arrays)**

---

### Tab 4: Werbemittel (advertisements) - Zeile 1009-1098

**Hinweis:** Zeigt externe Daten (`Advertisement[]`), keine Publication-Felder.

**Zählwerte: 0 eigene Publication-Felder**

---

### Tab 5: Identifikatoren & Links (identifiers) - Zeile 1101-1219

#### Identifikatoren

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Typ | `identifiers[].type` | 1113 |
| Wert | `identifiers[].value` | 1116 |

#### Online-Präsenz

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Website | `websiteUrl` | 1132-1144 |
| RSS Feed | `rssFeedUrl` | 1147-1159 |

#### Social Media

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Plattform | `socialMediaUrls[].platform` | 1178 |
| URL | `socialMediaUrls[].url` | 1172 |

#### Ausgaben & Editionen

| Feld | Datenfeld | Zeile |
|------|-----|-------|
| Name | `editions[].name` | 1197 |
| Typ | `editions[].type` | 1200-1203 |
| Länder | `editions[].countries[]` | 1206-1212 |

**Zählwerte Tab Identifiers: 9 Felder (+ 3 Arrays)**

---

## ✅ 4. Zusammenfassung: Verwendete vs. Nicht-verwendete Felder

### 4.1 IM MODAL ERFASST (Gesamt)

| Kategorie | Anzahl |
|-----------|--------|
| **Grunddaten** | 14 Felder |
| **Metriken** | 21 Felder |
| **Identifikatoren** | 5 Felder (2 Arrays) |
| **Monitoring** | 7 Felder |
| **GESAMT** | **47 Felder** |

---

### 4.2 AUF DETAILSEITE ANGEZEIGT (Gesamt)

| Tab | Felder verwendet |
|-----|------------------|
| Header + Stat Cards | 14 |
| Übersicht | 14 |
| Metriken | 13 |
| Redaktion | 17 |
| Werbemittel | 0 (extern) |
| Identifikatoren | 9 |
| **GESAMT** | **67** (mit Duplikaten) |
| **UNIQUE** | **~53** |

---

### 4.3 IN TABELLE ANGEZEIGT

**12 Felder** (inkl. berechnet)

---

## ⚠️ 5. PROBLEME & DISKREPANZEN

### 🔴 5.1 IM MODAL ERFASST, ABER NIRGENDS VERWENDET

| Feld | Erfasst in | Verwendet in | Status |
|------|-----------|--------------|--------|
| `metrics.print.subscriptionPriceAnnual` | Metriken-Tab | ❌ Nirgends | ⚠️ **UNUSED** |
| `metrics.print.pageCount` | Metriken-Tab | ❌ Nirgends | ⚠️ **UNUSED** |
| `metrics.online.paidSubscribers` | Metriken-Tab (hidden?) | ❌ Nirgends | ⚠️ **UNUSED** |
| `metrics.online.domainAuthority` | Metriken-Tab (hidden?) | ❌ Nirgends | ⚠️ **UNUSED** |
| `metrics.online.newsletterSubscribers` | Metriken-Tab | ❌ Nirgends | ⚠️ **UNUSED** |
| `monitoringConfig.autoDetectRss` | Monitoring-Tab | ❌ Nirgends | ⚠️ **UNUSED** |
| `monitoringConfig.keywords` | Monitoring-Tab | ❌ Nirgends | ⚠️ **UNUSED** |
| `monitoringConfig.totalArticlesFound` | Monitoring-Tab | ❌ Nirgends | ⚠️ **UNUSED** |

**Probleme-Anzahl: 8 ungenutzte Felder**

---

### 🟡 5.2 AUF DETAILSEITE VERWENDET, ABER NICHT IM MODAL

| Feld | Verwendet in | Erfasst? | Status |
|------|--------------|----------|--------|
| `publicNotes` | Detailseite Tab Übersicht | ❌ Nein | ⚠️ **MISSING** |
| `targetIndustries[]` | Detailseite Tab Übersicht | ❌ Nein | ⚠️ **MISSING** |
| `launchDate` | Detailseite Tab Übersicht | ❌ Nein | ⚠️ **MISSING** |
| `editorialContacts[]` | Detailseite Tab Editorial | ❌ Nein | ⚠️ **MISSING** |
| `submissionGuidelines` (komplett) | Detailseite Tab Editorial | ❌ Nein | ⚠️ **MISSING** |
| `sections[]` | Detailseite Tab Editorial | ❌ Nein | ⚠️ **MISSING** |
| `rssFeedUrl` | Detailseite Tab Identifiers | ❌ Nein | ⚠️ **MISSING** |
| `editions[]` | Detailseite Tab Identifiers | ❌ Nein | ⚠️ **MISSING** |

**Probleme-Anzahl: 8 fehlende Modal-Erfassungen**

---

### 🔵 5.3 MOCK-DATEN / PLACEHOLDER

| Feld | Typ | Problem | Zeile |
|------|-----|---------|-------|
| `_isReference` | Flag | Nicht im Type-Definition, nur Runtime | page.tsx:699 |
| `verifiedAt` | Timestamp | Wird gesetzt aber nicht im Modal erfasst | [publicationId]/page.tsx:680 |
| `createdAt` | Timestamp | Auto-generiert | Mehrere |
| `deletedAt` | Timestamp | Soft-Delete | [publicationId]/page.tsx:246 |
| `deletedBy` | string | Soft-Delete | [publicationId]/page.tsx:247 |

---

### 🟢 5.4 RICHTIG IMPLEMENTIERT

| Kategorie | Felder | Status |
|-----------|--------|--------|
| **Grunddaten** | 11 von 14 | ✅ Gut verwendet |
| **Print-Metriken** | 4 von 7 | ⚠️ 3 unused |
| **Online-Metriken** | 6 von 10 | ⚠️ 4 unused |
| **Identifikatoren** | 5 von 5 | ✅ Gut verwendet |
| **Monitoring** | 3 von 7 | ⚠️ 4 unused |

---

## 🎯 6. EMPFEHLUNGEN

### 6.1 SOFORT BEHEBEN (Kritisch)

1. **Fehlende Modal-Tabs erstellen:**
   - Tab "Redaktion" hinzufügen für:
     - `editorialContacts[]`
     - `submissionGuidelines`
     - `sections[]`
   - Tab "Erweitert" für:
     - `publicNotes`
     - `targetIndustries[]`
     - `launchDate`
     - `rssFeedUrl`
     - `editions[]`

2. **Ungenutzte Felder entfernen oder verwenden:**
   - Entweder in Detailseite anzeigen ODER aus Modal entfernen:
     - `metrics.print.pageCount`
     - `metrics.print.subscriptionPriceAnnual`
     - `metrics.online.newsletterSubscribers`
     - `metrics.online.paidSubscribers`
     - `metrics.online.domainAuthority`
     - `monitoringConfig.keywords`
     - `monitoringConfig.totalArticlesFound`

### 6.2 MITTELFRISTIG (Verbesserungen)

1. **Type-Definitions vervollständigen:**
   - `_isReference` in Type aufnehmen
   - `verifiedAt` in Type und Modal

2. **Detailseite Tab "Metriken":**
   - Fehlende Print-Metriken anzeigen (pageCount, subscriptionPriceAnnual)
   - Fehlende Online-Metriken anzeigen (newsletterSubscribers, paidSubscribers, domainAuthority)

3. **Monitoring-Tab Detailseite:**
   - Aktuell wird Monitoring-Config nur im Modal verwendet
   - Detailseite sollte zeigen: RSS Feeds, Keywords, totalArticlesFound

### 6.3 LANGFRISTIG (Optimierung)

1. **Tabelle optimieren:**
   - Zu viele Hidden-Spalten auf mobilen Geräten
   - Responsive Design verbessern

2. **Konsistenz:**
   - Alle Modal-Felder sollten irgendwo sichtbar sein
   - Alle Detailseiten-Daten sollten editierbar sein

---

## 📊 7. STATISTIK

### Vollständigkeit

| Metrik | Wert |
|--------|------|
| **Modal-Felder gesamt** | 47 |
| **Davon ungenutzt** | 8 (17%) |
| **Davon verwendet** | 39 (83%) |
| **Detailseite-Felder ohne Modal** | 8 |
| **Vollständigkeit-Score** | 83% ✅ |

### Datenqualität

| Kategorie | Bewertung |
|-----------|-----------|
| **Grunddaten** | ⭐⭐⭐⭐⭐ Sehr gut |
| **Metriken** | ⭐⭐⭐ Mittel (viele unused) |
| **Identifikatoren** | ⭐⭐⭐⭐ Gut |
| **Editorial** | ⭐ Schlecht (nicht im Modal) |
| **Monitoring** | ⭐⭐ Schlecht (unused + nicht sichtbar) |

---

## 🔄 8. NÄCHSTE SCHRITTE

1. ✅ **Analyse erstellt** - Diese Datei
2. ⏳ **Modal erweitern** - Editorial + Erweiterte Felder
3. ⏳ **Detailseite vervollständigen** - Monitoring-Tab
4. ⏳ **Ungenutzte Felder prüfen** - Entfernen oder verwenden
5. ⏳ **Type-Definitions aktualisieren** - Alle Felder erfassen

---

**Letzte Aktualisierung:** 2025-10-15
**Analyst:** Claude Code
**Status:** ✅ Analyse abgeschlossen
