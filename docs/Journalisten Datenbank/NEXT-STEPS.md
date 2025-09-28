# Nächste Schritte: Journalisten-Datenbank Implementation

## 🎯 Was wäre als Nächstes zu tun?

### Option 1: Frontend-Komponenten (User Experience)
**Was**: Die Benutzeroberfläche für das neue Feature erstellen

```typescript
// Beispiel-Komponenten die wir brauchen:
- JournalistSearch.tsx        // Suchmaske für Premium-DB
- JournalistImportDialog.tsx  // Import-Dialog mit Mapping
- JournalistCard.tsx          // Anzeige einzelner Journalisten
- SyncStatusIndicator.tsx     // Sync-Status anzeigen
- SubscriptionBanner.tsx      // Premium-Upgrade-Hinweise
```

**Vorteile**:
- Sofort sichtbares Ergebnis
- User können Feature testen
- Feedback früh möglich

---

### Option 2: API-Endpoints (Backend-Logik)
**Was**: REST API für die Services aufbauen

```typescript
// API Routes die wir brauchen:
/api/journalists/search        // Suche in Master-DB
/api/journalists/import        // Import ins CRM
/api/journalists/sync          // Sync triggern
/api/journalists/subscription  // Abo-Status prüfen
/api/admin/journalists/verify  // Admin: Verifizierung
```

**Vorteile**:
- Saubere Trennung Frontend/Backend
- Testbar mit Postman/Insomnia
- Basis für spätere Mobile App

---

### Option 3: Firestore Security Rules (Sicherheit)
**Was**: Zugriffskontrollen definieren

```javascript
// Regeln für:
- Wer darf suchen? (nur Premium)
- Wer darf importieren? (mit Quota)
- Wer darf verifizieren? (nur Admin)
- Anonymes Crowdsourcing erlauben
```

**Vorteile**:
- Sicherheit von Anfang an
- DSGVO-Compliance sicherstellen
- Keine nachträglichen Sicherheitslücken

---

### Option 4: E-Mail-Workflows (Verifizierung)
**Was**: Automatisierte E-Mail-Kommunikation

```typescript
// E-Mail Templates:
1. Verifizierungs-Anfrage
2. Dankeschön nach Verifizierung
3. Jährliche Update-Erinnerung
4. Opt-Out-Bestätigung
```

**Vorteile**:
- Kritisch für Datenqualität
- DSGVO-Requirement
- Automatisierung von Anfang an

---

## 🏆 Meine Empfehlung: Start mit Frontend-Komponenten

### Warum?
1. **Sofort testbar** - Du kannst mit Mock-Daten arbeiten
2. **User-Feedback** - Früh erkennen was funktioniert
3. **Motivation** - Sichtbarer Fortschritt
4. **Iterativ** - Backend kann parallel wachsen

### Konkret würden wir beginnen mit:

#### 1. Such-Interface (Read-Only)
```typescript
// src/app/dashboard/library/editors/page.tsx
- Suchmaske mit Filtern
- Ergebnisliste
- Detail-Ansicht
- "Import"-Button (disabled ohne Premium)
```

#### 2. Import-Dialog
```typescript
// src/components/journalists/ImportDialog.tsx
- Journalist-Vorschau
- Feld-Mapping
- Konflikt-Warnung
- Import-Bestätigung
```

#### 3. Sync-Status-Dashboard
```typescript
// src/components/journalists/SyncDashboard.tsx
- Verknüpfte Journalisten
- Letzte Sync-Zeit
- Konflikt-Anzeige
- Sync-Trigger
```

---

## 📊 Aufwandsschätzung

| Option | Aufwand | Komplexität | Wert für User |
|--------|---------|-------------|---------------|
| Frontend-Komponenten | 2-3 Tage | Mittel | Hoch |
| API-Endpoints | 3-4 Tage | Hoch | Mittel |
| Security Rules | 1 Tag | Niedrig | Kritisch |
| E-Mail-Workflows | 2 Tage | Mittel | Hoch |

---

## 🚀 Quick Start: Minimal Viable Feature

Wenn du **HEUTE** starten willst, würde ich vorschlagen:

### Tag 1: Basis-Suche
1. **Such-Komponente** mit Mock-Daten
2. **Ergebnisliste** mit Journalisten-Cards
3. **Filter-Sidebar** (Media-Type, Topics, Verified)

### Tag 2: Import-Flow
1. **Import-Dialog** mit Vorschau
2. **Duplikat-Check** Warnung
3. **Success-Feedback** nach Import

### Tag 3: Integration
1. **Echte Daten** aus Firestore
2. **Basis-API** für Search & Import
3. **Premium-Check** für Features

Nach 3 Tagen hättest du ein **funktionierendes MVP**, das User testen können!

---

## 💡 Alternative: Admin-First Approach

Falls du erstmal **ohne User-Frontend** starten willst:

1. **Admin-Panel** zum manuellen Befüllen der DB
2. **CSV-Import** für Massen-Daten
3. **Verifizierungs-Queue** für Admin-Review
4. **Matching-Dashboard** für Crowdsourcing-Kandidaten

Vorteil: Datenbank wächst, während Frontend entwickelt wird.

---

## ❓ Entscheidungshilfe

**Frontend-First wenn**:
- User-Experience im Fokus
- Schnelles Feedback wichtig
- Demo für Stakeholder nötig

**Backend-First wenn**:
- Datenqualität kritisch
- Integration mit externen APIs geplant
- Sicherheit absolute Priorität

**Admin-First wenn**:
- Erstmal Daten sammeln
- Manueller Prozess OK für Start
- Zeit für perfektes Frontend später

---

Was spricht dich am meisten an?