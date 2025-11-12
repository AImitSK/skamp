// Test setup file for Jest
import 'jest-environment-jsdom';

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

  get(name: string): string | null {
    return super.get(name.toLowerCase()) || null;
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

// Mock window.location (simplified)
try {
  delete (window as any).location;
  (window as any).location = { 
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000'
  };
} catch (e) {
  // Location bereits definiert, ignorieren
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
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn()
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

// Suppress console.log during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
// };