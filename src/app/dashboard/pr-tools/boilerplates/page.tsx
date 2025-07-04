// src\app\dashboard\pr-tools\boilerplates\page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { Boilerplate } from "@/types/crm";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/table";
import { PlusIcon } from "@heroicons/react/20/solid";
import BoilerplateModal from "./BoilerplateModal"; // Importieren wir gleich

export default function BoilerplatesPage() {
  const { user } = useAuth();
  const [boilerplates, setBoilerplates] = useState<Boilerplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBoilerplate, setEditingBoilerplate] = useState<Boilerplate | null>(null);

  useEffect(() => {
    if (user) {
      loadBoilerplates();
    }
  }, [user]);

  const loadBoilerplates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await boilerplatesService.getAll(user.uid);
      setBoilerplates(data);
    } catch (error) {
      console.error("Fehler beim Laden der Textbausteine:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (boilerplate: Boilerplate) => {
    setEditingBoilerplate(boilerplate);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingBoilerplate(null);
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
      if (window.confirm("Möchten Sie diesen Textbaustein wirklich löschen?")) {
          await boilerplatesService.delete(id);
          await loadBoilerplates();
      }
  }

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBoilerplate(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>Textbausteine (Boilerplates)</Heading>
          <Text className="mt-1">Verwalte hier deine wiederverwendbaren Textblöcke.</Text>
        </div>
        <Button onClick={handleAddNew}>
          <PlusIcon className="size-4 mr-2" />
          Neuer Baustein
        </Button>
      </div>

      {loading ? (
        <p>Lade Textbausteine...</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Kategorie</TableHeader>
              <TableHeader>Inhalt (Vorschau)</TableHeader>
              <TableHeader className="text-right">Aktionen</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {boilerplates.map((bp) => (
              <TableRow key={bp.id}>
                <TableCell className="font-medium">{bp.name}</TableCell>
                <TableCell>{bp.category || '-'}</TableCell>
                <TableCell className="text-zinc-500">
                    {bp.content.substring(0, 70)}...
                </TableCell>
                <TableCell className="text-right space-x-2">
                    <Button plain onClick={() => handleEdit(bp)}>Bearbeiten</Button>
                    <Button plain className="text-red-600 hover:text-red-500" onClick={() => handleDelete(bp.id!)}>Löschen</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {showModal && (
        <BoilerplateModal
          boilerplate={editingBoilerplate}
          onClose={handleCloseModal}
          onSave={() => {
            handleCloseModal();
            loadBoilerplates();
          }}
          userId={user!.uid}
        />
      )}
    </div>
  );
}