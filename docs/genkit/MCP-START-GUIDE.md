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

- [ ] `GENKIT_ENV=dev` gesetzt?
- [ ] Server zeigt "Flows registriert: ..." in Logs?
- [ ] Port-Konflikte behoben (keine parallelen Server)?
- [ ] MCP Test: `mcp__genkit__lookup_genkit_docs` funktioniert?

---

## Troubleshooting

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

**Stand:** 2025-11-06
**Problem gelöst:** MCP Flow Execution Error
**Root Cause:** Fehlende GENKIT_ENV Variable
