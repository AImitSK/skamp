// src/app/dashboard/contacts/crm/companies/components/__tests__\CompanyFilters.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanyFilters } from '../CompanyFilters';
import { CompanyType } from '@/types/crm';
import { Tag } from '@/types/crm';
import { CompanyEnhanced } from '@/types/crm-enhanced';

const mockTags: Tag[] = [
  { id: 'tag-1', name: 'VIP', color: 'red', organizationId: 'org-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1', updatedBy: 'user-1' },
  { id: 'tag-2', name: 'Partner', color: 'blue', organizationId: 'org-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1', updatedBy: 'user-1' },
];

const mockCompanies: CompanyEnhanced[] = [
  {
    id: '1',
    name: 'Test AG',
    type: 'customer',
    organizationId: 'org-1',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('CompanyFilters', () => {
  it('renders filter button', () => {
    render(
      <CompanyFilters
        selectedTypes={[]}
        selectedTagIds={[]}
        onTypeChange={jest.fn()}
        onTagChange={jest.fn()}
        availableTags={mockTags}
        companies={mockCompanies}
      />
    );

    expect(screen.getByLabelText('Filter')).toBeInTheDocument();
  });

  it('shows active filter count', () => {
    render(
      <CompanyFilters
        selectedTypes={['customer', 'partner']}
        selectedTagIds={['tag-1']}
        onTypeChange={jest.fn()}
        onTagChange={jest.fn()}
        availableTags={mockTags}
        companies={mockCompanies}
      />
    );

    // 2 types + 1 tag = 3 active filters
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('opens filter panel on click', () => {
    render(
      <CompanyFilters
        selectedTypes={[]}
        selectedTagIds={[]}
        onTypeChange={jest.fn()}
        onTagChange={jest.fn()}
        availableTags={mockTags}
        companies={mockCompanies}
      />
    );

    const filterButton = screen.getByLabelText('Filter');
    fireEvent.click(filterButton);

    // Check if filter panel is visible
    expect(screen.getByText('Typ')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('calls onTypeChange when type is selected', () => {
    const onTypeChange = jest.fn();
    render(
      <CompanyFilters
        selectedTypes={[]}
        selectedTagIds={[]}
        onTypeChange={onTypeChange}
        onTagChange={jest.fn()}
        availableTags={mockTags}
        companies={mockCompanies}
      />
    );

    // Open filter panel
    const filterButton = screen.getByLabelText('Filter');
    fireEvent.click(filterButton);

    // Select a type
    const customerCheckbox = screen.getByLabelText(/Kunde/i);
    fireEvent.click(customerCheckbox);

    expect(onTypeChange).toHaveBeenCalled();
    expect(onTypeChange.mock.calls[0][0]).toContain('customer');
  });

  it('calls onTagChange when tag is selected', () => {
    const onTagChange = jest.fn();
    render(
      <CompanyFilters
        selectedTypes={[]}
        selectedTagIds={[]}
        onTypeChange={jest.fn()}
        onTagChange={onTagChange}
        availableTags={mockTags}
        companies={mockCompanies}
      />
    );

    // Open filter panel
    const filterButton = screen.getByLabelText('Filter');
    fireEvent.click(filterButton);

    // Select a tag
    const vipCheckbox = screen.getByText('VIP');
    fireEvent.click(vipCheckbox);

    expect(onTagChange).toHaveBeenCalled();
  });
});
