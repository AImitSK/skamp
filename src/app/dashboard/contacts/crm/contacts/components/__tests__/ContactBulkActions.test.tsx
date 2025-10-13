// src/app/dashboard/contacts/crm/contacts/components/__tests__/ContactBulkActions.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactBulkActions } from '../ContactBulkActions';

describe('ContactBulkActions', () => {
  it('renders actions button', () => {
    render(
      <ContactBulkActions
        selectedCount={0}
        onImport={jest.fn()}
        onExport={jest.fn()}
        onBulkDelete={jest.fn()}
      />
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onImport when import is clicked', () => {
    const onImport = jest.fn();
    render(
      <ContactBulkActions
        selectedCount={0}
        onImport={onImport}
        onExport={jest.fn()}
        onBulkDelete={jest.fn()}
      />
    );

    // Open actions menu
    const actionsButton = screen.getByRole('button');
    fireEvent.click(actionsButton);

    // Click import
    const importButton = screen.getByText('Import');
    fireEvent.click(importButton);

    expect(onImport).toHaveBeenCalled();
  });

  it('calls onExport when export is clicked', () => {
    const onExport = jest.fn();
    render(
      <ContactBulkActions
        selectedCount={0}
        onImport={jest.fn()}
        onExport={onExport}
        onBulkDelete={jest.fn()}
      />
    );

    // Open actions menu
    const actionsButton = screen.getByRole('button');
    fireEvent.click(actionsButton);

    // Click export
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    expect(onExport).toHaveBeenCalled();
  });

  it('shows bulk delete when items are selected', () => {
    render(
      <ContactBulkActions
        selectedCount={5}
        onImport={jest.fn()}
        onExport={jest.fn()}
        onBulkDelete={jest.fn()}
      />
    );

    // Open actions menu
    const actionsButton = screen.getByRole('button');
    fireEvent.click(actionsButton);

    // Should show bulk delete option
    expect(screen.getByText(/Auswahl löschen \(5\)/i)).toBeInTheDocument();
  });
});
