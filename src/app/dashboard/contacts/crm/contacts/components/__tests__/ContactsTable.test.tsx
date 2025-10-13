// src/app/dashboard/contacts/crm/contacts/components/__tests__/ContactsTable.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactsTable } from '../ContactsTable';
import { ContactEnhanced } from '@/types/crm-enhanced';
import { Tag } from '@/types/crm';

const mockContacts: ContactEnhanced[] = [
  {
    id: '1',
    displayName: 'Max Mustermann',
    firstName: 'Max',
    lastName: 'Mustermann',
    organizationId: 'org-1',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    displayName: 'Erika Musterfrau',
    firstName: 'Erika',
    lastName: 'Musterfrau',
    organizationId: 'org-1',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockTags: Tag[] = [];
const mockCompanies: any[] = [];

describe('ContactsTable', () => {
  it('renders contacts correctly', () => {
    render(
      <ContactsTable
        contacts={mockContacts}
        selectedIds={new Set()}
        companies={mockCompanies}
        tags={mockTags}
        onSelect={jest.fn()}
        onView={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    expect(screen.getByText('Erika Musterfrau')).toBeInTheDocument();
  });

  it('handles row selection', () => {
    const onSelect = jest.fn();
    render(
      <ContactsTable
        contacts={mockContacts}
        selectedIds={new Set()}
        companies={mockCompanies}
        tags={mockTags}
        onSelect={onSelect}
        onView={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First contact checkbox

    expect(onSelect).toHaveBeenCalled();
    const calledWith = onSelect.mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(Set);
    expect(calledWith.has('1')).toBe(true);
  });

  it('calls onView when view button is clicked', () => {
    const onView = jest.fn();
    render(
      <ContactsTable
        contacts={mockContacts}
        selectedIds={new Set()}
        companies={mockCompanies}
        tags={mockTags}
        onSelect={jest.fn()}
        onView={onView}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    // Find contact name button
    const contactButton = screen.getByText('Max Mustermann');
    fireEvent.click(contactButton);

    expect(onView).toHaveBeenCalledWith('1');
  });
});
