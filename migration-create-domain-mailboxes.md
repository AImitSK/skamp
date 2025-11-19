# Migration: Domain-Postfächer für bestehende Domains erstellen

## Felder für inbox_domain_mailboxes

```typescript
interface DomainMailbox {
  // Pflichtfelder
  domainId: string;              // Referenz zur Domain aus email_domains
  domain: string;                // Domain-Name (z.B. "xyz.de")
  inboxAddress: string;          // Format: {domain}@inbox.sk-online-marketing.de
  organizationId: string;        // Organization ID
  status: 'active' | 'inactive'; // Status des Postfachs
  unreadCount: number;           // Anzahl ungelesener E-Mails (Start: 0)
  threadCount: number;           // Anzahl Threads (Start: 0)
  createdAt: Timestamp;          // Erstellungsdatum
  updatedAt: Timestamp;          // Letzte Aktualisierung
  createdBy: string;             // User ID (kann "system" sein)

  // Optionale Felder
  isDefault?: boolean;           // Nur für celeropress.com
  isShared?: boolean;            // Nur für celeropress.com
}
```

## Migrations-Script

Erstelle für jede Domain in `email_domains` ein Postfach in `inbox_domain_mailboxes`.

**Beispiel-Mapping:**
```
Domain: xyz.de (id: domain-xyz)
→ Postfach: xyz@inbox.sk-online-marketing.de
→ Collection: inbox_domain_mailboxes
```

**Vorgehen:**
1. Alle Domains aus `email_domains` laden
2. Für jede Domain prüfen, ob Postfach existiert
3. Falls nicht: Postfach erstellen
