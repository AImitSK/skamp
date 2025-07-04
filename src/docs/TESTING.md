# Testing Guide

## 🧪 Testing bei SKAMP

Dieser Guide beschreibt unsere Testing-Strategie, Tools und Best Practices für die Qualitätssicherung von SKAMP.

## 📋 Inhaltsverzeichnis

- [Testing-Philosophie](#testing-philosophie)
- [Testing-Pyramide](#testing-pyramide)
- [Test-Setup](#test-setup)
- [Unit Tests](#unit-tests)
- [Component Tests](#component-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Testing Best Practices](#testing-best-practices)
- [CI/CD Integration](#cicd-integration)
- [Test Coverage](#test-coverage)
- [Performance Testing](#performance-testing)

## 🎯 Testing-Philosophie

Bei SKAMP folgen wir diesen Testing-Prinzipien:

1. **Test Early, Test Often**: Tests werden parallel zum Code geschrieben
2. **Testing Trophy**: Fokus auf Integration Tests (nicht Testing Pyramid)
3. **User-Centric**: Tests simulieren echte Nutzer-Interaktionen
4. **Fast Feedback**: Tests müssen schnell laufen
5. **Maintainable**: Tests sind Code - sie müssen wartbar sein

## 📊 Testing-Pyramide

```
         E2E Tests (5%)
        /           \
       /             \
      Integration (25%)
     /               \
    /                 \
   Component Tests (30%)
  /                     \
 /                       \
Unit Tests (40%)
```

## 🛠 Test-Setup

### Installation

```bash
# Test-Dependencies sind bereits in package.json
npm install

# Zusätzliche Tools für E2E (optional)
npm install -D @playwright/test
```

### Konfiguration

#### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/app/**', // Next.js app directory
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

#### Test Setup (`jest.setup.js`)

```javascript
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills für Node.js
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock für Next.js Router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Firebase Mocks
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
}));
```

### Testing Utils (`src/test/utils.tsx`)

```typescript
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthContext } from '@/contexts/AuthContext';
import { AppContext } from '@/contexts/AppContext';

// Mock User für Tests
export const mockUser = {
  uid: 'test-user-123',
  email: 'test@skamp.de',
  displayName: 'Test User',
};

// Custom Render mit Providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: any;
  initialState?: any;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    user = mockUser,
    initialState = {},
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthContext.Provider value={{ user, loading: false }}>
        <AppContext.Provider value={initialState}>
          {children}
        </AppContext.Provider>
      </AuthContext.Provider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export alles von Testing Library
export * from '@testing-library/react';
export { renderWithProviders as render };
```

## 🔬 Unit Tests

Unit Tests für isolierte Funktionen und Utilities.

### Beispiel: Utility Function Test

```typescript
// src/lib/utils/__tests__/format.test.ts
import { formatCurrency, formatDate, sanitizeHtml } from '../format';

describe('formatCurrency', () => {
  it('formats numbers as EUR currency', () => {
    expect(formatCurrency(1234.56)).toBe('1.234,56 €');
    expect(formatCurrency(0)).toBe('0,00 €');
    expect(formatCurrency(-99.99)).toBe('-99,99 €');
  });

  it('handles invalid inputs', () => {
    expect(formatCurrency(null)).toBe('0,00 €');
    expect(formatCurrency(undefined)).toBe('0,00 €');
    expect(formatCurrency('invalid')).toBe('0,00 €');
  });
});

describe('formatDate', () => {
  it('formats dates in German format', () => {
    const date = new Date('2024-12-25T10:30:00Z');
    expect(formatDate(date)).toBe('25.12.2024');
    expect(formatDate(date, true)).toBe('25.12.2024 11:30'); // with time
  });
});

describe('sanitizeHtml', () => {
  it('removes dangerous HTML', () => {
    const dirty = '<script>alert("xss")</script><p>Safe text</p>';
    expect(sanitizeHtml(dirty)).toBe('<p>Safe text</p>');
  });

  it('preserves allowed tags', () => {
    const html = '<p>Text with <strong>bold</strong> and <em>italic</em></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });
});
```

### Beispiel: Firebase Service Test

```typescript
// src/lib/firebase/__tests__/company-service.test.ts
import { companiesService } from '../company-service';
import { collection, addDoc, getDoc } from 'firebase/firestore';

jest.mock('firebase/firestore');

describe('companiesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a new company with timestamp', async () => {
      const mockDocRef = { id: 'new-company-123' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const companyData = {
        name: 'Test GmbH',
        type: 'customer' as const,
        userId: 'user-123',
      };

      const id = await companiesService.create(companyData);

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...companyData,
          createdAt: expect.anything(),
        })
      );
      expect(id).toBe('new-company-123');
    });
  });

  describe('getById', () => {
    it('returns company if exists', async () => {
      const mockData = { name: 'Test GmbH', type: 'customer' };
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'company-123',
        data: () => mockData,
      });

      const company = await companiesService.getById('company-123');

      expect(company).toEqual({
        id: 'company-123',
        ...mockData,
      });
    });

    it('returns null if not exists', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const company = await companiesService.getById('non-existent');
      expect(company).toBeNull();
    });
  });
});
```

## 🧩 Component Tests

Tests für React Components mit React Testing Library.

### Beispiel: Button Component

```typescript
// src/components/ui/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@/test/utils';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Click me</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('shows loading state', () => {
    render(<Button loading>Save</Button>);
    
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200');
  });
});
```

### Beispiel: Campaign Form Test

```typescript
// src/components/campaigns/__tests__/CampaignForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { CampaignForm } from '../CampaignForm';
import { campaignsService } from '@/lib/firebase/campaigns-service';

jest.mock('@/lib/firebase/campaigns-service');

describe('CampaignForm', () => {
  const mockOnSuccess = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<CampaignForm onSuccess={mockOnSuccess} />);
    
    expect(screen.getByLabelText('Titel')).toBeInTheDocument();
    expect(screen.getByLabelText('Betreff')).toBeInTheDocument();
    expect(screen.getByLabelText('Inhalt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<CampaignForm onSuccess={mockOnSuccess} />);
    
    // Submit ohne Eingaben
    await user.click(screen.getByRole('button', { name: 'Speichern' }));
    
    expect(await screen.findByText('Titel ist erforderlich')).toBeInTheDocument();
    expect(await screen.findByText('Betreff ist erforderlich')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    (campaignsService.create as jest.Mock).mockResolvedValue('new-campaign-id');
    
    render(<CampaignForm onSuccess={mockOnSuccess} />);
    
    // Formular ausfüllen
    await user.type(screen.getByLabelText('Titel'), 'Neue Produktankündigung');
    await user.type(screen.getByLabelText('Betreff'), 'Innovative Lösung für Ihr Problem');
    
    // Rich Text Editor mocken
    const editor = screen.getByTestId('campaign-editor');
    fireEvent.input(editor, { 
      target: { innerHTML: '<p>Pressemeldung Inhalt</p>' } 
    });
    
    // Submit
    await user.click(screen.getByRole('button', { name: 'Speichern' }));
    
    await waitFor(() => {
      expect(campaignsService.create).toHaveBeenCalledWith({
        title: 'Neue Produktankündigung',
        subject: 'Innovative Lösung für Ihr Problem',
        content: '<p>Pressemeldung Inhalt</p>',
        status: 'draft',
        userId: 'test-user-123',
      });
      expect(mockOnSuccess).toHaveBeenCalledWith('new-campaign-id');
    });
  });

  it('shows error message on submit failure', async () => {
    (campaignsService.create as jest.Mock).mockRejectedValue(
      new Error('Netzwerkfehler')
    );
    
    render(<CampaignForm onSuccess={mockOnSuccess} />);
    
    await user.type(screen.getByLabelText('Titel'), 'Test');
    await user.type(screen.getByLabelText('Betreff'), 'Test');
    await user.click(screen.getByRole('button', { name: 'Speichern' }));
    
    expect(await screen.findByText('Fehler beim Speichern: Netzwerkfehler')).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
```

## 🔗 Integration Tests

Tests für Zusammenspiel mehrerer Komponenten und Services.

### Beispiel: CRM Workflow Test

```typescript
// src/__tests__/integration/crm-workflow.test.tsx
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { CRMPage } from '@/app/(dashboard)/contacts/crm/page';
import { companiesService } from '@/lib/firebase/companies-service';
import { contactsService } from '@/lib/firebase/contacts-service';

jest.mock('@/lib/firebase/companies-service');
jest.mock('@/lib/firebase/contacts-service');

describe('CRM Workflow Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Mock data
    (companiesService.getAll as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Test GmbH', type: 'customer' },
    ]);
    (contactsService.getAll as jest.Mock).mockResolvedValue([
      { id: '1', firstName: 'Max', lastName: 'Mustermann', companyId: '1' },
    ]);
  });

  it('allows creating company and then contact', async () => {
    render(<CRMPage />);
    
    // Initial load
    await waitFor(() => {
      expect(screen.getByText('Test GmbH')).toBeInTheDocument();
    });
    
    // Create new company
    await user.click(screen.getByRole('button', { name: 'Neue Firma' }));
    
    const modal = await screen.findByRole('dialog');
    await user.type(screen.getByLabelText('Firmenname'), 'Neue Firma AG');
    await user.selectOptions(screen.getByLabelText('Typ'), 'partner');
    
    (companiesService.create as jest.Mock).mockResolvedValue('new-company-id');
    await user.click(screen.getByRole('button', { name: 'Speichern' }));
    
    // Verify company created
    await waitFor(() => {
      expect(companiesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Neue Firma AG',
          type: 'partner',
        })
      );
    });
    
    // Switch to contacts tab
    await user.click(screen.getByRole('tab', { name: 'Personen' }));
    
    // Create contact for new company
    await user.click(screen.getByRole('button', { name: 'Neue Person' }));
    
    await user.type(screen.getByLabelText('Vorname'), 'Anna');
    await user.type(screen.getByLabelText('Nachname'), 'Schmidt');
    await user.selectOptions(screen.getByLabelText('Firma'), 'new-company-id');
    
    (contactsService.create as jest.Mock).mockResolvedValue('new-contact-id');
    await user.click(screen.getByRole('button', { name: 'Speichern' }));
    
    // Verify contact created with company reference
    await waitFor(() => {
      expect(contactsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Anna',
          lastName: 'Schmidt',
          companyId: 'new-company-id',
        })
      );
    });
  });
});
```

### Beispiel: Campaign Send Workflow

```typescript
// src/__tests__/integration/campaign-send.test.tsx
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { CampaignEditor } from '@/app/(dashboard)/pr-tools/campaigns/edit/[id]/page';
import { campaignsService } from '@/lib/firebase/campaigns-service';
import { sendgridService } from '@/lib/services/sendgrid-service';

jest.mock('@/lib/firebase/campaigns-service');
jest.mock('@/lib/services/sendgrid-service');

describe('Campaign Send Workflow', () => {
  const user = userEvent.setup();
  const mockCampaign = {
    id: 'campaign-123',
    title: 'Test Kampagne',
    subject: 'Wichtige Ankündigung',
    content: '<p>Inhalt der Pressemeldung</p>',
    status: 'draft',
  };

  beforeEach(() => {
    (campaignsService.getById as jest.Mock).mockResolvedValue(mockCampaign);
  });

  it('completes full send workflow', async () => {
    render(<CampaignEditor params={{ id: 'campaign-123' }} />);
    
    // Load campaign
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Kampagne')).toBeInTheDocument();
    });
    
    // Open send dialog
    await user.click(screen.getByRole('button', { name: 'Senden' }));
    
    // Select recipients
    const recipientModal = await screen.findByRole('dialog');
    await user.click(screen.getByLabelText('Max Mustermann'));
    await user.click(screen.getByLabelText('Anna Schmidt'));
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    
    // Configure send options
    await user.type(screen.getByLabelText('Absendername'), 'PR Team');
    await user.type(screen.getByLabelText('Antwort-Email'), 'pr@skamp.de');
    
    // Mock successful send
    (sendgridService.sendCampaign as jest.Mock).mockResolvedValue({
      success: true,
      sent: 2,
      failed: 0,
    });
    
    // Send campaign
    await user.click(screen.getByRole('button', { name: 'Jetzt senden' }));
    
    // Verify send
    await waitFor(() => {
      expect(sendgridService.sendCampaign).toHaveBeenCalledWith({
        campaign: mockCampaign,
        recipients: expect.arrayContaining([
          expect.objectContaining({ email: 'max@example.com' }),
          expect.objectContaining({ email: 'anna@example.com' }),
        ]),
        senderInfo: expect.objectContaining({
          name: 'PR Team',
          email: 'pr@skamp.de',
        }),
      });
    });
    
    // Check success message
    expect(await screen.findByText('Kampagne erfolgreich versendet!')).toBeInTheDocument();
    expect(screen.getByText('2 E-Mails versendet')).toBeInTheDocument();
  });
});
```

## 🌐 E2E Tests

End-to-End Tests mit Playwright für kritische User Journeys.

### Playwright Setup (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### Beispiel: Complete User Journey

```typescript
// e2e/campaign-lifecycle.spec.ts
import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser } from './helpers';

test.describe('Campaign Lifecycle', () => {
  let testUser: { email: string; password: string };

  test.beforeEach(async ({ page }) => {
    testUser = await createTestUser();
    
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('create, approve and send campaign', async ({ page }) => {
    // 1. Create Campaign
    await page.goto('/dashboard/pr-tools/campaigns');
    await page.click('text=Neue Kampagne');
    
    await page.fill('[name="title"]', 'E2E Test Kampagne');
    await page.fill('[name="subject"]', 'Automatisierter Test');
    
    // Use AI to generate content
    await page.click('text=KI-Assistent');
    await page.fill('[name="prompt"]', 'Produktankündigung für Software');
    await page.click('text=Generieren');
    
    await expect(page.locator('.tiptap-editor')).toContainText('Pressemitteilung', {
      timeout: 10000
    });
    
    await page.click('text=Speichern');
    await expect(page.locator('.toast')).toContainText('Kampagne gespeichert');
    
    // 2. Request Approval
    await page.click('text=Freigabe anfordern');
    
    const approvalUrl = await page.locator('[data-testid="approval-link"]').inputValue();
    expect(approvalUrl).toContain('/share/campaign/');
    
    // 3. Simulate Approval (in new context)
    const approvalContext = await browser.newContext();
    const approvalPage = await approvalContext.newPage();
    
    await approvalPage.goto(approvalUrl);
    await expect(approvalPage.locator('h1')).toContainText('E2E Test Kampagne');
    
    await approvalPage.fill('[name="comments"]', 'Sieht gut aus!');
    await approvalPage.click('text=Freigeben');
    await expect(approvalPage.locator('.success-message')).toBeVisible();
    
    await approvalContext.close();
    
    // 4. Send Campaign
    await page.reload();
    await expect(page.locator('[data-status="approved"]')).toBeVisible();
    
    await page.click('text=Senden');
    
    // Select recipients
    await page.click('text=Empfänger auswählen');
    await page.check('[data-testid="select-all-contacts"]');
    await page.click('text=Weiter');
    
    // Send
    await page.click('text=Jetzt senden');
    await expect(page.locator('.toast')).toContainText('erfolgreich versendet');
    
    // 5. Verify Status
    await page.goto('/dashboard/pr-tools/campaigns');
    await expect(page.locator('tr', { hasText: 'E2E Test Kampagne' }))
      .toContainText('Versendet');
  });
});
```

## 📏 Testing Best Practices

### 1. Arrange-Act-Assert (AAA)

```typescript
test('user can update profile', async () => {
  // Arrange
  const user = createUser({ name: 'Old Name' });
  render(<ProfileForm user={user} />);
  
  // Act
  await userEvent.clear(screen.getByLabelText('Name'));
  await userEvent.type(screen.getByLabelText('Name'), 'New Name');
  await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
  
  // Assert
  expect(updateProfile).toHaveBeenCalledWith({
    ...user,
    name: 'New Name',
  });
});
```

### 2. Test User Behavior, Not Implementation

```typescript
// ❌ BAD: Testing implementation details
expect(component.state.isLoading).toBe(true);
expect(component.instance().handleClick).toHaveBeenCalled();

// ✅ GOOD: Testing user-visible behavior
expect(screen.getByTestId('spinner')).toBeInTheDocument();
expect(screen.getByText('Erfolgreich gespeichert')).toBeInTheDocument();
```

### 3. Use Testing Library Queries Correctly

```typescript
// Priority order (von best zu worst):
// 1. Accessible queries
getByRole('button', { name: 'Speichern' })
getByLabelText('E-Mail Adresse')
getByPlaceholderText('Suchen...')
getByText('Willkommen')

// 2. Semantic queries
getByAltText('Firmenlogo')
getByTitle('Schließen')

// 3. Test IDs (last resort)
getByTestId('custom-element')
```

### 4. Async Testing

```typescript
// ❌ BAD: No waiting
test('loads data', () => {
  render(<DataList />);
  expect(screen.getByText('Item 1')).toBeInTheDocument(); // Might fail!
});

// ✅ GOOD: Proper async handling
test('loads data', async () => {
  render(<DataList />);
  expect(await screen.findByText('Item 1')).toBeInTheDocument();
  
  // Or with waitFor
  await waitFor(() => {
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});
```

### 5. Mock External Dependencies

```typescript
// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({
    docs: [{ id: '1', data: () => ({ name: 'Test' }) }]
  })),
}));

// Mock API calls
jest.mock('@/lib/api', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: [] })),
}));

// Mock environment
beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
});
```

## 🚀 CI/CD Integration

### GitHub Actions Workflow (`.github/workflows/test.yml`)

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run type check
      run: npm run type-check
    
    - name: Run unit tests
      run: npm test -- --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
    
    - name: Run E2E tests
      run: npx playwright install --with-deps && npm run test:e2e
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: |
          coverage/
          playwright-report/
          test-results/
```

### Pre-commit Hooks (`package.json`)

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "precommit": "lint-staged"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests"
    ]
  }
}
```

## 📊 Test Coverage

### Coverage Goals

| Type | Target | Current |
|------|--------|---------|
| Statements | 80% | - |
| Branches | 75% | - |
| Functions | 80% | - |
| Lines | 80% | - |

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Critical Path Coverage

Diese Bereiche müssen 100% Coverage haben:

- Authentication flows
- Payment processing
- Data deletion (DSGVO)
- Campaign sending
- Security-critical functions

## ⚡ Performance Testing

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: |
      http://localhost:3000
      http://localhost:3000/dashboard
    uploadArtifacts: true
    temporaryPublicStorage: true
```

### Bundle Size Monitoring

```json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "bundlesize": "bundlesize"
  },
  "bundlesize": [
    {
      "path": ".next/static/chunks/main-*.js",
      "maxSize": "100 kB"
    },
    {
      "path": ".next/static/chunks/pages/**/*.js",
      "maxSize": "150 kB"
    }
  ]
}
```

## 🔍 Debugging Tests

### VS Code Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--watchAll=false"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Playwright Debug",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/playwright",
      "args": ["test", "--debug"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debugging Tips

```typescript
// Pause test execution
await page.pause(); // Playwright
screen.debug(); // Testing Library

// Log current state
console.log(prettyDOM(container));

// Take screenshot (Playwright)
await page.screenshot({ path: 'debug.png' });

// Use data-testid for hard-to-select elements
<div data-testid="complex-component" />
```

## 📚 Weiterführende Ressourcen

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [SKAMP Test Examples](./src/__tests__/examples)

---

*Remember: Tests sind eine Investition in die Zukunft. Gute Tests machen Refactoring sicher und Deployments stressfrei!* 🚀