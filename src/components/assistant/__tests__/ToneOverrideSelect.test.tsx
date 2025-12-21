import { render, screen, fireEvent } from '@testing-library/react';
import { ToneOverrideSelect, ToneOption } from '../ToneOverrideSelect';

// next-intl mock
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'tone.label': 'Tonalität',
      'tone.dnaLabel': 'DNA',
      'tone.options.inherit': 'Aus DNA übernehmen',
      'tone.options.formal': 'Formell',
      'tone.options.casual': 'Casual',
      'tone.options.modern': 'Modern',
      'tone.warning.title': 'Achtung',
      'tone.warning.message':
        'Du überschreibst die Tonalität aus der Marken-DNA. Dies kann zu Inkonsistenzen in der Markenkommunikation führen.',
    };
    return translations[key] || key;
  },
}));

describe('ToneOverrideSelect', () => {
  const mockOnToneChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rendert Select mit allen Optionen', () => {
    render(
      <ToneOverrideSelect defaultTone={null} onToneChange={mockOnToneChange} />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Prüfe alle Optionen
    expect(screen.getByText('Aus DNA übernehmen')).toBeInTheDocument();
    expect(screen.getByText('Formell')).toBeInTheDocument();
    expect(screen.getByText('Casual')).toBeInTheDocument();
    expect(screen.getByText('Modern')).toBeInTheDocument();
  });

  it('zeigt defaultTone im Label an', () => {
    render(
      <ToneOverrideSelect
        defaultTone="formal"
        onToneChange={mockOnToneChange}
      />
    );

    expect(screen.getByText(/DNA: formal/i)).toBeInTheDocument();
  });

  it('ruft onToneChange bei Auswahl auf', () => {
    render(
      <ToneOverrideSelect defaultTone={null} onToneChange={mockOnToneChange} />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'casual' } });

    expect(mockOnToneChange).toHaveBeenCalledWith('casual');
  });

  it('zeigt Warnung wenn Override aktiv', () => {
    render(
      <ToneOverrideSelect
        defaultTone="formal"
        onToneChange={mockOnToneChange}
      />
    );

    // Initial keine Warnung
    expect(screen.queryByText(/Achtung/)).not.toBeInTheDocument();

    // Wähle andere Tonalität
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'casual' } });

    // Warnung sollte erscheinen
    expect(screen.getByText(/Achtung/)).toBeInTheDocument();
    expect(
      screen.getByText(/Du überschreibst die Tonalität/)
    ).toBeInTheDocument();
  });

  it('versteckt Warnung wenn "Aus DNA übernehmen" gewählt wird', () => {
    render(
      <ToneOverrideSelect
        defaultTone="formal"
        onToneChange={mockOnToneChange}
      />
    );

    const select = screen.getByRole('combobox');

    // Wähle Override
    fireEvent.change(select, { target: { value: 'casual' } });
    expect(screen.getByText(/Achtung/)).toBeInTheDocument();

    // Wähle "Aus DNA übernehmen"
    fireEvent.change(select, { target: { value: '' } });
    expect(screen.queryByText(/Achtung/)).not.toBeInTheDocument();
  });

  it('zeigt keine Warnung wenn gleiche Tonalität wie DNA gewählt wird', () => {
    render(
      <ToneOverrideSelect
        defaultTone="formal"
        onToneChange={mockOnToneChange}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'formal' } });

    // Keine Warnung, da formal === defaultTone
    expect(screen.queryByText(/Achtung/)).not.toBeInTheDocument();
  });

  it('übergibt null wenn "Aus DNA übernehmen" gewählt wird', () => {
    render(
      <ToneOverrideSelect defaultTone={null} onToneChange={mockOnToneChange} />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '' } });

    expect(mockOnToneChange).toHaveBeenCalledWith(null);
  });
});
