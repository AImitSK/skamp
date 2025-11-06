# Genkit MCP Start Guide

## ⚠️ KRITISCH: Immer mit GENKIT_ENV starten!

### ✅ KORREKT - So starten:

```bash
# Mit watch mode (Development):
GENKIT_ENV=dev npm run genkit:dev

# Ohne watch mode (Testing/Stable):
GENKIT_ENV=dev genkit start -- npx tsx src/genkit-server.ts
```

### ❌ FALSCH - So NICHT starten:

```bash
# ❌ Wird NICHT mit MCP funktionieren:
npm run genkit:dev

# ❌ MCP Tools werden fehlschlagen:
genkit start -- npx tsx src/genkit-server.ts
```

---

## Was passiert ohne GENKIT_ENV?

**Symptome:**
- ❌ `mcp__genkit__run_flow` → Error: "Error running action key='/flow/...'"
- ❌ `mcp__genkit__list_flows` → Kein Output
- ✅ `mcp__genkit__lookup_genkit_docs` → Funktioniert (unabhängig)

**Server:**
- Läuft ohne Fehler
- Alle Flows werden registriert
- Genkit UI funktioniert
- Aber: MCP kann Flows nicht identifizieren/ausführen

---

## Quick Checklist

Bevor du mit MCP testest:

- [ ] Port 3100 frei? (Prüfe mit `netstat -ano | findstr :3100`)
- [ ] Alle alten Genkit Server beendet?
- [ ] `GENKIT_ENV=dev` gesetzt?
- [ ] Server zeigt "Flows registriert: ..." in Logs?
- [ ] Server läuft auf Port 3100 (NICHT 3108 oder höher)?
- [ ] MCP Test: `mcp__genkit__list_flows` zeigt alle Flows?

---

## Troubleshooting

### Problem: MCP list_flows gibt keinen Output zurück

**⚠️ HÄUFIGSTES PROBLEM: Port 3100 blockiert!**

Die MCP Tools erwarten, dass der Genkit Server auf Port 3100 läuft. Wenn ein alter Prozess den Port blockiert, funktionieren die MCP Tools NICHT.

**Symptome:**
- `mcp__genkit__list_flows` → Kein Output (Tool ran without output or errors)
- Server-Logs zeigen: `Port 3100 is already in use, using next available port 3108`
- Server läuft und funktioniert, aber MCP nicht

**Lösung:**

**Schritt 1:** Blockierenden Prozess finden
```bash
netstat -ano | findstr :3100
```

**Schritt 2:** Prozess-ID (PID) identifizieren und killen
```bash
# In der Ausgabe die PID aus der letzten Spalte notieren
# Beispiel: Wenn PID 41872 Port 3100 blockiert:
cmd /c "taskkill /F /PID 41872"
```

**Schritt 3:** Alle laufenden Genkit Server beenden
- Beende alle Background-Bash-Prozesse in Claude Code
- Oder manuell alle `genkit start` Prozesse killen

**Schritt 4:** Sauber neu starten
```bash
GENKIT_ENV=dev genkit start -- npx tsx src/genkit-server.ts
```

**Schritt 5:** Verifizieren
```bash
# Server-Logs sollten zeigen:
# ✅ Genkit Server gestartet!
# 📦 Flows registriert: ...
# OHNE "Port 3100 is already in use"

# MCP testen:
mcp__genkit__list_flows  # Sollte jetzt alle Flows anzeigen
```

### Problem: MCP run_flow schlägt fehl

**Schritt 1:** Server neu starten MIT GENKIT_ENV
```bash
# Alle Shells/Server beenden
# Dann:
GENKIT_ENV=dev npm run genkit:dev
```

**Schritt 2:** Warten bis Server bereit
```
✅ Genkit Server gestartet!
📦 Flows registriert: mergeVariants, generatePressRelease, ...
```

**Schritt 3:** MCP testen
```typescript
mcp__genkit__run_flow('textTransform', '{"action":"rephrase","text":"..."}')
```

### Problem: Watch mode startet Server ohne GENKIT_ENV neu

**Lösung:** Starte OHNE watch mode:
```bash
GENKIT_ENV=dev genkit start -- npx tsx src/genkit-server.ts
```

---

## Warum ist GENKIT_ENV=dev nötig?

MCP Tools benötigen die Environment Variable um:
1. Flows korrekt zu identifizieren
2. Flow-Schemas zu laden
3. Flow-Ausführung zu initialisieren

Ohne diese Variable sind die Flows zwar registriert, aber nicht via MCP aufrufbar.

---

## Package.json Script (Optional)

Füge zu `package.json` hinzu:

```json
{
  "scripts": {
    "genkit:mcp": "GENKIT_ENV=dev npm run genkit:dev",
    "genkit:mcp-stable": "GENKIT_ENV=dev genkit start -- npx tsx src/genkit-server.ts"
  }
}
```

Dann einfach:
```bash
npm run genkit:mcp
```

---

## Änderungshistorie

**2025-11-06 (Update 2):**
- **Problem gelöst:** MCP list_flows gibt keinen Output zurück
- **Root Cause:** Port 3100 blockiert durch alten Prozess
- **Lösung:** Port freigeben mit taskkill, Server neu starten
- **Wichtig:** MCP Tools erwarten Port 3100 explizit

**2025-11-06 (Update 1):**
- **Problem gelöst:** MCP Flow Execution Error
- **Root Cause:** Fehlende GENKIT_ENV Variable
- **Lösung:** Immer mit `GENKIT_ENV=dev` starten
