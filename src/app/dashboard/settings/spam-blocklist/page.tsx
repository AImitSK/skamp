"use client";

import { useState, useEffect } from 'react';
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Field, Label } from "@/components/ui/fieldset";
import { SimpleSwitch } from "@/components/notifications/SimpleSwitch";
import { SettingsNav } from '@/components/SettingsNav';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { spamPatternService } from '@/lib/firebase/spam-pattern-service';
import { SpamPattern } from '@/types/monitoring';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function SpamBlocklistPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [patterns, setPatterns] = useState<SpamPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: 'url_domain' as SpamPattern['type'],
    pattern: '',
    isRegex: false,
    description: ''
  });

  useEffect(() => {
    loadPatterns();
  }, [currentOrganization?.id]);

  const loadPatterns = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);
      const data = await spamPatternService.getAllByOrganization(
        currentOrganization.id,
        'global'
      );
      setPatterns(data);
    } catch (error) {
      console.error('Error loading patterns:', error);
      toast.error('Fehler beim Laden der Spam-Patterns');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!user?.uid || !currentOrganization?.id) return;

    if (!formData.pattern.trim()) {
      toast.error('Bitte geben Sie ein Pattern ein');
      return;
    }

    try {
      await spamPatternService.create({
        organizationId: currentOrganization.id,
        type: formData.type,
        pattern: formData.pattern.trim(),
        isRegex: formData.isRegex,
        scope: 'global',
        isActive: true,
        description: formData.description.trim() || undefined
      }, { userId: user.uid });

      toast.success('Pattern erfolgreich hinzugefügt');
      setIsDialogOpen(false);
      setFormData({
        type: 'url_domain',
        pattern: '',
        isRegex: false,
        description: ''
      });
      loadPatterns();
    } catch (error) {
      console.error('Error adding pattern:', error);
      toast.error('Fehler beim Hinzufügen des Patterns');
    }
  };

  const handleDelete = async (patternId: string) => {
    if (!confirm('Möchten Sie dieses Pattern wirklich löschen?')) return;

    try {
      await spamPatternService.delete(patternId);
      toast.success('Pattern erfolgreich gelöscht');
      loadPatterns();
    } catch (error) {
      console.error('Error deleting pattern:', error);
      toast.error('Fehler beim Löschen des Patterns');
    }
  };

  const handleToggle = async (pattern: SpamPattern) => {
    if (!pattern.id) return;

    try {
      if (pattern.isActive) {
        await spamPatternService.deactivate(pattern.id);
        toast.success('Pattern deaktiviert');
      } else {
        await spamPatternService.update(pattern.id, { isActive: true }, { userId: user?.uid || '' });
        toast.success('Pattern aktiviert');
      }
      loadPatterns();
    } catch (error) {
      console.error('Error toggling pattern:', error);
      toast.error('Fehler beim Aktivieren/Deaktivieren');
    }
  };

  const getTypeLabel = (type: SpamPattern['type']) => {
    switch (type) {
      case 'url_domain': return 'URL Domain';
      case 'keyword_title': return 'Keyword (Titel)';
      case 'keyword_content': return 'Keyword (Inhalt)';
      case 'outlet_name': return 'Medium Name';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex h-full">
        <aside className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 p-6">
          <SettingsNav />
        </aside>
        <main className="flex-1 p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 p-6">
        <SettingsNav />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <Heading>Globale Spam-Blocklist</Heading>
            <Text className="mt-2 text-gray-600">
              Filtere unerwünschte Veröffentlichungs-Vorschläge organisationsweit
            </Text>
          </div>

          {/* Add Pattern Button */}
          <div className="mb-6">
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusIcon className="size-4" />
              Pattern hinzufügen
            </Button>
          </div>

          {/* Patterns Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Typ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pattern
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patterns.map((pattern) => (
                  <tr key={pattern.id} className={`hover:bg-gray-50 ${!pattern.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color="zinc">
                        {getTypeLabel(pattern.type)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {pattern.pattern}
                        </code>
                        {pattern.isRegex && (
                          <Badge color="blue" className="ml-2">RegEx</Badge>
                        )}
                        {!pattern.isActive && (
                          <Badge color="gray" className="ml-2">Inaktiv</Badge>
                        )}
                        {pattern.description && (
                          <p className="text-xs text-gray-500 mt-2">{pattern.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{pattern.timesMatched || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SimpleSwitch
                        checked={pattern.isActive}
                        onChange={() => handleToggle(pattern)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        color="red"
                        onClick={() => pattern.id && handleDelete(pattern.id)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {patterns.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500">Noch keine Spam-Patterns definiert</p>
                <p className="text-sm text-gray-400 mt-2">
                  Erstellen Sie Ihr erstes Pattern, um unerwünschte Monitoring-Vorschläge zu filtern
                </p>
              </div>
            )}
          </div>

          {/* Add Pattern Dialog */}
          <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
            <DialogTitle>Spam-Pattern hinzufügen</DialogTitle>
            <DialogBody>
              <div className="space-y-4">
                <Field>
                  <Label>Typ</Label>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as SpamPattern['type'] })}
                  >
                    <option value="url_domain">URL Domain</option>
                    <option value="keyword_title">Keyword (Titel)</option>
                    <option value="keyword_content">Keyword (Inhalt)</option>
                    <option value="outlet_name">Medium Name</option>
                  </Select>
                  <Text className="text-xs text-gray-500 mt-1">
                    Wählen Sie den Typ des Filters
                  </Text>
                </Field>

                <Field>
                  <Label>Pattern</Label>
                  <Input
                    type="text"
                    value={formData.pattern}
                    onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                    placeholder="z.B. spam-domain.com oder 'pressemitteilung'"
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    Das Pattern, nach dem gesucht werden soll
                  </Text>
                </Field>

                <div className="flex items-center gap-3">
                  <SimpleSwitch
                    checked={formData.isRegex}
                    onChange={(checked) => setFormData({ ...formData, isRegex: checked })}
                  />
                  <div>
                    <div className="font-medium text-sm text-gray-900">RegEx Pattern</div>
                    <Text className="text-xs text-gray-500">
                      Regulärer Ausdruck für erweiterte Muster
                    </Text>
                  </div>
                </div>

                <Field>
                  <Label>Beschreibung (optional)</Label>
                  <Input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Warum ist das Spam?"
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    Hilfreiche Notiz für andere Team-Mitglieder
                  </Text>
                </Field>
              </div>
            </DialogBody>
            <DialogActions>
              <Button plain onClick={() => setIsDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleAdd} disabled={!formData.pattern.trim()}>
                Hinzufügen
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
