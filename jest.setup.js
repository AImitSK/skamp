// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock browser-only APIs (only in JSDOM environment)
if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  // Mock HTMLElement.scrollIntoView (not supported by JSDOM)
  HTMLElement.prototype.scrollIntoView = jest.fn()
}

// Mock Firebase Timestamp
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  Timestamp: class Timestamp {
    constructor(seconds, nanoseconds) {
      this.seconds = seconds
      this.nanoseconds = nanoseconds
    }
    toDate() {
      return new Date(this.seconds * 1000)
    }
    static now() {
      return new Timestamp(Date.now() / 1000, 0)
    }
    static fromDate(date) {
      return new Timestamp(date.getTime() / 1000, 0)
    }
  }
}))

// Silence console errors during tests (optional)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}