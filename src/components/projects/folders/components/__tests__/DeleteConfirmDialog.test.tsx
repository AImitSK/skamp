import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteConfirmDialog from '../DeleteConfirmDialog';

describe('DeleteConfirmDialog Component', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte nicht rendern wenn isOpen=false', () => {
    const { container } = render(
      <DeleteConfirmDialog
        isOpen={false}
        title="Test Title"
        message="Test Message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('sollte rendern wenn isOpen=true', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Datei löschen"
        message="Möchten Sie fortfahren?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Datei löschen')).toBeInTheDocument();
    expect(screen.getByText('Möchten Sie fortfahren?')).toBeInTheDocument();
  });

  it('sollte Title korrekt anzeigen', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Ordner löschen"
        message="Test"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Ordner löschen')).toBeInTheDocument();
  });

  it('sollte Message korrekt anzeigen', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Test"
        message="Diese Aktion kann nicht rückgängig gemacht werden."
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Diese Aktion kann nicht rückgängig gemacht werden.')).toBeInTheDocument();
  });

  it('sollte Abbrechen-Button anzeigen', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Test"
        message="Test"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Abbrechen')).toBeInTheDocument();
  });

  it('sollte Löschen-Button anzeigen', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Test"
        message="Test"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Löschen')).toBeInTheDocument();
  });

  it('sollte onCancel aufrufen beim Klick auf Abbrechen', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Test"
        message="Test"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Abbrechen');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('sollte onConfirm aufrufen beim Klick auf Löschen', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Test"
        message="Test"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const deleteButton = screen.getByText('Löschen');
    fireEvent.click(deleteButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('sollte Löschen-Button mit rotem Stil anzeigen', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Test"
        message="Test"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const deleteButton = screen.getByText('Löschen');
    expect(deleteButton).toHaveClass('bg-red-600');
    expect(deleteButton).toHaveClass('text-white');
  });

  it('sollte lange Nachrichten korrekt anzeigen', () => {
    const longMessage = 'Dies ist eine sehr lange Nachricht mit vielen Details über die Löschoperation und deren Konsequenzen, die dem Benutzer helfen soll, eine informierte Entscheidung zu treffen.';

    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Warnung"
        message={longMessage}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });
});
