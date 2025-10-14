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

const mockTags: Tag[] = [
  { id: 'tag-1', name: 'VIP', color: 'red', organizationId: 'org-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1', updatedBy: 'user-1' },
];

// Mock functions for required props
const mockGetContactCount = jest.fn((companyId: string) => 0);
const mockGetCountryName = jest.fn((countryCode?: string) => countryCode || '');

describe('CompaniesTable', () => {
  it('renders companies correctly', () => {
    const tagsMap = new Map(mockTags.map(tag => [tag.id!, tag]));

    render(
      <CompaniesTable
        companies={mockCompanies}
        selectedIds={new Set()}
        onSelectAll={jest.fn()}
        onSelect={jest.fn()}
        onView={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        tagsMap={tagsMap}
        getContactCount={mockGetContactCount}
        getCountryName={mockGetCountryName}
      />
    );

    expect(screen.getByText('Test AG')).toBeInTheDocument();
    expect(screen.getByText('Demo GmbH')).toBeInTheDocument();
  });

  it('handles row selection', () => {
    const onSelect = jest.fn();
    const tagsMap = new Map(mockTags.map(tag => [tag.id!, tag]));

    render(
      <CompaniesTable
        companies={mockCompanies}
        selectedIds={new Set()}
        onSelectAll={jest.fn()}
        onSelect={onSelect}
        onView={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        tagsMap={tagsMap}
        getContactCount={mockGetContactCount}
        getCountryName={mockGetCountryName}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First company checkbox (index 0 is "select all")

    expect(onSelect).toHaveBeenCalledWith('1', true);
  });

  it('calls onView when view button is clicked', () => {
    const onView = jest.fn();
    const tagsMap = new Map(mockTags.map(tag => [tag.id!, tag]));

    render(
      <CompaniesTable
        companies={mockCompanies}
        selectedIds={new Set()}
        onSelectAll={jest.fn()}
        onSelect={jest.fn()}
        onView={onView}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        tagsMap={tagsMap}
        getContactCount={mockGetContactCount}
        getCountryName={mockGetCountryName}
      />
    );

    // Find company name button (acts as view)
    const companyButton = screen.getByText('Test AG');
    fireEvent.click(companyButton);

    expect(onView).toHaveBeenCalledWith('1');
  });
});
