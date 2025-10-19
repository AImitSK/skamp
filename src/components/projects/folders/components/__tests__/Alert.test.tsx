import React from 'react';
import { render, screen } from '@testing-library/react';
import Alert from '../Alert';

describe('Alert Component', () => {
  it('sollte mit type="info" rendern', () => {
    render(<Alert type="info" message="Info Nachricht" />);

    const message = screen.getByText('Info Nachricht');
    expect(message).toBeInTheDocument();
  });

  it('sollte mit type="error" rendern', () => {
    render(<Alert type="error" message="Fehler aufgetreten" />);

    const message = screen.getByText('Fehler aufgetreten');
    expect(message).toBeInTheDocument();
  });

  it('sollte mit type="success" rendern', () => {
    render(<Alert type="success" message="Erfolgreich gespeichert" />);

    const message = screen.getByText('Erfolgreich gespeichert');
    expect(message).toBeInTheDocument();
  });

  it('sollte Icon mit korrekter Farbe für info anzeigen', () => {
    const { container } = render(<Alert type="info" message="Info" />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-blue-400');
  });

  it('sollte Icon mit korrekter Farbe für error anzeigen', () => {
    const { container } = render(<Alert type="error" message="Error" />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-red-400');
  });

  it('sollte Icon mit korrekter Farbe für success anzeigen', () => {
    const { container } = render(<Alert type="success" message="Success" />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-green-400');
  });

  it('sollte korrekte Hintergrundfarbe für info haben', () => {
    const { container } = render(<Alert type="info" message="Info" />);

    const alertDiv = container.firstChild;
    expect(alertDiv).toHaveClass('bg-blue-50');
  });

  it('sollte korrekte Hintergrundfarbe für error haben', () => {
    const { container } = render(<Alert type="error" message="Error" />);

    const alertDiv = container.firstChild;
    expect(alertDiv).toHaveClass('bg-red-50');
  });

  it('sollte korrekte Hintergrundfarbe für success haben', () => {
    const { container } = render(<Alert type="success" message="Success" />);

    const alertDiv = container.firstChild;
    expect(alertDiv).toHaveClass('bg-green-50');
  });

  it('sollte korrekte Textfarbe für info haben', () => {
    render(<Alert type="info" message="Info Text" />);

    const text = screen.getByText('Info Text');
    expect(text).toHaveClass('text-blue-700');
  });

  it('sollte korrekte Textfarbe für error haben', () => {
    render(<Alert type="error" message="Error Text" />);

    const text = screen.getByText('Error Text');
    expect(text).toHaveClass('text-red-700');
  });

  it('sollte korrekte Textfarbe für success haben', () => {
    render(<Alert type="success" message="Success Text" />);

    const text = screen.getByText('Success Text');
    expect(text).toHaveClass('text-green-700');
  });

  it('sollte lange Nachrichten korrekt anzeigen', () => {
    const longMessage = 'Dies ist eine sehr lange Fehlermeldung, die mehrere Zeilen umfassen könnte und trotzdem korrekt angezeigt werden sollte.';
    render(<Alert type="error" message={longMessage} />);

    const message = screen.getByText(longMessage);
    expect(message).toBeInTheDocument();
  });
});
