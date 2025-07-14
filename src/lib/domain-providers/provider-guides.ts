// src/lib/domain-providers/provider-guides.ts

/**
 * Struktur für einen Anleitungsschritt
 */
export interface GuideStep {
  title: string;
  description: string;
  screenshots?: string[];
  warning?: string;
  tip?: string;
}

/**
 * Struktur für häufige Probleme und Lösungen
 */
export interface CommonIssue {
  problem: string;
  solution: string;
}

/**
 * Struktur für einen Provider-Guide
 */
export interface ProviderGuide {
  id: string;
  name: string;
  logo?: string;
  supportUrl: string;
  steps: GuideStep[];
  videoUrl?: string;
  commonIssues: CommonIssue[];
}

/**
 * Provider-spezifische Anleitungen
 */
export const providerGuides: Record<string, ProviderGuide> = {
  ionos: {
    id: 'ionos',
    name: 'IONOS (1&1)',
    logo: '/images/providers/ionos.svg',
    supportUrl: 'https://www.ionos.de/hilfe/domains/dns-einstellungen-konfigurieren/cname-record-fuer-eine-subdomain-einrichten/',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder - sollte durch echtes Tutorial ersetzt werden
    steps: [
      {
        title: 'Einloggen im IONOS Control-Center',
        description: 'Melden Sie sich unter login.ionos.de mit Ihren Zugangsdaten an.\n\nFalls Sie Ihre Zugangsdaten vergessen haben, können Sie diese über "Passwort vergessen?" zurücksetzen.',
        screenshots: ['/images/guides/ionos/step1.png']
      },
      {
        title: 'Domain & SSL → Domains',
        description: 'Klicken Sie im Hauptmenü auf "Domain & SSL" und dann auf "Domains".\n\nHier sehen Sie eine Übersicht all Ihrer Domains.',
        screenshots: ['/images/guides/ionos/step2.png']
      },
      {
        title: 'Domain auswählen',
        description: 'Klicken Sie auf das Zahnrad-Symbol neben Ihrer Domain und wählen Sie "DNS".\n\nAlternativ können Sie auch direkt auf die Domain klicken und dann "DNS-Einstellungen" wählen.',
        screenshots: ['/images/guides/ionos/step3.png'],
        tip: 'Falls Sie mehrere Domains haben, achten Sie darauf, die richtige auszuwählen. Die Domain sollte genau mit der in SKAMP eingegebenen übereinstimmen.'
      },
      {
        title: 'CNAME-Einträge hinzufügen',
        description: 'Klicken Sie auf "Eintrag hinzufügen" und wählen Sie "CNAME" als Typ.\n\nSie müssen insgesamt 3 CNAME-Einträge anlegen.',
        screenshots: ['/images/guides/ionos/step4.png']
      },
      {
        title: 'Werte eintragen',
        description: 'Kopieren Sie die Werte aus SKAMP:\n\n• **Hostname**: Nur den Teil VOR Ihrer Domain\n• **Verweist auf**: Den kompletten Zielwert\n\nBeispiel:\nWenn der Hostname "em123.ihre-domain.de" ist, tragen Sie nur "em123" ein.',
        screenshots: ['/images/guides/ionos/step5.png'],
        warning: 'IONOS fügt Ihre Domain automatisch hinzu. Tragen Sie NICHT die komplette Subdomain ein, sonst entsteht "em123.ihre-domain.de.ihre-domain.de"!'
      },
      {
        title: 'Speichern und warten',
        description: 'Klicken Sie auf "Speichern" für jeden Eintrag.\n\nDie Änderungen sind normalerweise innerhalb von 5-15 Minuten aktiv, können aber in seltenen Fällen bis zu 48 Stunden dauern.',
        tip: 'Sie können den Status direkt in SKAMP überprüfen. Klicken Sie dazu auf "DNS-Status prüfen".'
      }
    ],
    commonIssues: [
      {
        problem: 'IONOS zeigt "Hostname bereits vorhanden" an',
        solution: 'Löschen Sie den bestehenden Eintrag oder bearbeiten Sie ihn, statt einen neuen anzulegen. Klicken Sie dazu auf das Stift-Symbol neben dem Eintrag.'
      },
      {
        problem: 'Die Verifizierung schlägt nach 30 Minuten immer noch fehl',
        solution: 'Prüfen Sie, ob Sie wirklich nur den ersten Teil (z.B. "em123") statt der kompletten Subdomain eingetragen haben. IONOS fügt den Domain-Teil automatisch hinzu.'
      },
      {
        problem: 'Ich sehe keine DNS-Einstellungen',
        solution: 'Möglicherweise nutzen Sie externe Nameserver. Prüfen Sie unter "Nameserver & DNS" ob "IONOS Nameserver verwenden" aktiviert ist.'
      }
    ]
  },

  strato: {
    id: 'strato',
    name: 'STRATO',
    logo: '/images/providers/strato.svg',
    supportUrl: 'https://www.strato.de/faq/domains/so-aendern-sie-ihre-dns-eintraege-im-strato-kunden-login/',
    steps: [
      {
        title: 'Login im STRATO Kunden-Login',
        description: 'Melden Sie sich unter www.strato.de/apps/CustomerService mit Ihrer Kundennummer und Ihrem Passwort an.',
        screenshots: ['/images/guides/strato/step1.png']
      },
      {
        title: 'Domainverwaltung öffnen',
        description: 'Wählen Sie im Hauptmenü "Domainverwaltung" aus.\n\nHier sehen Sie alle Ihre Domains aufgelistet.',
        screenshots: ['/images/guides/strato/step2.png']
      },
      {
        title: 'Domain-Einstellungen',
        description: 'Klicken Sie bei der gewünschten Domain auf "Einstellungen" (Zahnrad-Symbol).',
        screenshots: ['/images/guides/strato/step3.png']
      },
      {
        title: 'DNS-Verwaltung',
        description: 'Wählen Sie "Nameserver- / DNS-Einstellungen" und dann "DNS-Einstellungen bearbeiten".\n\nAktivieren Sie "Erweiterte Einstellungen", falls noch nicht geschehen.',
        screenshots: ['/images/guides/strato/step4.png'],
        tip: 'Falls Sie die Option nicht sehen, stellen Sie sicher, dass "STRATO Nameserver" aktiviert ist.'
      },
      {
        title: 'CNAME-Records anlegen',
        description: 'Klicken Sie auf "Neuer Eintrag" und wählen Sie "CNAME" als Record-Typ.\n\nTragen Sie die Werte aus SKAMP ein:\n\n• **Subdomain**: Der komplette Hostname\n• **Ziel**: Der Zielwert mit Punkt am Ende',
        screenshots: ['/images/guides/strato/step5.png'],
        warning: 'Bei STRATO müssen Sie den kompletten Hostname inklusive Domain eingeben. Der Punkt am Ende des Zielwerts ist wichtig!'
      },
      {
        title: 'Änderungen übernehmen',
        description: 'Klicken Sie auf "Einstellungen übernehmen" nachdem Sie alle 3 CNAME-Einträge angelegt haben.\n\nDie Aktivierung dauert normalerweise 15-30 Minuten.',
        screenshots: ['/images/guides/strato/step6.png']
      }
    ],
    commonIssues: [
      {
        problem: 'Die Option "DNS-Einstellungen" ist nicht sichtbar',
        solution: 'Stellen Sie sicher, dass Sie die STRATO-Nameserver verwenden. Bei externen Nameservern müssen Sie die Einträge dort vornehmen.'
      },
      {
        problem: 'Fehlermeldung "Ungültiger Hostname"',
        solution: 'Prüfen Sie, ob Sie Leerzeichen oder Sonderzeichen im Hostname haben. Erlaubt sind nur Buchstaben, Zahlen, Punkte und Bindestriche.'
      },
      {
        problem: 'Die Einträge werden nicht gespeichert',
        solution: 'Vergessen Sie nicht, auf "Einstellungen übernehmen" zu klicken. Die Einträge werden erst dann aktiviert.'
      }
    ]
  },

  all_inkl: {
    id: 'all_inkl',
    name: 'ALL-INKL.COM',
    logo: '/images/providers/all-inkl.svg',
    supportUrl: 'https://all-inkl.com/wichtig/anleitungen/kas/tools/dns-einstellungen/',
    steps: [
      {
        title: 'KAS Login',
        description: 'Melden Sie sich im KAS (Kunden-Administrations-System) unter kas.all-inkl.com an.',
        screenshots: ['/images/guides/all-inkl/step1.png']
      },
      {
        title: 'Domain-Verwaltung',
        description: 'Klicken Sie im Menü auf "Domain" und dann auf "DNS-Einstellungen".',
        screenshots: ['/images/guides/all-inkl/step2.png']
      },
      {
        title: 'Domain auswählen',
        description: 'Wählen Sie Ihre Domain aus der Liste aus und klicken Sie auf "Bearbeiten".',
        screenshots: ['/images/guides/all-inkl/step3.png']
      },
      {
        title: 'CNAME hinzufügen',
        description: 'Klicken Sie auf "Neuer Eintrag" und wählen Sie:\n\n• **Typ**: CNAME\n• **Name**: Nur die Subdomain (z.B. "em123")\n• **Ziel**: Der komplette Zielwert',
        screenshots: ['/images/guides/all-inkl/step4.png'],
        tip: 'ALL-INKL fügt Ihre Domain automatisch zum Namen hinzu.'
      },
      {
        title: 'Alle Einträge anlegen',
        description: 'Wiederholen Sie den Vorgang für alle 3 CNAME-Einträge aus SKAMP.\n\nKlicken Sie nach jedem Eintrag auf "Speichern".',
        screenshots: ['/images/guides/all-inkl/step5.png']
      },
      {
        title: 'Fertigstellen',
        description: 'Die DNS-Einträge sind sofort aktiv, die weltweite Verteilung kann aber bis zu 24 Stunden dauern.',
        tip: 'Testen Sie die Einträge nach etwa 15 Minuten in SKAMP.'
      }
    ],
    commonIssues: [
      {
        problem: 'Der Name wird doppelt angezeigt',
        solution: 'Geben Sie nur die Subdomain ohne Ihre Domain ein. ALL-INKL fügt den Domain-Teil automatisch hinzu.'
      },
      {
        problem: 'Fehlermeldung beim Speichern',
        solution: 'Prüfen Sie, ob das Ziel mit einem Punkt endet. Dies ist bei CNAME-Einträgen erforderlich.'
      }
    ]
  },

  hetzner: {
    id: 'hetzner',
    name: 'Hetzner',
    logo: '/images/providers/hetzner.svg',
    supportUrl: 'https://docs.hetzner.com/de/dns-console/dns/general/dns-records/',
    steps: [
      {
        title: 'DNS Console öffnen',
        description: 'Melden Sie sich unter dns.hetzner.com mit Ihren Hetzner-Zugangsdaten an.',
        screenshots: ['/images/guides/hetzner/step1.png']
      },
      {
        title: 'Zone auswählen',
        description: 'Wählen Sie Ihre Domain (Zone) aus der Liste aus.',
        screenshots: ['/images/guides/hetzner/step2.png']
      },
      {
        title: 'Record hinzufügen',
        description: 'Klicken Sie auf "Add Record" und wählen Sie "CNAME" als Type.',
        screenshots: ['/images/guides/hetzner/step3.png']
      },
      {
        title: 'CNAME-Daten eingeben',
        description: 'Tragen Sie die Werte ein:\n\n• **Name**: Die Subdomain (z.B. "@" für Root oder "em123")\n• **Value**: Der Zielwert aus SKAMP\n• **TTL**: 3600 (Standard)',
        screenshots: ['/images/guides/hetzner/step4.png'],
        warning: 'Der Value muss mit einem Punkt enden (z.B. "sendgrid.net.").'
      },
      {
        title: 'Speichern',
        description: 'Klicken Sie auf "Add Record" und wiederholen Sie den Vorgang für alle 3 Einträge.\n\nDie Änderungen sind sofort aktiv.',
        screenshots: ['/images/guides/hetzner/step5.png']
      }
    ],
    commonIssues: [
      {
        problem: 'Invalid record value',
        solution: 'Stellen Sie sicher, dass der CNAME-Wert mit einem Punkt endet.'
      },
      {
        problem: 'Record already exists',
        solution: 'Löschen Sie den bestehenden Record oder bearbeiten Sie ihn über das Stift-Symbol.'
      }
    ]
  },

  godaddy: {
    id: 'godaddy',
    name: 'GoDaddy',
    logo: '/images/providers/godaddy.svg',
    supportUrl: 'https://de.godaddy.com/help/cname-records-hinzufugen-19236',
    steps: [
      {
        title: 'Mein Konto aufrufen',
        description: 'Melden Sie sich bei GoDaddy an und gehen Sie zu "Meine Produkte".',
        screenshots: ['/images/guides/godaddy/step1.png']
      },
      {
        title: 'DNS verwalten',
        description: 'Suchen Sie Ihre Domain und klicken Sie auf "DNS" oder "DNS verwalten".',
        screenshots: ['/images/guides/godaddy/step2.png']
      },
      {
        title: 'Eintrag hinzufügen',
        description: 'Klicken Sie auf "Hinzufügen" und wählen Sie "CNAME" aus dem Dropdown-Menü.',
        screenshots: ['/images/guides/godaddy/step3.png']
      },
      {
        title: 'CNAME-Details',
        description: 'Füllen Sie die Felder aus:\n\n• **Host**: Die Subdomain ohne Ihre Domain\n• **Verweist auf**: Der Zielwert\n• **TTL**: 1 Stunde (Standard)',
        screenshots: ['/images/guides/godaddy/step4.png'],
        tip: 'GoDaddy fügt Ihre Domain automatisch hinzu. Geben Sie nur den ersten Teil ein.'
      },
      {
        title: 'Speichern',
        description: 'Klicken Sie auf "Speichern" und wiederholen Sie dies für alle 3 Einträge.\n\nÄnderungen können bis zu 48 Stunden dauern, sind aber meist nach 1 Stunde aktiv.',
        screenshots: ['/images/guides/godaddy/step5.png']
      }
    ],
    commonIssues: [
      {
        problem: 'Der Host-Name wird abgelehnt',
        solution: 'Entfernen Sie Ihre Domain aus dem Host-Feld. GoDaddy fügt diese automatisch hinzu.'
      },
      {
        problem: 'Änderungen werden nicht übernommen',
        solution: 'Leeren Sie Ihren Browser-Cache oder versuchen Sie es in einem anderen Browser.'
      }
    ]
  },

  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare',
    logo: '/images/providers/cloudflare.svg',
    supportUrl: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
    steps: [
      {
        title: 'Dashboard öffnen',
        description: 'Melden Sie sich bei dash.cloudflare.com an und wählen Sie Ihre Domain aus.',
        screenshots: ['/images/guides/cloudflare/step1.png']
      },
      {
        title: 'DNS-Einstellungen',
        description: 'Klicken Sie im linken Menü auf "DNS" → "Records".',
        screenshots: ['/images/guides/cloudflare/step2.png']
      },
      {
        title: 'Record hinzufügen',
        description: 'Klicken Sie auf "Add record" und wählen Sie:\n\n• **Type**: CNAME\n• **Name**: Die Subdomain\n• **Target**: Der Zielwert',
        screenshots: ['/images/guides/cloudflare/step3.png'],
        warning: 'Stellen Sie sicher, dass die Proxy-Option (orangene Wolke) DEAKTIVIERT ist für E-Mail-Records!'
      },
      {
        title: 'Proxy deaktivieren',
        description: 'Klicken Sie auf die orangene Wolke, sodass sie grau wird.\n\nDies ist wichtig, da E-Mail-Records nicht über Cloudflare proxy laufen dürfen.',
        screenshots: ['/images/guides/cloudflare/step4.png']
      },
      {
        title: 'Speichern',
        description: 'Klicken Sie auf "Save" und wiederholen Sie dies für alle 3 Records.\n\nÄnderungen sind normalerweise innerhalb von 5 Minuten weltweit aktiv.',
        screenshots: ['/images/guides/cloudflare/step5.png']
      }
    ],
    commonIssues: [
      {
        problem: 'E-Mails funktionieren nicht',
        solution: 'Stellen Sie sicher, dass die Proxy-Funktion (orangene Wolke) für alle E-Mail-bezogenen Records deaktiviert ist.'
      },
      {
        problem: 'Record wird nicht gefunden',
        solution: 'Warten Sie 5-10 Minuten nach dem Speichern. Cloudflare-Änderungen brauchen manchmal etwas Zeit.'
      }
    ]
  }
};

/**
 * Generische Anleitung für unbekannte Provider
 */
export const genericGuide: ProviderGuide = {
  id: 'generic',
  name: 'Allgemeine Anleitung',
  supportUrl: '',
  steps: [
    {
      title: 'DNS-Verwaltung Ihres Providers öffnen',
      description: 'Loggen Sie sich bei Ihrem Domain-Provider ein und suchen Sie nach einem der folgenden Menüpunkte:\n\n• DNS-Einstellungen\n• DNS-Verwaltung\n• Nameserver-Einstellungen\n• Zone Editor\n• Domain-Einstellungen\n• Erweiterte Einstellungen',
      tip: 'Die DNS-Verwaltung finden Sie meist unter "Domains", "Hosting" oder "Einstellungen". Bei manchen Providern müssen Sie erst "Erweiterte Ansicht" aktivieren.'
    },
    {
      title: 'Neuen CNAME-Eintrag erstellen',
      description: 'Suchen Sie nach einer Option wie:\n\n• "Eintrag hinzufügen"\n• "Add Record"\n• "Neuer DNS-Eintrag"\n• "+ Hinzufügen"\n\nWählen Sie als Typ "CNAME" aus.',
      tip: 'CNAME steht für "Canonical Name" und leitet eine Subdomain auf eine andere Domain um.'
    },
    {
      title: 'Werte eintragen',
      description: 'Kopieren Sie die Werte aus SKAMP:\n\n• **Name/Host/Subdomain**: Der Hostname aus SKAMP\n• **Wert/Target/Points to/Ziel**: Der Zielwert aus SKAMP\n• **TTL**: 3600 oder 1 Stunde (falls gefragt)',
      warning: 'Manche Provider fügen Ihre Domain automatisch hinzu. Wenn der Hostname "em123.ihre-domain.de" ist und Ihr Provider nach "Subdomain" fragt, geben Sie nur "em123" ein.'
    },
    {
      title: 'Testen Sie beide Varianten',
      description: 'Falls die Verifizierung fehlschlägt, versuchen Sie:\n\n**Variante 1**: Nur die Subdomain (z.B. "em123")\n**Variante 2**: Der komplette Hostname (z.B. "em123.ihre-domain.de")\n\nJeder Provider handhabt dies anders.',
      tip: 'Machen Sie einen Screenshot der Einstellungen, bevor Sie speichern. So können Sie bei Problemen leicht nachvollziehen, was Sie eingetragen haben.'
    },
    {
      title: 'Alle drei Einträge anlegen',
      description: 'Wiederholen Sie den Vorgang für alle drei CNAME-Einträge aus SKAMP.\n\nDie Reihenfolge spielt keine Rolle, aber alle drei müssen angelegt werden.',
      tip: 'Kopieren Sie am besten alle Werte zuerst in einen Texteditor, dann können Sie sie einfach übertragen.'
    },
    {
      title: 'Änderungen speichern',
      description: 'Speichern Sie die Änderungen. Bei manchen Providern müssen Sie:\n\n• Auf "Speichern" oder "Save" klicken\n• Die Änderungen "aktivieren" oder "publizieren"\n• Eine Bestätigung per E-Mail durchführen\n\nDie Aktivierung dauert meist 5-60 Minuten.',
      tip: 'Notieren Sie sich die Zeit, wann Sie die Änderungen gespeichert haben. So wissen Sie, ab wann Sie mit der Aktivierung rechnen können.'
    }
  ],
  commonIssues: [
    {
      problem: 'Ich finde die DNS-Einstellungen nicht',
      solution: 'Kontaktieren Sie den Support Ihres Providers und fragen Sie nach "CNAME-Einträgen für E-Mail-Authentifizierung". Die meisten Support-Teams können Ihnen den genauen Weg zeigen.'
    },
    {
      problem: 'Soll ich den Punkt am Ende mit eingeben?',
      solution: 'Ja, wenn Ihr Provider ein Feld für den kompletten Wert hat. Der Punkt kennzeichnet eine absolute Adresse. Wenn unsicher, probieren Sie es erst mit Punkt.'
    },
    {
      problem: 'Es gibt verschiedene TTL-Optionen',
      solution: 'Wählen Sie 3600 Sekunden (1 Stunde) oder die Standard-Einstellung. Der TTL-Wert bestimmt, wie lange DNS-Server den Eintrag zwischenspeichern.'
    },
    {
      problem: 'Die Verifizierung schlägt immer fehl',
      solution: 'Warten Sie mindestens 30 Minuten nach dem Speichern. Prüfen Sie dann, ob Sie wirklich alle 3 Einträge korrekt angelegt haben. Häufige Fehler sind Tippfehler oder fehlende Punkte.'
    },
    {
      problem: 'Ich nutze externe Nameserver',
      solution: 'Wenn Sie externe Nameserver (z.B. von einem anderen Hosting-Provider) nutzen, müssen Sie die DNS-Einträge dort anlegen, nicht bei Ihrem Domain-Registrar.'
    }
  ]
};

/**
 * Hilfsfunktion: Provider-Guide abrufen
 */
export function getProviderGuide(providerId: string | null): ProviderGuide {
  if (!providerId) {
    return genericGuide;
  }
  
  return providerGuides[providerId] || genericGuide;
}

/**
 * Hilfsfunktion: Alle Provider als Array
 */
export function getAllProviders(): Array<{ id: string; name: string; logo?: string }> {
  return Object.values(providerGuides).map(guide => ({
    id: guide.id,
    name: guide.name,
    logo: guide.logo
  }));
}

/**
 * Provider-spezifische DNS-Hinweise
 */
export const providerDnsHints: Record<string, { subdomainOnly: boolean; trailingDot: boolean; hint: string }> = {
  ionos: {
    subdomainOnly: true,
    trailingDot: false,
    hint: 'Nur Subdomain eingeben (z.B. "em123"), IONOS fügt die Domain automatisch hinzu'
  },
  strato: {
    subdomainOnly: false,
    trailingDot: true,
    hint: 'Kompletten Hostname eingeben, Punkt am Ende des Zielwerts nicht vergessen'
  },
  all_inkl: {
    subdomainOnly: true,
    trailingDot: true,
    hint: 'Nur Subdomain eingeben, Zielwert mit Punkt am Ende'
  },
  hetzner: {
    subdomainOnly: true,
    trailingDot: true,
    hint: 'Subdomain oder @ für Root, Zielwert muss mit Punkt enden'
  },
  godaddy: {
    subdomainOnly: true,
    trailingDot: false,
    hint: 'Nur Subdomain eingeben, GoDaddy fügt Domain automatisch hinzu'
  },
  cloudflare: {
    subdomainOnly: true,
    trailingDot: false,
    hint: 'Proxy (orangene Wolke) muss deaktiviert sein!'
  }
};

/**
 * Video-Tutorial URLs (Placeholder - sollten durch echte Videos ersetzt werden)
 */
export const providerVideos: Record<string, string> = {
  ionos: 'https://www.youtube.com/embed/ionos-dns-tutorial',
  strato: 'https://www.youtube.com/embed/strato-dns-tutorial',
  all_inkl: 'https://www.youtube.com/embed/all-inkl-dns-tutorial',
  hetzner: 'https://www.youtube.com/embed/hetzner-dns-tutorial',
  godaddy: 'https://www.youtube.com/embed/godaddy-dns-tutorial',
  cloudflare: 'https://www.youtube.com/embed/cloudflare-dns-tutorial'
};