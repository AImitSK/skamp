// Konstanten für das Publications Feature

// Labels für Publikationstypen
export const PUBLICATION_TYPE_LABELS: Record<string, string> = {
  newspaper: "Zeitung",
  magazine: "Magazin",
  website: "Website",
  blog: "Blog",
  newsletter: "Newsletter",
  podcast: "Podcast",
  tv: "TV",
  radio: "Radio",
  trade_journal: "Fachzeitschrift",
  press_agency: "Nachrichtenagentur",
  social_media: "Social Media",
  other: "Sonstiges"
};

// Labels für Frequenz
export const FREQUENCY_LABELS: Record<string, string> = {
  continuous: "Durchgehend",
  multiple_daily: "Mehrmals täglich",
  daily: "Täglich",
  weekly: "Wöchentlich",
  biweekly: "14-tägig",
  monthly: "Monatlich",
  bimonthly: "Zweimonatlich",
  quarterly: "Vierteljährlich",
  biannual: "Halbjährlich",
  annual: "Jährlich",
  irregular: "Unregelmäßig"
};

// Labels für Format
export const FORMAT_LABELS: Record<string, string> = {
  print: "Print",
  online: "Digital",
  both: "Print & Digital",
  broadcast: "Broadcast"
};

// Labels für geografischen Scope
export const SCOPE_LABELS: Record<string, string> = {
  local: "Lokal",
  regional: "Regional",
  national: "National",
  international: "International",
  global: "Global"
};

// Pagination
export const PUBLICATIONS_PAGE_SIZE = 25;

// Alert Timeout
export const ALERT_TIMEOUT_MS = 5000;

// CSV Template für Import
export const CSV_IMPORT_TEMPLATE = `Titel,Verlag,Typ,Format,Website,Sprachen,Länder,Auflage,Online Besucher,Themenschwerpunkte,Frequenz,Zielgruppe
Beispiel Magazin,Beispiel Verlag GmbH,magazine,print,https://example.com,"de,en","DE,AT,CH",50000,,"Wirtschaft,Politik",monthly,Führungskräfte
Online Portal,Digital Media AG,website,online,https://portal.com,de,DE,,250000,"Technologie,Innovation",continuous,IT-Professionals`;

// Field Mappings für automatische Erkennung beim Import
export const IMPORT_FIELD_MAPPINGS = {
  title: ['titel', 'title', 'name', 'publikation', 'publication', 'medium', 'medienname'],
  subtitle: ['untertitel', 'subtitle', 'claim', 'slogan'],
  publisherName: ['verlag', 'publisher', 'herausgeber', 'medienhaus', 'company'],
  type: ['typ', 'type', 'art', 'kategorie', 'category'],
  format: ['format', 'kanal', 'channel'],
  websiteUrl: ['website', 'url', 'webseite', 'homepage', 'link'],
  languages: ['sprache', 'sprachen', 'language', 'languages'],
  countries: ['land', 'länder', 'country', 'countries', 'markt', 'märkte'],
  circulation: ['auflage', 'circulation', 'reichweite', 'print auflage'],
  uniqueVisitors: ['unique visitors', 'besucher', 'monthly visitors', 'online reichweite'],
  focusAreas: ['themen', 'topics', 'schwerpunkte', 'focus', 'ressorts', 'bereiche'],
  frequency: ['frequenz', 'frequency', 'erscheinung', 'rhythm', 'periodizität'],
  targetAudience: ['zielgruppe', 'target', 'audience', 'leserschaft'],
  industry: ['branche', 'industry', 'sektor', 'sector']
};

// Select Options
export const PUBLICATION_TYPE_OPTIONS = [
  { value: 'newspaper', label: 'Zeitung' },
  { value: 'magazine', label: 'Magazin' },
  { value: 'website', label: 'Website' },
  { value: 'blog', label: 'Blog' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'tv', label: 'TV' },
  { value: 'radio', label: 'Radio' },
  { value: 'trade_journal', label: 'Fachzeitschrift' },
  { value: 'press_agency', label: 'Nachrichtenagentur' },
  { value: 'social_media', label: 'Social Media' }
];

export const FREQUENCY_OPTIONS = [
  { value: 'continuous', label: 'Durchgehend' },
  { value: 'multiple_daily', label: 'Mehrmals täglich' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'biweekly', label: '14-tägig' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'bimonthly', label: 'Zweimonatlich' },
  { value: 'quarterly', label: 'Quartalsweise' },
  { value: 'biannual', label: 'Halbjährlich' },
  { value: 'annual', label: 'Jährlich' },
  { value: 'irregular', label: 'Unregelmäßig' }
];

export const CIRCULATION_TYPE_OPTIONS = [
  { value: 'distributed', label: 'Verbreitete Auflage' },
  { value: 'sold', label: 'Verkaufte Auflage' },
  { value: 'printed', label: 'Gedruckte Auflage' },
  { value: 'subscribers', label: 'Abonnenten' },
  { value: 'audited_ivw', label: 'IVW geprüft' }
];

export const GEOGRAPHIC_SCOPE_OPTIONS = [
  { value: 'local', label: 'Lokal' },
  { value: 'regional', label: 'Regional' },
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global', label: 'Global' }
];

// Validation
export const VALIDATION = {
  TITLE_MAX_LENGTH: 200,
  SUBTITLE_MAX_LENGTH: 300,
  NOTES_MAX_LENGTH: 2000,
  MIN_CIRCULATION: 1,
  MAX_CIRCULATION: 10000000,
  MIN_PRICE: 0.01,
  MAX_PRICE: 9999.99,
  MIN_BOUNCE_RATE: 0,
  MAX_BOUNCE_RATE: 100,
  MIN_DOMAIN_AUTHORITY: 0,
  MAX_DOMAIN_AUTHORITY: 100
};

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 10,
  ACCEPTED_TYPES: ['.csv', '.xlsx', '.xls'],
  PREVIEW_ROWS: 5
};

// Defaults
export const DEFAULTS = {
  LANGUAGE: 'de',
  COUNTRY: 'DE',
  FREQUENCY: 'monthly',
  FORMAT: 'online',
  TYPE: 'website',
  STATUS: 'active',
  GEOGRAPHIC_SCOPE: 'national',
  CIRCULATION_TYPE: 'distributed',
  GENDER_TARGET: 'all'
} as const;