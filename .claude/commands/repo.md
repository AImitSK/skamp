---
description: Repo auf neusten Stand bringen (reset --hard, pull, npm install)
allowed-tools: Bash(git:*), Bash(npm:*)
argument-hint: "[branch]"
---

# Repository synchronisieren

Führe folgende Schritte aus:

1. **Git Reset Hard**: Verwerfe alle lokalen Änderungen
   ```bash
   git reset --hard
   ```

2. **Branch wechseln** (falls angegeben): $ARGUMENTS
   - Wenn ein Branch angegeben wurde, wechsle mit `git checkout <branch>`
   - Wenn nicht, bleibe auf dem aktuellen Branch

3. **Git Pull**: Hole die neuesten Änderungen
   ```bash
   git pull
   ```

4. **NPM Install**: Installiere/aktualisiere Dependencies
   ```bash
   npm install
   ```

5. **Zusammenfassung**: Zeige eine kurze Übersicht:
   - Aktueller Branch
   - Letzter Commit (Hash, Autor, Nachricht)
   - Geänderte Dateien im letzten Commit
   - Nutze: `git log -1 --stat --format="%h - %an: %s (%ar)"`
