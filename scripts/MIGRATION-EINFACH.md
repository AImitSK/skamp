# CRM Tags Migration - SUPER EINFACH

## 🚀 Schnellste Methode (3 Schritte)

### Schritt 1: In der App einloggen
- Als User der **Ziel-Organization** einloggen
- CRM-Bereich öffnen (egal welche Seite)

### Schritt 2: Browser Console öffnen
```
F12 drücken → Console Tab
```

### Schritt 3: Script ausführen
```javascript
// Kopiere und füge folgenden Code ein:

(async function migrateTags() {
  console.log('🏷️  CRM Tags Migration\n');

  const { db } = await import('/src/lib/firebase/config.ts');
  const { collection, getDocs, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');

  const targetOrgId = localStorage.getItem('currentOrganizationId');
  if (!targetOrgId) {
    console.error('❌ Nicht eingeloggt!');
    return;
  }

  console.log(`🎯 Ziel: ${targetOrgId}\n`);

  try {
    const tagsSnapshot = await getDocs(collection(db, 'tags'));
    const plans = [];

    tagsSnapshot.forEach((docSnap) => {
      const tag = { id: docSnap.id, ...docSnap.data() };
      const orgId = tag.organizationId;
      const looksLikeUserId = orgId && !orgId.startsWith('org_') && orgId.length > 20;

      if (looksLikeUserId) {
        plans.push({ tag, currentOrgId: orgId });
      }
    });

    if (plans.length === 0) {
      console.log('✅ Keine Tags zum Migrieren!\n');
      return;
    }

    console.log(`📊 Gefunden: ${plans.length} Tags:\n`);
    plans.forEach((p, i) => {
      console.log(`${i + 1}. "${p.tag.name}" (${p.tag.color})`);
    });

    if (!confirm(`${plans.length} Tags zu "${targetOrgId}" migrieren?`)) {
      console.log('❌ Abgebrochen.\n');
      return;
    }

    console.log('\n🚀 Migriere...\n');

    for (const plan of plans) {
      const tagRef = doc(db, 'tags', plan.tag.id);
      await updateDoc(tagRef, {
        organizationId: targetOrgId,
        updatedAt: serverTimestamp(),
        _migratedFrom: plan.currentOrgId,
        _migratedAt: serverTimestamp()
      });
      console.log(`✅ "${plan.tag.name}"`);
    }

    console.log('\n✅ Fertig! Seite neu laden.\n');
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
})();
```

### Das war's! 🎉

Die Tags sollten jetzt in der CRM-Tabelle sichtbar sein (nach Seiten-Reload).

---

## Warum ist das so einfach?

- ✅ Nutzt deine aktuelle Auth-Session
- ✅ Keine Service Account Keys nötig
- ✅ Keine zusätzlichen Tools
- ✅ Funktioniert direkt im Browser

---

## Troubleshooting

### "Cannot find module '/src/lib/firebase/config.ts'"
→ Stelle sicher, dass du auf einer Seite der App bist (nicht Firebase Console)

### "Permission denied"
→ Stelle sicher, dass du als User der Ziel-Organization eingeloggt bist

### "Keine Tags gefunden"
→ Alle Tags haben bereits korrekte organizationId ✅

---

**Das war's!** Viel einfacher als Service Account Keys! 😊
