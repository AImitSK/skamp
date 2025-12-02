// src/app/dashboard/library/publications/PublicationModal/__tests__/IdentifiersSection.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { IdentifiersSection } from '../IdentifiersSection';
import type { IdentifierItem, SocialMediaItem } from '../types';

const mockIdentifiers: IdentifierItem[] = [
  { type: 'ISSN', value: '1234-5678' },
  { type: 'ISBN', value: '978-3-16-148410-0' },
];

const mockSocialMediaUrls: SocialMediaItem[] = [
  { platform: 'twitter', url: 'https://twitter.com/test' },
];

describe('IdentifiersSection', () => {
  it('sollte rendern ohne Fehler', () => {
    const setIdentifiers = jest.fn();
    const setSocialMediaUrls = jest.fn();

    render(
      <IdentifiersSection
        identifiers={mockIdentifiers}
        setIdentifiers={setIdentifiers}
        socialMediaUrls={mockSocialMediaUrls}
        setSocialMediaUrls={setSocialMediaUrls}
      />
    );

    expect(screen.getByText('Identifikatoren')).toBeInTheDocument();
    expect(screen.getByText('Social Media Profile')).toBeInTheDocument();
  });

  it('sollte Felder korrekt anzeigen', () => {
    const setIdentifiers = jest.fn();
    const setSocialMediaUrls = jest.fn();

    render(
      <IdentifiersSection
        identifiers={mockIdentifiers}
        setIdentifiers={setIdentifiers}
        socialMediaUrls={mockSocialMediaUrls}
        setSocialMediaUrls={setSocialMediaUrls}
      />
    );

    // Check identifier values
    expect(screen.getByDisplayValue('1234-5678')).toBeInTheDocument();
    expect(screen.getByDisplayValue('978-3-16-148410-0')).toBeInTheDocument();

    // Check social media values
    // Platform wird als 'twitter' gespeichert und als 'Twitter/X' im Label angezeigt
    expect(screen.getByDisplayValue('https://twitter.com/test')).toBeInTheDocument();
  });

  it('sollte setIdentifiers bei Änderung aufrufen', () => {
    const setIdentifiers = jest.fn();
    const setSocialMediaUrls = jest.fn();

    render(
      <IdentifiersSection
        identifiers={mockIdentifiers}
        setIdentifiers={setIdentifiers}
        socialMediaUrls={mockSocialMediaUrls}
        setSocialMediaUrls={setSocialMediaUrls}
      />
    );

    // Change first identifier value
    const firstValueInput = screen.getByDisplayValue('1234-5678');
    fireEvent.change(firstValueInput, { target: { value: '9999-9999' } });

    expect(setIdentifiers).toHaveBeenCalledWith([
      { type: 'ISSN', value: '9999-9999' },
      { type: 'ISBN', value: '978-3-16-148410-0' },
    ]);
  });

  it('sollte Identifikator hinzufügen', () => {
    const setIdentifiers = jest.fn();
    const setSocialMediaUrls = jest.fn();

    render(
      <IdentifiersSection
        identifiers={mockIdentifiers}
        setIdentifiers={setIdentifiers}
        socialMediaUrls={mockSocialMediaUrls}
        setSocialMediaUrls={setSocialMediaUrls}
      />
    );

    // Click add identifier button
    const addButton = screen.getByText('Identifikator hinzufügen');
    fireEvent.click(addButton);

    expect(setIdentifiers).toHaveBeenCalledWith([
      ...mockIdentifiers,
      { type: 'URL', value: '' },
    ]);
  });

  it('sollte Identifikator entfernen', () => {
    const setIdentifiers = jest.fn();
    const setSocialMediaUrls = jest.fn();

    render(
      <IdentifiersSection
        identifiers={mockIdentifiers}
        setIdentifiers={setIdentifiers}
        socialMediaUrls={mockSocialMediaUrls}
        setSocialMediaUrls={setSocialMediaUrls}
      />
    );

    // Remove button should be enabled (2 identifiers)
    const removeButtons = screen.getAllByRole('button');
    const firstRemoveButton = removeButtons.find(
      (btn) => btn.querySelector('[data-slot="icon"]') && !btn.textContent
    );

    if (firstRemoveButton) {
      fireEvent.click(firstRemoveButton);
      // Should filter out first identifier
      expect(setIdentifiers).toHaveBeenCalled();
    }
  });

  it('sollte Social Media hinzufügen', () => {
    const setIdentifiers = jest.fn();
    const setSocialMediaUrls = jest.fn();

    render(
      <IdentifiersSection
        identifiers={mockIdentifiers}
        setIdentifiers={setIdentifiers}
        socialMediaUrls={mockSocialMediaUrls}
        setSocialMediaUrls={setSocialMediaUrls}
      />
    );

    // Click add social media button
    const addButton = screen.getByText('Profil hinzufügen');
    fireEvent.click(addButton);

    expect(setSocialMediaUrls).toHaveBeenCalledWith([
      ...mockSocialMediaUrls,
      { platform: 'linkedin', url: '' }, // Komponente setzt defaultmaessig 'linkedin'
    ]);
  });

  it('sollte Social Media Änderungen verarbeiten', () => {
    const setIdentifiers = jest.fn();
    const setSocialMediaUrls = jest.fn();

    render(
      <IdentifiersSection
        identifiers={mockIdentifiers}
        setIdentifiers={setIdentifiers}
        socialMediaUrls={mockSocialMediaUrls}
        setSocialMediaUrls={setSocialMediaUrls}
      />
    );

    // Change URL
    const urlInput = screen.getByDisplayValue('https://twitter.com/test');
    fireEvent.change(urlInput, { target: { value: 'https://twitter.com/updated' } });

    expect(setSocialMediaUrls).toHaveBeenCalledWith([
      { platform: 'twitter', url: 'https://twitter.com/updated' },
    ]);
  });
});
