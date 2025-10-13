// src/app/dashboard/contacts/crm/contacts/components/__tests__/ContactFilters.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactFilters } from '../ContactFilters';
import { Tag } from '@/types/crm';
import { ContactEnhanced, CompanyEnhanced } from '@/types/crm-enhanced';

const mockTags: Tag[] = [
  { id: 'tag-1', name: 'VIP', color: 'red', organizationId: 'org-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1', updatedBy: 'user-1' },
];

const mockCompanies: CompanyEnhanced[] = [
  {
    id: 'company-1',
    name: 'Test AG',
    type: 'customer',
    organizationId: 'org-1',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

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
];

describe('ContactFilters', () => {
  it('renders filter button', () => {
    render(
      <ContactFilters
        selectedCompanyIds={[]}
        selectedTagIds={[]}
        journalistsOnly={false}
        onCompanyChange={jest.fn()}
        onTagChange={jest.fn()}
        onJournalistToggle={jest.fn()}
        availableCompanies={mockCompanies}
        availableTags={mockTags}
        contacts={mockContacts}
      />
    );

    expect(screen.getByLabelText('Filter')).toBeInTheDocument();
  });

  it('shows active filter count', () => {
    render(
      <ContactFilters
        selectedCompanyIds={['company-1']}
        selectedTagIds={['tag-1']}
        journalistsOnly={true}
        onCompanyChange={jest.fn()}
        onTagChange={jest.fn()}
        onJournalistToggle={jest.fn()}
        availableCompanies={mockCompanies}
        availableTags={mockTags}
        contacts={mockContacts}
      />
    );

    // 1 company + 1 tag + 1 journalist toggle = 3 active filters
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('opens filter panel on click', () => {
    render(
      <ContactFilters
        selectedCompanyIds={[]}
        selectedTagIds={[]}
        journalistsOnly={false}
        onCompanyChange={jest.fn()}
        onTagChange={jest.fn()}
        onJournalistToggle={jest.fn()}
        availableCompanies={mockCompanies}
        availableTags={mockTags}
        contacts={mockContacts}
      />
    );

    const filterButton = screen.getByLabelText('Filter');
    fireEvent.click(filterButton);

    // Check if filter panel is visible
    expect(screen.getByText('Firma')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('calls onCompanyChange when company is selected', () => {
    const onCompanyChange = jest.fn();
    render(
      <ContactFilters
        selectedCompanyIds={[]}
        selectedTagIds={[]}
        journalistsOnly={false}
        onCompanyChange={onCompanyChange}
        onTagChange={jest.fn()}
        onJournalistToggle={jest.fn()}
        availableCompanies={mockCompanies}
        availableTags={mockTags}
        contacts={mockContacts}
      />
    );

    // Open filter panel
    const filterButton = screen.getByLabelText('Filter');
    fireEvent.click(filterButton);

    // Select a company
    const companyCheckbox = screen.getByText('Test AG');
    fireEvent.click(companyCheckbox);

    expect(onCompanyChange).toHaveBeenCalled();
  });

  it('calls onJournalistToggle when journalist filter is toggled', () => {
    const onJournalistToggle = jest.fn();
    render(
      <ContactFilters
        selectedCompanyIds={[]}
        selectedTagIds={[]}
        journalistsOnly={false}
        onCompanyChange={jest.fn()}
        onTagChange={jest.fn()}
        onJournalistToggle={onJournalistToggle}
        availableCompanies={mockCompanies}
        availableTags={mockTags}
        contacts={mockContacts}
      />
    );

    // Open filter panel
    const filterButton = screen.getByLabelText('Filter');
    fireEvent.click(filterButton);

    // Toggle journalist filter
    const journalistCheckbox = screen.getByLabelText(/Nur Journalisten/i);
    fireEvent.click(journalistCheckbox);

    expect(onJournalistToggle).toHaveBeenCalledWith(true);
  });
});
