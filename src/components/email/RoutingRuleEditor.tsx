// src/components/email/RoutingRuleEditor.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog';
import { Button } from '@/components/button';
import { Field, Label } from '@/components/fieldset';
import { Input } from '@/components/input';
import { Select } from '@/components/select';
import { Badge } from '@/components/badge';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';
import { EmailAddress } from '@/types/email-enhanced';
import { emailAddressService } from '@/lib/email/email-address-service';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  FunnelIcon,
  UserGroupIcon,
  TagIcon,
  FlagIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';

interface RoutingRuleEditorProps {
  emailAddress: EmailAddress;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  teamMembers: Array<{ id: string; name: string; email: string }>;
}

interface LocalRoutingRule {
  id: string;
  name: string;
  conditions: {
    subject?: string;
    from?: string;
    keywords?: string[];
  };
  actions: {
    assignTo?: string[];
    addTags?: string[];
    setPriority?: 'low' | 'normal' | 'high';
    autoReply?: string;
  };
  enabled: boolean; // Lokaler State für UI
}

export function RoutingRuleEditor({ 
  emailAddress, 
  isOpen, 
  onClose, 
  onUpdate,
  teamMembers 
}: RoutingRuleEditorProps) {
  // Konvertiere die gespeicherten Regeln zum lokalen Format mit enabled flag
  const [rules, setRules] = useState<LocalRoutingRule[]>(() => 
    (emailAddress.routingRules || []).map(rule => ({
      ...rule,
      enabled: true // Alle gespeicherten Regeln sind standardmäßig aktiv
    }))
  );
  
  const [editingRule, setEditingRule] = useState<LocalRoutingRule | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedRule, setDraggedRule] = useState<number | null>(null);

  // Form state für Regel-Editor
  const [formData, setFormData] = useState<LocalRoutingRule>({
    id: '',
    name: '',
    conditions: {
      subject: '',
      from: '',
      keywords: []
    },
    actions: {
      assignTo: [],
      addTags: [],
      setPriority: 'normal',
      autoReply: ''
    },
    enabled: true
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Mock template options - TODO: Ersetzen mit echten Templates
  const mockTemplates = [
    { id: 'welcome', name: 'Willkommensnachricht' },
    { id: 'received', name: 'Empfangsbestätigung' },
    { id: 'out-of-office', name: 'Abwesenheitsnotiz' }
  ];

  const handleAddRule = () => {
    setFormData({
      id: Date.now().toString(),
      name: '',
      conditions: {
        subject: '',
        from: '',
        keywords: []
      },
      actions: {
        assignTo: [],
        addTags: [],
        setPriority: 'normal',
        autoReply: ''
      },
      enabled: true
    });
    setEditingRule(null);
    setShowRuleModal(true);
  };

  const handleEditRule = (rule: LocalRoutingRule) => {
    setFormData(rule);
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
  };

  const handleSaveRule = () => {
    if (!formData.name) return;

    if (editingRule) {
      // Update existing rule
      setRules(rules.map(r => r.id === editingRule.id ? formData : r));
    } else {
      // Add new rule
      setRules([...rules, formData]);
    }

    setShowRuleModal(false);
    setEditingRule(null);
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !formData.conditions.keywords?.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        conditions: {
          ...formData.conditions,
          keywords: [...(formData.conditions.keywords || []), keywordInput.trim()]
        }
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      conditions: {
        ...formData.conditions,
        keywords: formData.conditions.keywords?.filter(k => k !== keyword) || []
      }
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.actions.addTags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        actions: {
          ...formData.actions,
          addTags: [...(formData.actions.addTags || []), tagInput.trim()]
        }
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      actions: {
        ...formData.actions,
        addTags: formData.actions.addTags?.filter(t => t !== tag) || []
      }
    });
  };

  const handleSaveAllRules = async () => {
    try {
      setSaving(true);
      
      // Konvertiere zurück zum Speicherformat (ohne enabled flag)
      const rulesToSave = rules
        .filter(rule => rule.enabled) // Nur aktive Regeln speichern
        .map(({ enabled, ...rule }) => rule); // Entferne enabled flag
      
      await emailAddressService.updateRoutingRules(
        emailAddress.id!,
        rulesToSave,
        emailAddress.userId
      );
      
      if (onUpdate) {
        onUpdate();
      }
      
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern der Routing-Regeln:', error);
      // TODO: Zeige Fehlermeldung
    } finally {
      setSaving(false);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedRule(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedRule === null || draggedRule === index) return;

    const newRules = [...rules];
    const draggedItem = newRules[draggedRule];
    newRules.splice(draggedRule, 1);
    newRules.splice(index, 0, draggedItem);
    
    setRules(newRules);
    setDraggedRule(index);
  };

  const handleDragEnd = () => {
    setDraggedRule(null);
  };

  const toggleRuleEnabled = (ruleId: string) => {
    setRules(rules.map(rule => 
      rule.id === ruleId 
        ? { ...rule, enabled: !rule.enabled }
        : rule
    ));
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} size="xl">
        <DialogTitle className="px-6 py-4">
          Routing-Regeln für {emailAddress.email}
        </DialogTitle>
        <DialogBody className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Definieren Sie Regeln, um eingehende E-Mails automatisch zu verarbeiten.
              Die Regeln werden in der angegebenen Reihenfolge ausgeführt.
            </p>
          </div>

          {/* Rules List */}
          <div className="space-y-2 mb-6">
            {rules.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <FunnelIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">Keine Routing-Regeln definiert</p>
                <p className="text-sm text-gray-400 mt-1">
                  Fügen Sie Regeln hinzu, um E-Mails automatisch zu verarbeiten
                </p>
              </div>
            ) : (
              rules.map((rule, index) => (
                <div
                  key={rule.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={clsx(
                    "bg-white border rounded-lg p-4 cursor-move transition-all",
                    draggedRule === index && "opacity-50",
                    !rule.enabled && "opacity-60 bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className={clsx(
                          "font-medium",
                          !rule.enabled && "text-gray-500"
                        )}>
                          {rule.name}
                        </h4>
                        <SimpleSwitch
                          checked={rule.enabled}
                          onChange={() => toggleRuleEnabled(rule.id)}
                        />
                      </div>
                      
                      {/* Conditions */}
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase">Bedingungen:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {rule.conditions.subject && (
                            <Badge color="zinc" className="whitespace-nowrap">
                              Betreff: {rule.conditions.subject}
                            </Badge>
                          )}
                          {rule.conditions.from && (
                            <Badge color="zinc" className="whitespace-nowrap">
                              Von: {rule.conditions.from}
                            </Badge>
                          )}
                          {rule.conditions.keywords?.map(keyword => (
                            <Badge key={keyword} color="zinc" className="whitespace-nowrap">
                              Keyword: {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">Aktionen:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {rule.actions.assignTo && rule.actions.assignTo.length > 0 && (
                            <Badge color="blue" className="whitespace-nowrap">
                              <UserGroupIcon className="h-3 w-3 mr-1" />
                              {rule.actions.assignTo.length} Personen zuweisen
                            </Badge>
                          )}
                          {rule.actions.addTags && rule.actions.addTags.length > 0 && (
                            <Badge color="purple" className="whitespace-nowrap">
                              <TagIcon className="h-3 w-3 mr-1" />
                              {rule.actions.addTags.length} Tags
                            </Badge>
                          )}
                          {rule.actions.setPriority && rule.actions.setPriority !== 'normal' && (
                            <Badge 
                              color={
                                rule.actions.setPriority === 'high' ? 'orange' : 
                                'zinc'
                              } 
                              className="whitespace-nowrap"
                            >
                              <FlagIcon className="h-3 w-3 mr-1" />
                              {rule.actions.setPriority}
                            </Badge>
                          )}
                          {rule.actions.autoReply && (
                            <Badge color="green" className="whitespace-nowrap">
                              <ArrowPathIcon className="h-3 w-3 mr-1" />
                              Auto-Reply
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        plain
                        onClick={() => handleEditRule(rule)}
                        className="p-1"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        plain
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Rule Button */}
          <Button 
            onClick={handleAddRule}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Neue Regel hinzufügen
          </Button>
        </DialogBody>
        <DialogActions className="px-6 py-4">
          <Button plain onClick={onClose}>
            Abbrechen
          </Button>
          <Button 
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
            onClick={handleSaveAllRules}
            disabled={saving}
          >
            {saving ? 'Speichern...' : 'Regeln speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rule Editor Modal */}
      <Dialog open={showRuleModal} onClose={() => setShowRuleModal(false)}>
        <DialogTitle className="px-6 py-4">
          {editingRule ? 'Regel bearbeiten' : 'Neue Routing-Regel'}
        </DialogTitle>
        <DialogBody className="p-6">
          <div className="space-y-6">
            {/* Rule Name */}
            <Field>
              <Label>Regelname</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Presseanfragen an PR-Team"
              />
            </Field>

            {/* Conditions */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Bedingungen</h3>
              <p className="text-xs text-gray-500 mb-4">
                E-Mails, die mindestens eine dieser Bedingungen erfüllen, werden verarbeitet
              </p>
              
              <div className="space-y-4">
                <Field>
                  <Label>Betreff enthält</Label>
                  <Input
                    value={formData.conditions.subject || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: { ...formData.conditions, subject: e.target.value }
                    })}
                    placeholder="z.B. Presseanfrage"
                  />
                </Field>

                <Field>
                  <Label>Absender enthält</Label>
                  <Input
                    value={formData.conditions.from || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: { ...formData.conditions, from: e.target.value }
                    })}
                    placeholder="z.B. @journalist.de"
                  />
                </Field>

                <Field>
                  <Label>Keywords</Label>
                  <div className="flex gap-2">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                      placeholder="Keyword hinzufügen"
                    />
                    <Button
                      type="button"
                      onClick={handleAddKeyword}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap"
                    >
                      Hinzufügen
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.conditions.keywords?.map(keyword => (
                      <Badge key={keyword} color="zinc" className="whitespace-nowrap">
                        {keyword}
                        <button
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </Field>
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Aktionen</h3>
              <p className="text-xs text-gray-500 mb-4">
                Was soll mit E-Mails passieren, die die Bedingungen erfüllen?
              </p>
              
              <div className="space-y-4">
                <Field>
                  <Label>Team-Mitglieder zuweisen</Label>
                  <Select
                    multiple
                    value={formData.actions.assignTo || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({
                        ...formData,
                        actions: { ...formData.actions, assignTo: selected }
                      });
                    }}
                  >
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Halten Sie Strg/Cmd gedrückt für Mehrfachauswahl
                  </p>
                </Field>

                <Field>
                  <Label>Tags hinzufügen</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="Tag hinzufügen"
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap"
                    >
                      Hinzufügen
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.actions.addTags?.map(tag => (
                      <Badge key={tag} color="purple" className="whitespace-nowrap">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-purple-400 hover:text-purple-600"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </Field>

                <Field>
                  <Label>Priorität setzen</Label>
                  <Select
                    value={formData.actions.setPriority || 'normal'}
                    onChange={(e) => setFormData({
                      ...formData,
                      actions: { 
                        ...formData.actions, 
                        setPriority: e.target.value as 'low' | 'normal' | 'high'
                      }
                    })}
                  >
                    <option value="low">Niedrig</option>
                    <option value="normal">Normal</option>
                    <option value="high">Hoch</option>
                  </Select>
                </Field>

                <Field>
                  <Label>Auto-Reply Template</Label>
                  <Select
                    value={formData.actions.autoReply || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      actions: { ...formData.actions, autoReply: e.target.value }
                    })}
                  >
                    <option value="">Keine automatische Antwort</option>
                    {mockTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogActions className="px-6 py-4">
          <Button plain onClick={() => setShowRuleModal(false)}>
            Abbrechen
          </Button>
          <Button 
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
            onClick={handleSaveRule}
            disabled={!formData.name}
          >
            {editingRule ? 'Speichern' : 'Regel hinzufügen'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}