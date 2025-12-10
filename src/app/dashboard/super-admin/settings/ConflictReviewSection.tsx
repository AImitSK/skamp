'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// TODO: TextArea import issue - using textarea element directly
// import { TextArea } from '@/components/ui/textarea';
import {
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { getOpenConflicts, approveConflict, rejectConflict } from '@/lib/matching/conflict-resolver';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function ConflictReviewSection() {
  const t = useTranslations('superadmin.settings.conflictReview');
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const data = await getOpenConflicts();
      setConflicts(data);
    } catch (error) {
      console.error('Error loading conflicts:', error);
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    if (!user) return;

    const notes = reviewNotes[reviewId] || '';

    const toastId = toast.loading(t('updating'));

    try {
      await approveConflict(reviewId, user.uid, notes);
      toast.success(t('updateSuccess'), { id: toastId });

      // Entferne aus Liste
      setConflicts(conflicts.filter(c => c.id !== reviewId));

    } catch (error) {
      console.error('Error approving conflict:', error);
      toast.error(t('errorApproving'), { id: toastId });
    }
  };

  const handleReject = async (reviewId: string) => {
    if (!user) return;

    const notes = reviewNotes[reviewId] || '';

    const toastId = toast.loading(t('rejecting'));

    try {
      await rejectConflict(reviewId, user.uid, notes);
      toast.success(t('rejectSuccess'), { id: toastId });

      // Entferne aus Liste
      setConflicts(conflicts.filter(c => c.id !== reviewId));

    } catch (error) {
      console.error('Error rejecting conflict:', error);
      toast.error(t('errorRejecting'), { id: toastId });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'zinc';
      default: return 'zinc';
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="text-sm text-zinc-500">{t('loading')}</div>
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="text-center py-8">
          <CheckCircleIcon className="size-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            {t('noConflicts.title')}
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t('noConflicts.description')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          {t('title', { count: conflicts.length })}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {t('description')}
        </p>
      </div>

      <div className="space-y-4">
        {conflicts.map((conflict) => (
          <div
            key={conflict.id}
            className="rounded-lg border-2 border-zinc-200 dark:border-zinc-800 p-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                  {conflict.entityType === 'company' ? '🏢' : '📰'} {conflict.entityName} - {conflict.field}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge color={getPriorityColor(conflict.priority)}>
                    {conflict.priority.toUpperCase()}
                  </Badge>
                  <Badge color="blue">
                    {Math.round(conflict.confidence * 100)}% {t('confidenceBadge')}
                  </Badge>
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <ClockIcon className="size-3" />
                    {t('daysOld', { days: conflict.evidence.currentValueAge })}
                  </div>
                </div>
              </div>
            </div>

            {/* Werte-Vergleich */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Aktueller Wert */}
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <div className="text-xs font-medium text-red-900 dark:text-red-100 mb-2">
                  {t('currentValue.label')}
                </div>
                <div className="text-sm text-red-800 dark:text-red-200 font-mono break-all">
                  {conflict.currentValue || t('currentValue.empty')}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                  {t('currentValue.source')}: {conflict.evidence.currentValueSource}
                </div>
              </div>

              {/* Vorgeschlagener Wert */}
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <div className="text-xs font-medium text-green-900 dark:text-green-100 mb-2">
                  {t('suggestedValue.label', { count: conflict.evidence.newVariantsCount })}
                </div>
                <div className="text-sm text-green-800 dark:text-green-200 font-mono break-all">
                  {conflict.suggestedValue}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                  {t('suggestedValue.variants', {
                    newCount: conflict.evidence.newVariantsCount,
                    totalCount: conflict.evidence.totalVariantsCount
                  })}
                </div>
              </div>
            </div>

            {/* Empfehlung */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 mb-4">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="size-5 text-blue-600" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>{t('recommendation.label')}:</strong> {conflict.confidence >= 0.8 ? t('recommendation.update') : t('recommendation.keep')}
                </div>
              </div>
            </div>

            {/* Notizen */}
            <div className="mb-4">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                {t('notes.label')}
              </label>
              <textarea
                value={reviewNotes[conflict.id!] || ''}
                onChange={(e) => setReviewNotes({
                  ...reviewNotes,
                  [conflict.id!]: e.target.value
                })}
                placeholder={t('notes.placeholder')}
                rows={2}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
              />
            </div>

            {/* Aktionen */}
            <div className="flex justify-end gap-2">
              <Button
                color="secondary"
                onClick={() => handleReject(conflict.id!)}
              >
                <XMarkIcon className="size-4" />
                <span>{t('actions.keepCurrent')}</span>
              </Button>

              <Button
                color="primary"
                onClick={() => handleApprove(conflict.id!)}
              >
                <CheckCircleIcon className="size-4" />
                <span>{t('actions.performUpdate')}</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}