# Refactoring-Plan 04: Super-Admin Auth-Prüfung

**Datum:** 25.11.2025
**Status:** Geplant
**Priorität:** Hoch (Sicherheit)

---

## Zusammenfassung

Implementierung einer Auth-Prüfung für alle Admin-API-Endpoints. Aktuell kann **jeder** die Admin-APIs aufrufen - ohne Login, ohne Berechtigung.

---

## Problem

### Aktueller Code (in allen 3 Admin-APIs)

```typescript
// TODO: Implement proper auth check
function isSuperAdmin(userId: string): boolean {
  // Temporär: Alle erlaubt
  return true;  // ← SICHERHEITSPROBLEM!
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Auth Check implementieren
    // const user = await verifyAuth(request);
    // if (!isSuperAdmin(user.uid)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    // ... API-Logik ohne Auth ...
  }
}
```

### Betroffene Endpoints

| Endpoint | Risiko | Beschreibung |
|----------|--------|--------------|
| `GET /api/admin/monitoring-stats` | Mittel | Zeigt alle Org-Daten, Stats, Error Logs |
| `GET /api/admin/crawler-status` | Niedrig | Zeigt Crawler-Status |
| `POST /api/admin/crawler-control` | **Hoch** | Kann Crawler pausieren/triggern |

---

## Lösung

### Option A: Einfache User-Liste (Empfohlen für Start)

```typescript
// src/lib/firebase-admin/super-admin-service.ts

const SUPER_ADMIN_EMAILS = [
  'admin@celeropress.com',
  'stefan@example.com',
  // weitere Super-Admins
];

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return false;

  const userData = userDoc.data();
  return SUPER_ADMIN_EMAILS.includes(userData?.email || '');
}
```

### Option B: Role-basiert (Zukunftssicher)

```typescript
// User-Dokument hat role: 'super_admin' | 'admin' | 'user'

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return false;

  return userDoc.data()?.role === 'super_admin';
}
```

### Option C: Firebase Custom Claims (Best Practice)

```typescript
// Custom Claims beim User setzen (einmalig via Admin SDK)
await admin.auth().setCustomUserClaims(uid, { superAdmin: true });

// In der API prüfen
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const { getAuth } = await import('firebase-admin/auth');
  const user = await getAuth().getUser(userId);
  return user.customClaims?.superAdmin === true;
}
```

---

## Betroffene Dateien

### Zu ändern

1. **`src/app/api/admin/monitoring-stats/route.ts`**
2. **`src/app/api/admin/crawler-status/route.ts`**
3. **`src/app/api/admin/crawler-control/route.ts`**

### Neu zu erstellen

4. **`src/lib/firebase-admin/super-admin-service.ts`** - Zentrale Auth-Logik

---

## Implementierung

### 1. Super-Admin Service erstellen

```typescript
// src/lib/firebase-admin/super-admin-service.ts

import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Für den Start: Einfache E-Mail-Liste
const SUPER_ADMIN_EMAILS = [
  'admin@celeropress.com',
  // Weitere E-Mails hier hinzufügen
];

export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const auth = getAuth();
    const user = await auth.getUser(userId);

    // Prüfe ob E-Mail in der Liste ist
    return SUPER_ADMIN_EMAILS.includes(user.email || '');
  } catch (error) {
    console.error('Super admin check failed:', error);
    return false;
  }
}

export async function verifyAdminRequest(request: NextRequest): Promise<{
  isValid: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    // Token aus Header oder Cookie extrahieren
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return { isValid: false, error: 'No token provided' };
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    const isSuperAdminUser = await isSuperAdmin(decodedToken.uid);

    if (!isSuperAdminUser) {
      return { isValid: false, error: 'Not a super admin' };
    }

    return { isValid: true, userId: decodedToken.uid };
  } catch (error) {
    return { isValid: false, error: 'Invalid token' };
  }
}
```

### 2. API-Endpoints anpassen

```typescript
// src/app/api/admin/monitoring-stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase-admin/super-admin-service';
import { monitoringStatsService } from '@/lib/firebase-admin/monitoring-stats-service';
import { crawlerErrorLogService } from '@/lib/firebase-admin/crawler-error-log-service';

export async function GET(request: NextRequest) {
  // Auth-Prüfung
  const authResult = await verifyAdminRequest(request);
  if (!authResult.isValid) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const [systemStats, organizationStats, channelHealth, errorLogs] = await Promise.all([
      monitoringStatsService.getSystemStats(),
      monitoringStatsService.getOrganizationStats(),
      monitoringStatsService.getChannelHealth(),
      crawlerErrorLogService.getErrorLogs({ limit: 50 })
    ]);

    return NextResponse.json({
      system: systemStats,
      organizations: organizationStats,
      channelHealth,
      errorLogs
    });
  } catch (error: any) {
    console.error('❌ Monitoring stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3. Frontend anpassen (Token mitsenden)

```typescript
// src/app/dashboard/super-admin/monitoring/page.tsx

const loadData = async () => {
  try {
    // Token vom aktuellen User holen
    const token = await user?.getIdToken();

    const [statsResponse, statusResponse] = await Promise.all([
      fetch('/api/admin/monitoring-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('/api/admin/crawler-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    // ... Rest der Logik
  } catch (error) {
    console.error('Error loading monitoring data:', error);
  }
};
```

---

## Checkliste

- [ ] `super-admin-service.ts` erstellen
- [ ] Super-Admin E-Mails konfigurieren
- [ ] `monitoring-stats/route.ts` Auth hinzufügen
- [ ] `crawler-status/route.ts` Auth hinzufügen
- [ ] `crawler-control/route.ts` Auth hinzufügen
- [ ] Frontend: Token in Requests mitsenden
- [ ] Testen: Ohne Token → 403
- [ ] Testen: Mit Token (kein Admin) → 403
- [ ] Testen: Mit Token (Admin) → 200

---

## Risiko-Bewertung

| Risiko | Bewertung | Grund |
|--------|-----------|-------|
| Breaking Changes | Niedrig | Nur Auth-Layer hinzugefügt |
| Aussperrung | Mittel | Super-Admin E-Mails korrekt konfigurieren! |
| Regressions | Niedrig | Keine Logik-Änderungen |

---

## Hinweise

1. **E-Mail-Liste pflegen:** Die SUPER_ADMIN_EMAILS Liste muss manuell gepflegt werden
2. **Später upgraden:** Kann später auf Firebase Custom Claims umgestellt werden
3. **Logging:** Optional: Admin-Aktionen loggen für Audit Trail

---

*Erstellt am 25.11.2025*
