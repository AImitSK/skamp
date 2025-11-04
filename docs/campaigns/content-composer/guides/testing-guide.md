# Testing Guide - CampaignContentComposer

> **Guide**: Testing Guide
> **Zielgruppe**: Entwickler (Testing)
> **Dauer**: 30-45 Minuten

## Überblick

Dieser Guide zeigt Test-Patterns und Best Practices für den CampaignContentComposer.

## Test-Setup

### Schritt 1: Test-Dependencies

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Schritt 2: Test-File erstellen

```tsx
// MyComponent.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CampaignContentComposer from './CampaignContentComposer';

describe('CampaignContentComposer', () => {
  it('should render', () => {
    // Test-Code
  });
});
```

### Schritt 3: Mocks erstellen

```tsx
// Mocks für External Dependencies
jest.mock('@/lib/utils/toast', () => ({
  toastService: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: {
    getFolders: jest.fn(),
    getBreadcrumbs: jest.fn(),
  },
}));
```

## Test-Patterns

### Pattern 1: Component-Rendering

```tsx
it('should render with required props', () => {
  const mockProps = {
    organizationId: 'org-123',
    title: 'Test Title',
    onTitleChange: jest.fn(),
    mainContent: 'Test Content',
    onMainContentChange: jest.fn(),
    onFullContentChange: jest.fn(),
  };

  render(<CampaignContentComposer {...mockProps} />);

  expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument();
});
```

### Pattern 2: User-Interaktionen

```tsx
it('should call onTitleChange when title changes', async () => {
  const user = userEvent.setup();
  const handleTitleChange = jest.fn();

  render(
    <CampaignContentComposer
      {...mockProps}
      onTitleChange={handleTitleChange}
    />
  );

  const input = screen.getByDisplayValue('Test Title');
  await user.clear(input);
  await user.type(input, 'New Title');

  expect(handleTitleChange).toHaveBeenCalledWith('New Title');
});
```

### Pattern 3: Hook-Testing

```tsx
import { renderHook, act } from '@testing-library/react';
import { usePDFGeneration } from './usePDFGeneration';

it('should validate title before export', () => {
  const { result } = renderHook(() => usePDFGeneration());

  act(() => {
    result.current.handlePdfExport('');
  });

  expect(toastService.error).toHaveBeenCalledWith(
    'Bitte geben Sie einen Titel für die Pressemitteilung ein.'
  );
});
```

### Pattern 4: Async-Testing

```tsx
it('should load folders on dialog open', async () => {
  const mockFolders = [
    { id: 'f1', name: 'Folder 1' },
  ];
  (mediaService.getFolders as jest.Mock).mockResolvedValue(mockFolders);

  render(
    <FolderSelectorDialog
      isOpen={true}
      {...mockProps}
    />
  );

  await waitFor(() => {
    expect(screen.getByText('Folder 1')).toBeInTheDocument();
  });
});
```

## Best Practices

### 1. AAA-Pattern (Arrange-Act-Assert)

```tsx
it('should do something', () => {
  // Arrange
  const mockProps = { /* ... */ };

  // Act
  render(<Component {...mockProps} />);

  // Assert
  expect(screen.getByText('...')).toBeInTheDocument();
});
```

### 2. Descriptive Test-Names

```tsx
// ✅ RICHTIG
it('should hide main content field when hideMainContentField is true', () => {});

// ❌ FALSCH
it('test 1', () => {});
```

### 3. Test-Isolation

```tsx
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 4. User-Events statt fireEvent

```tsx
// ✅ RICHTIG
const user = userEvent.setup();
await user.click(button);

// ❌ FALSCH
fireEvent.click(button);
```

## Coverage

### Coverage-Report generieren

```bash
npm run test:coverage
```

### Coverage-Ziele

```
Statements: 100%
Branches: 95%+
Functions: 100%
Lines: 100%
```

## Referenzen

- [Test-Dokumentation Main](../../__tests__/README.md)
- [Test-Dokumentation Hooks](../../hooks/__tests__/README.md)
- [ADR-003: Testing-Strategie](../adr/003-testing-strategie.md)

---

**Guide erstellt am:** 04. November 2025
**Autor:** Claude AI (CeleroPress Documentation Agent)
