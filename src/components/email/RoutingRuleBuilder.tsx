// src/components/email/RoutingRuleBuilder.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox, CheckboxField, CheckboxGroup } from '@/components/ui/checkbox';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';
import { 
  PlusIcon, 
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/20/solid';

interface RoutingRule {
  id: string;
  name: string;
  enabled?: boolean;
  priority?: number;
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
}

interface RoutingRuleBuilderProps {
  rule: RoutingRule | null;
  teamMembers: Array<{ id: string; name: string; email: string }>;
  onSave: (rule: RoutingRule) => void;
  onClose: () => void;
  saving?: boolean;
}

export function RoutingRuleBuilder({
  rule,
  teamMembers,
  onSave,
  onClose,
  saving = false
}: RoutingRuleBuilderProps) {
  const [formData, setFormData] = useState<RoutingRule>({
    id: '',
    name: '',
    enabled: true,
    conditions: {},
    actions: {}
  });
  
  const [keywordInput, setKeywordInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (rule) {
      setFormData(rule);
    } else {
      setFormData({
        id: '',
        name: '',
        enabled: true,
        conditions: {},
        actions: {}
      });
    }
  }, [rule]);

  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return;
    
    const keywords = formData.conditions.keywords || [];
    if (!keywords.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        conditions: {
          ...formData.conditions,
          keywords: [...keywords, keywordInput.trim()]
        }
      });
    }
    setKeywordInput('');
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
    if (!tagInput.trim()) return;
    
    const tags = formData.actions.addTags || [];
    if (!tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        actions: {
          ...formData.actions,
          addTags: [...tags, tagInput.trim()]
        }
      });
    }
    setTagInput('');
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

  const handleTeamMemberToggle = (memberId: string, checked: boolean) => {
    const currentAssigned = formData.actions.assignTo || [];
    
    if (checked) {
      setFormData({
        ...formData,
        actions: {
          ...formData.actions,
          assignTo: [...currentAssigned, memberId]
        }
      });
    } else {
      setFormData({
        ...formData,
        actions: {
          ...formData.actions,
          assignTo: currentAssigned.filter(id => id !== memberId)
        }
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }
    
    // Mindestens eine Bedingung muss gesetzt sein
    const hasCondition = formData.conditions.subject || 
                        formData.conditions.from || 
                        (formData.conditions.keywords && formData.conditions.keywords.length > 0);
    
    if (!hasCondition) {
      newErrors.conditions = 'Mindestens eine Bedingung muss definiert sein';
    }
    
    // Mindestens eine Aktion muss gesetzt sein
    const hasAction = (formData.actions.assignTo && formData.actions.assignTo.length > 0) ||
                     (formData.actions.addTags && formData.actions.addTags.length > 0) ||
                     formData.actions.setPriority ||
                     formData.actions.autoReply;
    
    if (!hasAction) {
      newErrors.actions = 'Mindestens eine Aktion muss definiert sein';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(formData);
  };

  return (
    <Dialog open={true} onClose={onClose} className="sm:max-w-2xl">
      <DialogTitle className="px-6 py-4">
        {rule ? 'Regel bearbeiten' : 'Neue Regel erstellen'}
      </DialogTitle>
      <DialogBody className="p-6">
        <div className="space-y-6">
          {/* Regel-Name */}
          <Field>
            <Label>Regelname *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="z.B. Wichtige Journalisten"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </Field>

          {/* Bedingungen */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Bedingungen (WENN)</h3>
            {errors.conditions && (
              <p className="text-sm text-red-600">{errors.conditions}</p>
            )}
            
            <Field>
              <Label>Absender enthält</Label>
              <Input
                value={formData.conditions.from || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  conditions: { ...formData.conditions, from: e.target.value }
                })}
                placeholder="z.B. @spiegel.de oder max.mustermann@"
              />
              <p className="text-xs text-gray-500 mt-1">
                E-Mail-Adresse oder Domain des Absenders
              </p>
            </Field>

            <Field>
              <Label>Betreff enthält</Label>
              <Input
                value={formData.conditions.subject || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  conditions: { ...formData.conditions, subject: e.target.value }
                })}
                placeholder="z.B. Urgent, Interview"
              />
            </Field>

            <Field>
              <Label>Schlüsselwörter im Inhalt</Label>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="Keyword eingeben und Enter drücken"
                />
                <Button type="button" plain onClick={handleAddKeyword}>
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
              {formData.conditions.keywords && formData.conditions.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.conditions.keywords.map((keyword) => (
                    <Badge key={keyword} color="blue">
                      {keyword}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="ml-1.5 hover:text-blue-800"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </Field>
          </div>

          {/* Aktionen */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Aktionen (DANN)</h3>
            {errors.actions && (
              <p className="text-sm text-red-600">{errors.actions}</p>
            )}
            
            {/* Team-Zuweisung */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">An Team-Mitglieder zuweisen</span>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                {teamMembers.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.actions.assignTo?.includes(member.id) || false}
                      onChange={(checked) => handleTeamMemberToggle(member.id, checked)}
                    />
                    <span className="text-sm">
                      {member.name} ({member.email})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priorität */}
            <Field>
              <Label>Priorität setzen</Label>
              <Select
                value={formData.actions.setPriority || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  actions: { 
                    ...formData.actions, 
                    setPriority: e.target.value as any || undefined 
                  }
                })}
              >
                <option value="">Keine Änderung</option>
                <option value="low">Niedrig</option>
                <option value="normal">Normal</option>
                <option value="high">Hoch</option>
              </Select>
            </Field>

            {/* Tags */}
            <Field>
              <Label>Tags hinzufügen</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Tag eingeben und Enter drücken"
                />
                <Button type="button" plain onClick={handleAddTag}>
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
              {formData.actions.addTags && formData.actions.addTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.actions.addTags.map((tag) => (
                    <Badge key={tag} color="purple">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1.5 hover:text-purple-800"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </Field>

            {/* Auto-Reply (Placeholder) */}
            <div className="opacity-50">
              <span className="block text-sm font-medium text-gray-700 mb-1">Auto-Antwort (Coming Soon)</span>
              <Select disabled>
                <option>Vorlage wählen...</option>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Diese Funktion wird in einer zukünftigen Version verfügbar sein
              </p>
            </div>
          </div>

          {/* Regel aktiv */}
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm font-medium text-gray-700">Regel aktiv</span>
            <SimpleSwitch
              checked={formData.enabled !== false}
              onChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
          </div>
        </div>
      </DialogBody>
      <DialogActions className="px-6 py-4">
        <Button plain onClick={onClose}>
          Abbrechen
        </Button>
        <Button
          className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Speichern...' : (rule ? 'Speichern' : 'Regel erstellen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}