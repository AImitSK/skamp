// src/app/dashboard/contacts/crm/contacts/components/__tests__/ContactsTable.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactsTable } from '../ContactsTable';
import { ContactEnhanced } from '@/types/crm-enhanced';
import { Tag } from '@/types/crm';
import { Timestamp } from 'firebase/firestore';

// Helper-Funktion um Mock-Timestamp zu erstellen
const createMockTimestamp = (): Timestamp => {
  return Timestamp.fromDate(new Date());
};

const mockContacts: ContactEnhanced[] = [
  {
    id: '1',
    displayName: 'Max Mustermann',
    name: {
      firstName: 'Max',
      lastName: 'Mustermann',
    },
    organizationId: 'org-1',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
  },
  {
    id: '2',
    displayName: 'Erika Musterfrau',
    name: {
      firstName: 'Erika',
      lastName: 'Musterfrau',
    },
    organizationId: 'org-1',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
  },
];

const mockTags: Tag[] = [];

// Helper-Funktionen für die Komponente
const getPrimaryEmail = (emails?: Array<{ email: string; isPrimary?: boolean }>) => {
  if (!emails || emails.length === 0) return '';
  const primary = emails.find(e => e.isPrimary);
  return primary ? primary.email : emails[0].email;
};

const getPrimaryPhone = (phones?: Array<{ number: string; countryCode?: string; isPrimary?: boolean }>) => {
  if (!phones || phones.length === 0) return '';
  const primary = phones.find(p => p.isPrimary);
  return primary ? primary.number : phones[0].number;
};

describe('ContactsTable', () => {
  it('renders contacts correctly', () => {
    render(
      <ContactsTable
        contacts={mockContacts}
        selectedIds={new Set()}
        tags={mockTags}
        onSelectAll={jest.fn()}
        onSelect={jest.fn()}
        onView={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        getPrimaryEmail={getPrimaryEmail}
        getPrimaryPhone={getPrimaryPhone}
      />
    );

    expect(screen.getByText('Mustermann, Max')).toBeInTheDocument();
    expect(screen.getByText('Musterfrau, Erika')).toBeInTheDocument();
  });

  it('handles row selection', () => {
    const onSelect = jest.fn();
    render(
      <ContactsTable
        contacts={mockContacts}
        selectedIds={new Set()}
        tags={mockTags}
        onSelectAll={jest.fn()}
        onSelect={onSelect}
        onView={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        getPrimaryEmail={getPrimaryEmail}
        getPrimaryPhone={getPrimaryPhone}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First contact checkbox

    expect(onSelect).toHaveBeenCalledWith('1', true);
  });

  it('calls onView when view button is clicked', () => {
    const onView = jest.fn();
    render(
      <ContactsTable
        contacts={mockContacts}
        selectedIds={new Set()}
        tags={mockTags}
        onSelectAll={jest.fn()}
        onSelect={jest.fn()}
        onView={onView}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        getPrimaryEmail={getPrimaryEmail}
        getPrimaryPhone={getPrimaryPhone}
      />
    );

    // Find contact name button
    const contactButton = screen.getByText('Mustermann, Max');
    fireEvent.click(contactButton);

    expect(onView).toHaveBeenCalledWith('1');
  });
});
