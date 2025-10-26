// src/components/projects/distribution/helpers/__tests__/filter-helpers.test.ts

import {
  renderFilterValue,
  renderPublicationFilterValue,
  getFilterIcon,
  getPublicationFilterIcon,
  getFilterLabel,
  getPublicationFilterLabel,
  extendedCompanyTypeLabels
} from '../filter-helpers';
import {
  UsersIcon,
  EnvelopeIcon,
  PhoneIcon,
  NewspaperIcon,
  FunnelIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  TagIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { Tag } from '@/types/crm-enhanced';
import { Publication } from '@/types/library';

describe('filter-helpers', () => {
  describe('extendedCompanyTypeLabels', () => {
    it('should contain expected company type labels', () => {
      expect(extendedCompanyTypeLabels['customer']).toBe('Kunde');
      expect(extendedCompanyTypeLabels['partner']).toBe('Partner');
      expect(extendedCompanyTypeLabels['media']).toBe('Medien');
    });
  });

  describe('renderFilterValue', () => {
    const mockTags: Tag[] = [
      { id: 'tag1', name: 'VIP', color: 'red', userId: 'user1' },
      { id: 'tag2', name: 'Journalist', color: 'blue', userId: 'user1' },
      { id: 'tag3', name: 'Analyst', color: 'green', userId: 'user1' },
      { id: 'tag4', name: 'Blogger', color: 'yellow', userId: 'user1' }
    ];

    it('should render tagIds with tag names', () => {
      const result = renderFilterValue('tagIds', ['tag1', 'tag2'], mockTags);
      expect(result).toBe('VIP, Journalist');
    });

    it('should render tagIds with truncation for more than 3 tags', () => {
      const result = renderFilterValue('tagIds', ['tag1', 'tag2', 'tag3', 'tag4'], mockTags);
      expect(result).toBe('VIP, Journalist, Analyst (+1 weitere)');
    });

    it('should render tagIds as dash when empty', () => {
      const result = renderFilterValue('tagIds', [], mockTags);
      expect(result).toBe('—');
    });

    it('should render companyTypes with labels', () => {
      const result = renderFilterValue('companyTypes', ['customer', 'partner'], mockTags);
      expect(result).toBe('Kunde, Partner');
    });

    it('should render companyTypes with truncation for more than 3', () => {
      const result = renderFilterValue('companyTypes', ['customer', 'partner', 'media', 'investor'], mockTags);
      expect(result).toBe('Kunde, Partner, Medien (+1 weitere)');
    });

    it('should render countries with country names', () => {
      const result = renderFilterValue('countries', ['DE', 'AT'], mockTags);
      expect(result).toContain('Deutschland');
      expect(result).toContain('Österreich');
    });

    it('should render boolean values as Ja/Nein', () => {
      expect(renderFilterValue('hasEmail', true, mockTags)).toBe('Ja');
      expect(renderFilterValue('hasPhone', false, mockTags)).toBe('Nein');
    });

    it('should render array values with truncation', () => {
      const result = renderFilterValue('positions', ['CEO', 'CTO', 'CFO', 'CMO'], mockTags);
      expect(result).toBe('CEO, CTO, CFO (+1 weitere)');
    });

    it('should render string values directly', () => {
      expect(renderFilterValue('name', 'Test', mockTags)).toBe('Test');
    });

    it('should render undefined/null as dash', () => {
      expect(renderFilterValue('name', null, mockTags)).toBe('—');
      expect(renderFilterValue('name', undefined, mockTags)).toBe('—');
    });
  });

  describe('renderPublicationFilterValue', () => {
    const mockPublications: Publication[] = [
      { id: 'pub1', title: 'Die Zeit', organizationId: 'org1' } as Publication,
      { id: 'pub2', title: 'Der Spiegel', organizationId: 'org1' } as Publication,
      { id: 'pub3', title: 'FAZ', organizationId: 'org1' } as Publication
    ];

    it('should render publicationIds with publication titles', () => {
      const result = renderPublicationFilterValue('publicationIds', ['pub1', 'pub2'], mockPublications);
      expect(result).toBe('Die Zeit, Der Spiegel');
    });

    it('should render publicationIds with truncation for more than 2', () => {
      const result = renderPublicationFilterValue('publicationIds', ['pub1', 'pub2', 'pub3'], mockPublications);
      expect(result).toBe('Die Zeit, Der Spiegel (+1 weitere)');
    });

    it('should render types with type labels', () => {
      const result = renderPublicationFilterValue('types', ['newspaper', 'magazine'], mockPublications);
      expect(result).toContain('Tageszeitung');
      expect(result).toContain('Magazin');
    });

    it('should render frequencies with frequency labels', () => {
      const result = renderPublicationFilterValue('frequencies', ['daily', 'weekly'], mockPublications);
      expect(result).toContain('Täglich');
      expect(result).toContain('Wöchentlich');
    });

    it('should render geographicScopes with scope labels', () => {
      const result = renderPublicationFilterValue('geographicScopes', ['national', 'international'], mockPublications);
      expect(result).toContain('National');
      expect(result).toContain('International');
    });

    it('should render countries with country names', () => {
      const result = renderPublicationFilterValue('countries', ['DE', 'AT'], mockPublications);
      expect(result).toContain('Deutschland');
      expect(result).toContain('Österreich');
    });

    it('should render languages with language names', () => {
      const result = renderPublicationFilterValue('languages', ['de', 'en'], mockPublications);
      expect(result).toContain('Deutsch');
      expect(result).toContain('Englisch');
    });

    it('should format circulation numbers with German locale', () => {
      const result = renderPublicationFilterValue('minPrintCirculation', 100000, mockPublications);
      expect(result).toBe('100.000');
    });

    it('should render status with status labels', () => {
      const result = renderPublicationFilterValue('status', ['active', 'inactive'], mockPublications);
      expect(result).toContain('Aktiv');
      expect(result).toContain('Inaktiv');
    });

    it('should render onlyVerified boolean correctly', () => {
      expect(renderPublicationFilterValue('onlyVerified', true, mockPublications)).toBe('Nur verifizierte');
      expect(renderPublicationFilterValue('onlyVerified', false, mockPublications)).toBe('Alle');
    });
  });

  describe('getFilterIcon', () => {
    it('should return correct icons for known filter keys', () => {
      expect(getFilterIcon('companyTypes')).toBe(BuildingOfficeIcon);
      expect(getFilterIcon('countries')).toBe(GlobeAltIcon);
      expect(getFilterIcon('tagIds')).toBe(TagIcon);
      expect(getFilterIcon('positions')).toBe(UsersIcon);
      expect(getFilterIcon('hasEmail')).toBe(EnvelopeIcon);
      expect(getFilterIcon('hasPhone')).toBe(PhoneIcon);
      expect(getFilterIcon('beats')).toBe(NewspaperIcon);
      expect(getFilterIcon('publications')).toBe(DocumentTextIcon);
    });

    it('should return FunnelIcon for unknown filter keys', () => {
      expect(getFilterIcon('unknownKey')).toBe(FunnelIcon);
    });
  });

  describe('getPublicationFilterIcon', () => {
    it('should return correct icons for known publication filter keys', () => {
      expect(getPublicationFilterIcon('publicationIds')).toBe(DocumentTextIcon);
      expect(getPublicationFilterIcon('types')).toBe(NewspaperIcon);
      expect(getPublicationFilterIcon('countries')).toBe(GlobeAltIcon);
    });

    it('should return DocumentTextIcon for unknown keys', () => {
      expect(getPublicationFilterIcon('unknownKey')).toBe(DocumentTextIcon);
    });
  });

  describe('getFilterLabel', () => {
    it('should return correct German labels for known filter keys', () => {
      expect(getFilterLabel('companyTypes')).toBe('Firmentypen');
      expect(getFilterLabel('industries')).toBe('Branchen');
      expect(getFilterLabel('countries')).toBe('Länder');
      expect(getFilterLabel('tagIds')).toBe('Tags');
      expect(getFilterLabel('positions')).toBe('Positionen');
      expect(getFilterLabel('hasEmail')).toBe('Mit E-Mail');
      expect(getFilterLabel('hasPhone')).toBe('Mit Telefon');
      expect(getFilterLabel('beats')).toBe('Ressorts');
    });

    it('should return key itself for unknown keys', () => {
      expect(getFilterLabel('unknownKey')).toBe('unknownKey');
    });
  });

  describe('getPublicationFilterLabel', () => {
    it('should return correct German labels for known publication filter keys', () => {
      expect(getPublicationFilterLabel('publicationIds')).toBe('Spezifische Publikationen');
      expect(getPublicationFilterLabel('types')).toBe('Publikationstypen');
      expect(getPublicationFilterLabel('frequencies')).toBe('Erscheinungsweise');
      expect(getPublicationFilterLabel('countries')).toBe('Zielländer');
      expect(getPublicationFilterLabel('languages')).toBe('Sprachen');
      expect(getPublicationFilterLabel('minPrintCirculation')).toBe('Min. Druckauflage');
      expect(getPublicationFilterLabel('onlyVerified')).toBe('Verifizierung');
    });

    it('should return key itself for unknown keys', () => {
      expect(getPublicationFilterLabel('unknownKey')).toBe('unknownKey');
    });
  });
});
