// src/app/dashboard/contacts/crm/companies/components/__tests__/CompaniesTable.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CompaniesTable } from '../CompaniesTable';
import { CompanyEnhanced } from '@/types/crm-enhanced';
import { Tag } from '@/types/crm';

const mockCompanies: CompanyEnhanced[] = [
  {
    id: '1',
    name: 'Test AG',
    type: 'customer',
    status: 'active',
    organizationId: 'org-1',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Demo GmbH',
    type: 'partner',
    status: 'inactive',
    organizationId: 'org-1',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockTags: Tag[] = [];
const mockContacts: any[] = [];

describe('CompaniesTable', () => {
  it('renders companies correctly', () => {
    render(
      <CompaniesTable
        companies={mockCompanies}
        selectedIds={new Set()}
        contacts={mockContacts}
        tags={mockTags}
        onSelect={jest.fn()}
        onView={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Test AG')).toBeInTheDocument();
    expect(screen.getByText('Demo GmbH')).toBeInTheDocument();
  });

  it('handles row selection', () => {
    const onSelect = jest.fn();
    render(
      <CompaniesTable
        companies={mockCompanies}
        selectedIds={new Set()}
        contacts={mockContacts}
        tags={mockTags}
        onSelect={onSelect}
        onView={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First company checkbox (index 0 is "select all")

    expect(onSelect).toHaveBeenCalled();
    const calledWith = onSelect.mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(Set);
    expect(calledWith.has('1')).toBe(true);
  });

  it('calls onView when view button is clicked', () => {
    const onView = jest.fn();
    render(
      <CompaniesTable
        companies={mockCompanies}
        selectedIds={new Set()}
        contacts={mockContacts}
        tags={mockTags}
        onSelect={jest.fn()}
        onView={onView}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    // Find company name button (acts as view)
    const companyButton = screen.getByText('Test AG');
    fireEvent.click(companyButton);

    expect(onView).toHaveBeenCalledWith('1');
  });
});
