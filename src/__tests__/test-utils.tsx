import React from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
        {children}
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: AllTheProviders, ...options })
}

// Re-export alles von testing-library
export * from '@testing-library/react'

// Override render mit unserer custom version
export { renderWithProviders as render }