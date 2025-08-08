import React from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock Auth Context
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="auth-provider">
      {children}
    </div>
  )
}

// Mock Organization Context
const MockOrganizationProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="organization-provider">
      {children}
    </div>
  )
}

// Mock the actual context hooks
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { 
      uid: 'test-user-123', 
      email: 'test@example.com',
      displayName: 'Test User'
    },
    loading: false,
  }),
  AuthProvider: MockAuthProvider,
}));

jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { 
      id: 'test-org-123', 
      name: 'Test Organization',
      slug: 'test-org'
    },
    loading: false,
  }),
  OrganizationProvider: MockOrganizationProvider,
}));

// Erstelle einen neuen QueryClient für jeden Test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

// Custom render Funktion mit allen Providern
export function renderWithProviders(
  ui: React.ReactElement,
  options = {}
) {
  const queryClient = createTestQueryClient()

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider>
          <MockOrganizationProvider>
            {children}
          </MockOrganizationProvider>
        </MockAuthProvider>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: AllTheProviders, ...options })
}

// Re-export alles von testing-library
export * from '@testing-library/react'

// Override render mit unserer custom version
export { renderWithProviders as render }