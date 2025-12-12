// src/components/email/RoutingRuleTest.tsx
"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BeakerIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

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

interface TestResult {
  rule: RoutingRule;
  matched: boolean;
  details: {
    conditionResults: Array<{
      type: string;
      value: string;
      matched: boolean;
    }>;
  };
}

interface RoutingRuleTestProps {
  rules: RoutingRule[];
  teamMembers: Array<{ id: string; name: string; email: string }>;
  onClose: () => void;
}

export function RoutingRuleTest({ rules, teamMembers, onClose }: RoutingRuleTestProps) {
  const t = useTranslations('email.routing.testDialog');

  const [testEmail, setTestEmail] = useState({
    from: 'test@example.com',
    subject: t('defaultSubject'),
    content: t('defaultContent')
  });
  
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);

  const testRules = () => {
    const results: TestResult[] = [];
    
    // Nur aktive Regeln testen
    const activeRules = rules.filter(r => r.enabled !== false);
    
    for (const rule of activeRules) {
      const conditionResults = [];
      let allConditionsMet = true;
      
      // Test "from" condition
      if (rule.conditions.from) {
        const matched = testEmail.from.toLowerCase().includes(rule.conditions.from.toLowerCase());
        conditionResults.push({
          type: t('conditionTypes.sender'),
          value: rule.conditions.from,
          matched
        });
        if (!matched) allConditionsMet = false;
      }

      // Test "subject" condition
      if (rule.conditions.subject) {
        const matched = testEmail.subject.toLowerCase().includes(rule.conditions.subject.toLowerCase());
        conditionResults.push({
          type: t('conditionTypes.subject'),
          value: rule.conditions.subject,
          matched
        });
        if (!matched) allConditionsMet = false;
      }

      // Test "keywords" condition
      if (rule.conditions.keywords && rule.conditions.keywords.length > 0) {
        const contentLower = testEmail.content.toLowerCase();
        const keywordMatched = rule.conditions.keywords.some(keyword =>
          contentLower.includes(keyword.toLowerCase())
        );
        conditionResults.push({
          type: t('conditionTypes.keywords'),
          value: rule.conditions.keywords.join(', '),
          matched: keywordMatched
        });
        if (!keywordMatched) allConditionsMet = false;
      }
      
      results.push({
        rule,
        matched: allConditionsMet && conditionResults.length > 0,
        details: { conditionResults }
      });
      
      // Stoppe bei der ersten passenden Regel (wie im echten System)
      if (allConditionsMet && conditionResults.length > 0) {
        break;
      }
    }
    
    setTestResults(results);
  };

  const renderActions = (actions: RoutingRule['actions']) => {
    const parts = [];

    if (actions.assignTo?.length) {
      const names = actions.assignTo.map(id =>
        teamMembers.find(m => m.id === id)?.name || id
      ).join(', ');
      parts.push(
        <div key="assign" className="flex items-center gap-2">
          <ArrowRightIcon className="h-4 w-4 text-gray-400" />
          <span>{t('actions.assignTo')}: <strong>{names}</strong></span>
        </div>
      );
    }

    if (actions.setPriority) {
      parts.push(
        <div key="priority" className="flex items-center gap-2">
          <ArrowRightIcon className="h-4 w-4 text-gray-400" />
          <span>{t('actions.priority')}: <Badge color="purple">{actions.setPriority}</Badge></span>
        </div>
      );
    }

    if (actions.addTags?.length) {
      parts.push(
        <div key="tags" className="flex items-center gap-2">
          <ArrowRightIcon className="h-4 w-4 text-gray-400" />
          <span>{t('actions.tags')}: {actions.addTags.map(tag => (
            <Badge key={tag} color="zinc" className="ml-1">{tag}</Badge>
          ))}</span>
        </div>
      );
    }

    return parts;
  };

  return (
    <Dialog open={true} onClose={onClose} className="sm:max-w-3xl">
      <DialogTitle className="px-6 py-4">
        {t('title')}
      </DialogTitle>
      <DialogBody className="p-6">
        <div className="space-y-6">
          {/* Test-E-Mail Eingabe */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">{t('sectionTitle')}</h3>

            <Field>
              <Label>{t('fields.sender')}</Label>
              <Input
                type="email"
                value={testEmail.from}
                onChange={(e) => setTestEmail({ ...testEmail, from: e.target.value })}
                placeholder={t('placeholders.sender')}
              />
            </Field>

            <Field>
              <Label>{t('fields.subject')}</Label>
              <Input
                value={testEmail.subject}
                onChange={(e) => setTestEmail({ ...testEmail, subject: e.target.value })}
                placeholder={t('placeholders.subject')}
              />
            </Field>

            <Field>
              <Label>{t('fields.content')}</Label>
              <Textarea
                value={testEmail.content}
                onChange={(e) => setTestEmail({ ...testEmail, content: e.target.value })}
                rows={4}
                placeholder={t('placeholders.content')}
              />
            </Field>

            <Button
              onClick={testRules}
              className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              {t('runTest')}
            </Button>
          </div>
          
          {/* Test-Ergebnisse */}
          {testResults && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">{t('results.title')}</h3>

              {testResults.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>{t('results.noActiveRules')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div
                      key={result.rule.id}
                      className={`border rounded-lg p-4 ${
                        result.matched ? 'border-green-300 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{result.rule.name}</h4>
                          <Badge color="zinc" className="text-xs">{t('results.priority', { number: index + 1 })}</Badge>
                        </div>
                        {result.matched ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      
                      {/* Bedingungen */}
                      <div className="space-y-1 mb-3">
                        {result.details.conditionResults.map((condition, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            {condition.matched ? (
                              <CheckCircleIcon className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircleIcon className="h-4 w-4 text-red-600" />
                            )}
                            <span className={condition.matched ? 'text-green-700' : 'text-gray-600'}>
                              {condition.type}: &ldquo;{condition.value}&rdquo;
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Aktionen (nur bei Match anzeigen) */}
                      {result.matched && (
                        <div className="border-t pt-3 space-y-1">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            {t('results.actionsWouldExecute')}
                          </p>
                          {renderActions(result.rule.actions)}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Zusammenfassung */}
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <p className="text-sm font-medium">
                      {testResults.some(r => r.matched) ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4 inline mr-1 text-green-600" />
                          {t('summary.matched', { ruleName: testResults.find(r => r.matched)?.rule.name || '' })}
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-4 w-4 inline mr-1 text-gray-600" />
                          {t('summary.noMatch')}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogBody>
      <DialogActions className="px-6 py-4">
        <Button plain onClick={onClose}>
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}