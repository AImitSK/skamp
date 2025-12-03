// Test setup file for Jest
import 'jest-environment-jsdom';

// Polyfill setImmediate for jsdom environment
if (typeof setImmediate === 'undefined') {
  global.setImmediate = ((callback: (...args: any[]) => void, ...args: any[]) => {
    return setTimeout(callback, 0, ...args);
  }) as unknown as typeof setImmediate;
}

// Mock fetch for Firebase Auth
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  })
) as jest.Mock;

// Mock Request for Next.js Server APIs
global.Request = class Request {
  private _url: string;
  private _method: string;
  private _headers: Map<string, string>;
  private _body: any;

  constructor(url: string | URL, init?: RequestInit) {
    this._url = typeof url === 'string' ? url : url.toString();
    this._method = init?.method || 'GET';
    this._headers = new Map();

    if (init?.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          this._headers.set(key.toLowerCase(), value);
        }
      });
    }

    this._body = init?.body;
  }

  get url() { return this._url; }
  get method() { return this._method; }
  get headers() { return this._headers; }
  get body() { return this._body; }

  json() {
    return Promise.resolve(JSON.parse(this._body as string));
  }

  text() {
    return Promise.resolve(String(this._body));
  }

  clone() {
    return new Request(this._url, {
      method: this._method,
      headers: Object.fromEntries(this._headers),
      body: this._body
    });
  }
} as any;

// Mock Response for Next.js Server APIs and Firebase
global.Response = class Response {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Map<string, string>;
  body: any;

  constructor(body?: any, init?: ResponseInit) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Map();

    if (init?.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          this.headers.set(key.toLowerCase(), value);
        }
      });
    }
  }

  json() {
    if (typeof this.body === 'string') {
      return Promise.resolve(JSON.parse(this.body));
    }
    return Promise.resolve(this.body);
  }

  text() {
    return Promise.resolve(String(this.body));
  }

  clone() {
    return new Response(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: Object.fromEntries(this.headers)
    });
  }

  static json(data: any, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init?.headers
      }
    });
  }
} as any;

// Mock Headers for Next.js Server APIs
global.Headers = class Headers extends Map<string, string> {
  constructor(init?: Record<string, string> | [string, string][] | Headers) {
    super();

    if (init) {
      if (init instanceof Headers || init instanceof Map) {
        init.forEach((value, key) => {
          this.set(key.toLowerCase(), value);
        });
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => {
          this.set(key.toLowerCase(), value);
        });
      } else {
        Object.entries(init).forEach(([key, value]) => {
          this.set(key.toLowerCase(), value);
        });
      }
    }
  }

  // Override get mit kompatiblen Typen
  override get(name: string): string | undefined {
    return super.get(name.toLowerCase());
  }

  set(name: string, value: string): this {
    return super.set(name.toLowerCase(), value);
  }

  has(name: string): boolean {
    return super.has(name.toLowerCase());
  }

  delete(name: string): boolean {
    return super.delete(name.toLowerCase());
  }

  append(name: string, value: string): void {
    const existing = this.get(name);
    if (existing) {
      this.set(name, `${existing}, ${value}`);
    } else {
      this.set(name, value);
    }
  }
} as any;

// Mock crypto for sharing IDs
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-12345678',
  },
});

// Mock window.location (sicher für jsdom)
// jsdom erlaubt keine Neudefinition von location, daher nur fehlende Properties hinzufügen
if (typeof window !== 'undefined' && window.location) {
  // Füge nur fehlende Methoden hinzu, ohne location komplett zu überschreiben
  if (!window.location.assign) {
    Object.defineProperty(window.location, 'assign', {
      value: jest.fn(),
      writable: true,
    });
  }
  if (!window.location.replace) {
    Object.defineProperty(window.location, 'replace', {
      value: jest.fn(),
      writable: true,
    });
  }
  if (!window.location.reload) {
    Object.defineProperty(window.location, 'reload', {
      value: jest.fn(),
      writable: true,
    });
  }
}

// Mock Image for asset validation
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  
  set src(value: string) {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
} as any;

// Mock ResizeObserver for Headless UI components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Fix for React 18 Testing Library createRoot issue in JSDOM
// This is a known issue with React 18 + JSDOM + Testing Library
// For now, we'll handle this in individual test files if needed

// Mock Firebase completely for tests
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' }))
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  endBefore: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0, toDate: () => new Date() })),
    fromDate: jest.fn((date: Date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
      toDate: () => date
    })),
    fromMillis: jest.fn((ms: number) => ({
      seconds: Math.floor(ms / 1000),
      nanoseconds: 0,
      toDate: () => new Date(ms)
    })),
  },
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
    increment: jest.fn((n: number) => n),
    arrayUnion: jest.fn((...items: any[]) => items),
    arrayRemove: jest.fn((...items: any[]) => items),
    delete: jest.fn(),
  },
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({
    ref: jest.fn(() => ({
      child: jest.fn(),
      fullPath: '/mock/path'
    }))
  })),
  ref: jest.fn(() => ({
    child: jest.fn(),
    fullPath: '/mock/path'
  })),
  uploadBytes: jest.fn(() => Promise.resolve({
    metadata: { fullPath: '/mock/path/file.jpg', name: 'file.jpg', size: 1024 },
    ref: {}
  })),
  uploadBytesResumable: jest.fn(() => ({
    on: jest.fn(),
    snapshot: { bytesTransferred: 0, totalBytes: 100 }
  })),
  getDownloadURL: jest.fn(() => Promise.resolve('https://mock-storage.com/file.jpg')),
  deleteObject: jest.fn(() => Promise.resolve()),
  listAll: jest.fn(() => Promise.resolve({ items: [], prefixes: [] })),
  getMetadata: jest.fn(() => Promise.resolve({ name: 'file.jpg', size: 1024 }))
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => jest.fn()),
  connectFunctionsEmulator: jest.fn()
}));

// Mock nanoid to prevent ES module issues
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-nanoid-12345'),
}));

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  useParams: jest.fn(() => ({
    campaignId: 'test-campaign-123',
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
    has: jest.fn(() => false),
  })),
  usePathname: jest.fn(() => '/dashboard/pr-tools/campaigns'),
}));

// Mock TipTap Editor für Komponenten die den Editor verwenden
const createMockChain = (): any => {
  const chain: any = {
    focus: jest.fn(),
    toggleBold: jest.fn(),
    toggleItalic: jest.fn(),
    toggleUnderline: jest.fn(),
    toggleStrike: jest.fn(),
    toggleHeading: jest.fn(),
    toggleBulletList: jest.fn(),
    toggleOrderedList: jest.fn(),
    toggleBlockquote: jest.fn(),
    toggleHashtag: jest.fn(),
    toggleCTA: jest.fn(),
    setLink: jest.fn(),
    unsetLink: jest.fn(),
    setColor: jest.fn(),
    setMark: jest.fn(),
    clearNodes: jest.fn(),
    unsetAllMarks: jest.fn(),
    setTextAlign: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    run: jest.fn(),
  };

  // Setze alle mockReturnValue nach der Deklaration
  Object.keys(chain).forEach(key => {
    if (key !== 'run') {
      chain[key].mockReturnValue(chain);
    }
  });

  return chain;
};

// Proxy für dynamischen Zugriff auf can() Methoden
const createCanProxy = () => {
  return new Proxy({}, {
    get: (target, prop) => {
      // Alle can() Aufrufe geben eine Funktion zurück die true zurückgibt
      return jest.fn(() => true);
    }
  });
};

const mockEditor = {
  commands: {
    setContent: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    clearContent: jest.fn(),
    insertContent: jest.fn(),
    setTextSelection: jest.fn(),
    toggleBold: jest.fn(),
    toggleItalic: jest.fn(),
    toggleUnderline: jest.fn(),
    toggleStrike: jest.fn(),
    toggleHeading: jest.fn(),
    toggleBulletList: jest.fn(),
    toggleOrderedList: jest.fn(),
    toggleBlockquote: jest.fn(),
    toggleHashtag: jest.fn(),
    toggleCTA: jest.fn(),
    setLink: jest.fn(),
    unsetLink: jest.fn(),
    setColor: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
  },
  can: jest.fn(() => createCanProxy()),
  isActive: jest.fn((name?: string) => false),
  getAttributes: jest.fn((name: string) => ({})),
  getHTML: jest.fn(() => '<p>Test content</p>'),
  getText: jest.fn(() => 'Test content'),
  getJSON: jest.fn(() => ({ type: 'doc', content: [] })),
  isEmpty: false,
  isEditable: true,
  isFocused: false,
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
  chain: jest.fn(() => createMockChain()),
};

jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => mockEditor),
  EditorContent: jest.fn(({ editor }) => null),
  BubbleMenu: jest.fn(() => null),
  FloatingMenu: jest.fn(() => null),
}));

// React Query: Kein globaler Mock - Tests die QueryClient brauchen müssen
// entweder einen Provider einrichten oder die test-utils.tsx verwenden
// Import: import { renderWithProviders } from '@/__tests__/test-utils'

// Suppress console.log during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
// };