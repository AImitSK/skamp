// src/components/email/RoutingRuleEditor.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';
import { EmailAddress } from '@/types/email-enhanced';
import { emailAddressService } from '@/lib/email/email-address-service';
import { RoutingRuleBuilder } from './RoutingRuleBuilder';
import { RoutingRuleTest } from './RoutingRuleTest';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  BeakerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PlayIcon
} from '@heroicons/react/20/solid';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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

interface RoutingRuleEditorProps {
  emailAddress: EmailAddress;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  teamMembers: Array<{ id: string; name: string; email: string }>;
}

export function RoutingRuleEditor({ 
  emailAddress, 
  isOpen, 
  onClose, 
  onUpdate,
  teamMembers 
}: RoutingRuleEditorProps) {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (emailAddress.routingRules) {
      // Erweitere die Regeln mit priority falls nicht vorhanden
      const rulesWithPriority = emailAddress.routingRules.map((rule, index) => ({
        ...rule,
        priority: (rule as any).priority ?? index,
        enabled: (rule as any).enabled ?? true
      }));
      // Sortiere Regeln nach Priorität
      const sortedRules = rulesWithPriority.sort((a, b) => 
        (a.priority || 999) - (b.priority || 999)
      );
      setRules(sortedRules as RoutingRule[]);
    }
  }, [emailAddress]);

  const handleAddRule = () => {
    setEditingRule(null);
    setShowBuilder(true);
  };

  const handleEditRule = (rule: RoutingRule) => {
    setEditingRule(rule);
    setShowBuilder(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Möchten Sie diese Regel wirklich löschen?')) return;
    
    try {
      setSaving(true);
      await emailAddressService.removeRoutingRule(
        emailAddress.id!,
        ruleId,
        emailAddress.userId
      );
      
      setRules(rules.filter(r => r.id !== ruleId));
      onUpdate();
    } catch (error) {
      console.error('Fehler beim Löschen der Regel:', error);
      alert('Fehler beim Löschen der Regel');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRule = async (rule: RoutingRule) => {
    try {
      setSaving(true);
      
      if (editingRule) {
        // Update existing rule
        const updatedRules = rules.map(r => 
          r.id === editingRule.id ? rule : r
        );
        setRules(updatedRules);
        
        // Update in backend - use a workaround
        // First remove the old rule
        await emailAddressService.removeRoutingRule(
          emailAddress.id!,
          editingRule.id,
          emailAddress.userId
        );
        // Then add the updated rule
        await emailAddressService.addRoutingRule(
          emailAddress.id!,
          rule,
          emailAddress.userId
        );
      } else {
        // Add new rule
        const newRule = {
          ...rule,
          id: `rule_${Date.now()}`,
          priority: rules.length,
          enabled: true
        };
        
        await emailAddressService.addRoutingRule(
          emailAddress.id!,
          newRule,
          emailAddress.userId
        );
        
        setRules([...rules, newRule]);
      }
      
      setShowBuilder(false);
      onUpdate();
    } catch (error) {
      console.error('Fehler beim Speichern der Regel:', error);
      alert('Fehler beim Speichern der Regel');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const updatedRules = rules.map(r => 
        r.id === ruleId ? { ...r, enabled } : r
      );
      setRules(updatedRules);
      
      // Workaround: Remove and re-add all rules with updated state
      const rule = rules.find(r => r.id === ruleId);
      if (rule) {
        await emailAddressService.removeRoutingRule(
          emailAddress.id!,
          ruleId,
          emailAddress.userId
        );
        await emailAddressService.addRoutingRule(
          emailAddress.id!,
          { ...rule, enabled },
          emailAddress.userId
        );
      }
      
      onUpdate();
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Regel:', error);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(rules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update priorities
    const updatedRules = items.map((rule, index) => ({
      ...rule,
      priority: index
    }));
    
    setRules(updatedRules);
    
    try {
      // Workaround: For now, just update the local state
      // In production, you would need to implement a batch update
      console.log('Neue Reihenfolge gespeichert:', updatedRules);
      onUpdate();
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Reihenfolge:', error);
    }
  };

  const toggleExpanded = (ruleId: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedRules(newExpanded);
  };

  const renderConditions = (conditions: RoutingRule['conditions']) => {
    const parts = [];
    if (conditions.from) parts.push(`Absender: ${conditions.from}`);
    if (conditions.subject) parts.push(`Betreff: ${conditions.subject}`);
    if (conditions.keywords?.length) parts.push(`Keywords: ${conditions.keywords.join(', ')}`);
    return parts.join(' • ');
  };

  const renderActions = (actions: RoutingRule['actions']) => {
    const parts = [];
    if (actions.assignTo?.length) {
      const names = actions.assignTo.map(id => 
        teamMembers.find(m => m.id === id)?.name || id
      ).join(', ');
      parts.push(`Zuweisen an: ${names}`);
    }
    if (actions.setPriority) parts.push(`Priorität: ${actions.setPriority}`);
    if (actions.addTags?.length) parts.push(`Tags: ${actions.addTags.join(', ')}`);
    if (actions.autoReply) parts.push('Auto-Antwort');
    return parts.join(' • ');
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="sm:max-w-4xl">
        <DialogTitle className="px-6 py-4">
          Routing-Regeln für {emailAddress.email}
        </DialogTitle>
        <DialogBody className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Definieren Sie automatische Weiterleitungs- und Zuweisungsregeln basierend auf E-Mail-Eigenschaften.
              Regeln werden in der angegebenen Reihenfolge ausgeführt.
            </p>
          </div>

          {rules.length > 0 ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="rules">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {rules.map((rule, index) => (
                      <Draggable key={rule.id} draggableId={rule.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border rounded-lg transition-all ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            } ${rule.enabled === false ? 'opacity-60' : ''}`}
                          >
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3 flex-1">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-move text-gray-400 hover:text-gray-600"
                                  >
                                    <ArrowsUpDownIcon className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium">{rule.name}</h4>
                                      <Badge color="zinc" className="text-xs whitespace-nowrap">
                                        Priorität {index + 1}
                                      </Badge>
                                      {rule.enabled === false && (
                                        <Badge color="red" className="text-xs whitespace-nowrap">
                                          Deaktiviert
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <SimpleSwitch
                                    checked={rule.enabled !== false}
                                    onChange={(checked) => handleToggleRule(rule.id, checked)}
                                  />
                                  <Button
                                    plain
                                    onClick={() => toggleExpanded(rule.id)}
                                    className="p-1"
                                  >
                                    {expandedRules.has(rule.id) ? (
                                      <ChevronUpIcon className="h-4 w-4" />
                                    ) : (
                                      <ChevronDownIcon className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button plain onClick={() => handleEditRule(rule)} className="p-1">
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
                              
                              {expandedRules.has(rule.id) && (
                                <div className="mt-3 text-sm text-gray-600 space-y-2">
                                  <div>
                                    <strong>Wenn:</strong> {renderConditions(rule.conditions)}
                                  </div>
                                  <div>
                                    <strong>Dann:</strong> {renderActions(rule.actions)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FunnelIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Keine Routing-Regeln definiert</p>
              <p className="text-sm mt-1">Erstellen Sie Regeln, um E-Mails automatisch zu verarbeiten</p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button 
              className="flex-1 bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
              onClick={handleAddRule}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Neue Regel hinzufügen
            </Button>
            <Button
              plain
              onClick={() => setShowTest(true)}
              disabled={rules.length === 0}
              className="whitespace-nowrap"
            >
              <BeakerIcon className="h-4 w-4 mr-2" />
              Regeln testen
            </Button>
          </div>
        </DialogBody>
        <DialogActions className="px-6 py-4">
          <Button plain onClick={onClose}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rule Builder Modal */}
      {showBuilder && (
        <RoutingRuleBuilder
          rule={editingRule}
          teamMembers={teamMembers}
          onSave={handleSaveRule}
          onClose={() => {
            setShowBuilder(false);
            setEditingRule(null);
          }}
          saving={saving}
        />
      )}

      {/* Test Modal */}
      {showTest && (
        <RoutingRuleTest
          rules={rules}
          teamMembers={teamMembers}
          onClose={() => setShowTest(false)}
        />
      )}
    </>
  );
}