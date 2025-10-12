// src/app/dashboard/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BellIcon,
  TrashIcon,
  PencilSquareIcon,
  EyeIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  PhotoIcon,
  LinkIcon,
  NewspaperIcon,
  SparklesIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { taskService } from '@/lib/firebase/task-service';
import { projectService } from '@/lib/firebase/project-service';
import { ProjectTask } from '@/types/tasks';
import { Project } from '@/types/project';
import Link from 'next/link';
import { useNotifications } from '@/hooks/use-notifications';
import { Notification } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { de } from 'date-fns/locale';
import { prService } from '@/lib/firebase/pr-service';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { PRCampaign } from '@/types/pr';
import { EmailCampaignSend } from '@/types/email';
import { Select } from '@/components/ui/select';
import { clippingService } from '@/lib/firebase/clipping-service';
import { monitoringSuggestionService } from '@/lib/firebase/monitoring-suggestion-service';
import { MediaClipping, MonitoringSuggestion } from '@/types/monitoring';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

// Komponente für den Welcome-Check mit useSearchParams
function WelcomeCheck({ onWelcome }: { onWelcome: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      onWelcome();
      // URL aufräumen
      const url = new URL(window.location.href);
      url.searchParams.delete('welcome');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, onWelcome]);

  return null;
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const { currentOrganization, organizations, loading: orgLoading, switchOrganization, userRole } = useOrganization();

  // Welcome message für neue Team-Mitglieder
  const [showWelcome, setShowWelcome] = useState(false);

  // Task Management States
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 5;

  // Notifications States
  const { notifications, unreadCount, loading: notificationsLoading, markAsRead, deleteNotification } = useNotifications();
  const [notificationPage, setNotificationPage] = useState(1);
  const notificationsPerPage = 3;

  // Email Performance States
  const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [sends, setSends] = useState<EmailCampaignSend[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingSends, setLoadingSends] = useState(false);

  // PR-Monitoring States
  const [clippings, setClippings] = useState<MediaClipping[]>([]);
  const [suggestions, setSuggestions] = useState<MonitoringSuggestion[]>([]);
  const [loadingMonitoring, setLoadingMonitoring] = useState(true);
  const [monitoringFilter, setMonitoringFilter] = useState<'published' | 'pending'>('published');
  const [monitoringPage, setMonitoringPage] = useState(1);
  const monitoringPerPage = 5;

  // Role Labels
  const roleLabels: Record<string, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Team-Mitglied',
    client: 'Kunde',
    guest: 'Gast'
  };

  // Load tasks when component mounts or organization changes
  useEffect(() => {
    if (currentOrganization?.id && user?.uid) {
      loadTasks();
      loadCampaigns();
      loadMonitoring();
    }
  }, [currentOrganization?.id, user?.uid]);

  // Load sends when campaign selection changes
  useEffect(() => {
    if (selectedCampaignId && currentOrganization?.id) {
      loadSends();
    }
  }, [selectedCampaignId, currentOrganization?.id]);

  const loadCampaigns = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoadingCampaigns(true);

      // Lade alle Kampagnen der Organisation (wie in Monitoring-Seite)
      const allCampaigns = await prService.getAll(currentOrganization.id, true);

      // Prüfe für jede Kampagne ob sie Sends hat
      const campaignsWithSends = await Promise.all(
        allCampaigns.map(async (campaign) => {
          const sends = await emailCampaignService.getSends(campaign.id!, {
            organizationId: currentOrganization.id
          });
          return { campaign, sends };
        })
      );

      // Filtere nur Kampagnen die tatsächlich versendet wurden (haben Sends)
      const sentCampaigns = campaignsWithSends
        .filter(({ sends }) => sends.length > 0)
        .map(({ campaign }) => campaign);

      setCampaigns(sentCampaigns);

      // Wähle die neueste Kampagne automatisch aus
      if (sentCampaigns.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(sentCampaigns[0].id || '');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kampagnen:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const loadSends = async () => {
    if (!currentOrganization?.id || !selectedCampaignId) return;

    try {
      setLoadingSends(true);
      const sendsData = await emailCampaignService.getSends(selectedCampaignId, {
        organizationId: currentOrganization.id
      });
      setSends(sendsData);
    } catch (error) {
      console.error('Fehler beim Laden der Sends:', error);
    } finally {
      setLoadingSends(false);
    }
  };

  const loadMonitoring = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoadingMonitoring(true);

      // Lade alle Kampagnen
      const allCampaigns = await prService.getAll(currentOrganization.id, true);

      // Lade alle Clippings und Suggestions parallel
      const [allClippings, allSuggestions] = await Promise.all([
        // Lade Clippings für alle Kampagnen
        Promise.all(
          allCampaigns.map(campaign =>
            clippingService.getByCampaignId(campaign.id!, {
              organizationId: currentOrganization.id
            })
          )
        ).then(results => results.flat()),

        // Lade Suggestions für alle Kampagnen
        Promise.all(
          allCampaigns.map(campaign =>
            monitoringSuggestionService.getByCampaignId(campaign.id!, currentOrganization.id)
          )
        ).then(results => results.flat())
      ]);

      // Sortiere nach Datum (neueste zuerst)
      const sortedClippings = allClippings.sort((a, b) => {
        const dateA = a.publishedAt?.toDate?.()?.getTime() || 0;
        const dateB = b.publishedAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });

      const sortedSuggestions = allSuggestions.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });

      setClippings(sortedClippings);
      setSuggestions(sortedSuggestions);
    } catch (error) {
      console.error('Fehler beim Laden der Monitoring-Daten:', error);
    } finally {
      setLoadingMonitoring(false);
    }
  };

  const loadTasks = async () => {
    if (!currentOrganization?.id || !user?.uid) return;

    try {
      setLoading(true);

      // Lade alle Projekte der Organisation
      const allProjects = await projectService.getAll({
        organizationId: currentOrganization.id
      });

      // Erstelle Projekt-Lookup Map
      const projectMap: Record<string, Project> = {};
      allProjects.forEach(project => {
        if (project.id) {
          projectMap[project.id] = project;
        }
      });
      setProjects(projectMap);

      // Lade alle Tasks für alle Projekte
      const allTasks: ProjectTask[] = [];
      for (const project of allProjects) {
        if (project.id) {
          const projectTasks = await taskService.getByProjectId(
            currentOrganization.id,
            project.id
          );

          // Füge projectTitle hinzu und filtere nach assignedUserId
          const userTasks = projectTasks
            .filter((task: any) => task.assignedUserId === user.uid)
            .filter((task: any) => task.status !== 'completed')
            .map((task: any) => ({
              ...task,
              projectTitle: project.title
            }));

          allTasks.push(...userTasks);
        }
      }

      // Berechne isOverdue flag
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      allTasks.forEach(task => {
        if (task.dueDate) {
          const dueDate = task.dueDate.toDate();
          const dueDateOnly = new Date(dueDate);
          dueDateOnly.setHours(0, 0, 0, 0);

          if (dueDateOnly.getTime() < today.getTime()) {
            task.isOverdue = true;
          }
        }
      });

      // Sortiere: Überfällig zuerst, dann nach Datum, dann nach Priorität
      allTasks.sort((a, b) => {
        // Überfällige zuerst
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;

        // Dann nach Datum
        if (a.dueDate && b.dueDate) {
          const diff = a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime();
          if (diff !== 0) return diff;
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;

        // Dann nach Priorität
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setTasks(allTasks);
    } catch (error) {
      console.error('Fehler beim Laden der Tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks based on selected filter
  const getFilteredTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today':
        return tasks.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = task.dueDate.toDate();
          const dueDateOnly = new Date(dueDate);
          dueDateOnly.setHours(0, 0, 0, 0);
          return dueDateOnly.getTime() === today.getTime();
        });

      case 'overdue':
        return tasks.filter(task => task.isOverdue);

      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
  const startIndex = (currentPage - 1) * tasksPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + tasksPerPage);

  // Formatiere Datum für Anzeige
  const formatDueDate = (task: ProjectTask) => {
    if (!task.dueDate) return '—';

    const dueDate = task.dueDate.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);

    const diffTime = dueDateOnly.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Morgen';
    if (diffDays === -1) return 'Gestern';
    if (diffDays < 0) return `Überfällig (${Math.abs(diffDays)}d)`;

    return dueDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Progress color
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-green-500';
    if (percent >= 70) return 'bg-blue-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Notification helpers
  const formatNotificationTime = (notification: Notification) => {
    try {
      const date = notification.createdAt.toDate();
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: de
      });
    } catch {
      return 'Kürzlich';
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    const iconClass = "h-5 w-5";

    switch (type) {
      case 'APPROVAL_GRANTED':
        return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
      case 'CHANGES_REQUESTED':
        return <PencilSquareIcon className={`${iconClass} text-orange-600`} />;
      case 'FIRST_VIEW':
        return <EyeIcon className={`${iconClass} text-blue-600`} />;
      case 'OVERDUE_APPROVAL':
        return <ClockIcon className={`${iconClass} text-red-600`} />;
      case 'EMAIL_SENT_SUCCESS':
        return <EnvelopeIcon className={`${iconClass} text-green-600`} />;
      case 'EMAIL_BOUNCED':
        return <ExclamationCircleIcon className={`${iconClass} text-red-600`} />;
      case 'TASK_OVERDUE':
        return <BellIcon className={`${iconClass} text-orange-600`} />;
      case 'MEDIA_FIRST_ACCESS':
      case 'MEDIA_DOWNLOADED':
        return <PhotoIcon className={`${iconClass} text-purple-600`} />;
      case 'MEDIA_LINK_EXPIRED':
        return <LinkIcon className={`${iconClass} text-red-600`} />;
      default:
        return <BellIcon className={`${iconClass} text-zinc-600`} />;
    }
  };

  // Paginate notifications
  const totalNotificationPages = Math.ceil(notifications.length / notificationsPerPage);
  const notificationStartIndex = (notificationPage - 1) * notificationsPerPage;
  const paginatedNotifications = notifications.slice(
    notificationStartIndex,
    notificationStartIndex + notificationsPerPage
  );

  // Email Performance Stats calculation
  const emailStats = {
    total: sends.length,
    sent: sends.filter(s => s.status === 'sent' || s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length,
    delivered: sends.filter(s => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length,
    opened: sends.filter(s => s.status === 'opened' || s.status === 'clicked').length,
    clicked: sends.filter(s => s.status === 'clicked').length,
    bounced: sends.filter(s => s.status === 'bounced').length,
    notOpened: 0
  };

  emailStats.notOpened = emailStats.delivered - emailStats.opened;

  const openRate = emailStats.total > 0 ? Math.round((emailStats.opened / emailStats.total) * 100) : 0;
  const clickRate = emailStats.total > 0 ? Math.round((emailStats.clicked / emailStats.total) * 100) : 0;
  const bounceRate = emailStats.total > 0 ? Math.round((emailStats.bounced / emailStats.total) * 100) : 0;

  const pieData = [
    { name: 'Geklickt', value: emailStats.clicked, color: '#005fab' },
    { name: 'Geöffnet', value: emailStats.opened - emailStats.clicked, color: '#3397d7' },
    { name: 'Zugestellt', value: emailStats.notOpened, color: '#add8f0' },
    { name: 'Bounced', value: emailStats.bounced, color: '#DEDC00' }
  ].filter(item => item.value > 0);

  // PR-Monitoring Filter and Stats
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  const getFilteredMonitoringItems = () => {
    if (monitoringFilter === 'published') {
      return clippings.map(c => ({ type: 'clipping' as const, data: c }));
    }
    if (monitoringFilter === 'pending') {
      return pendingSuggestions.map(s => ({ type: 'suggestion' as const, data: s }));
    }
    return [];
  };

  const filteredMonitoringItems = getFilteredMonitoringItems();
  const totalMonitoringPages = Math.ceil(filteredMonitoringItems.length / monitoringPerPage);
  const monitoringStartIndex = (monitoringPage - 1) * monitoringPerPage;
  const paginatedMonitoringItems = filteredMonitoringItems.slice(
    monitoringStartIndex,
    monitoringStartIndex + monitoringPerPage
  );

  // Sentiment Stats
  const sentimentCounts = {
    positive: clippings.filter(c => c.sentiment === 'positive').length,
    neutral: clippings.filter(c => c.sentiment === 'neutral').length,
    negative: clippings.filter(c => c.sentiment === 'negative').length
  };

  const totalReach = clippings.reduce((sum, c) => sum + (c.reach || 0), 0);

  // Reset page when filter changes
  useEffect(() => {
    setMonitoringPage(1);
  }, [monitoringFilter]);

  // Handler für Suggestion-Bestätigung
  const handleConfirmSuggestion = async (suggestion: MonitoringSuggestion) => {
    if (!user?.uid || !currentOrganization?.id) return;

    try {
      await monitoringSuggestionService.confirmSuggestion(
        suggestion.id!,
        {
          userId: user.uid,
          organizationId: currentOrganization.id
        }
      );
      // Reload monitoring data
      await loadMonitoring();
    } catch (error) {
      console.error('Fehler beim Bestätigen:', error);
    }
  };

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab]"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Suspense Boundary für useSearchParams */}
      <Suspense fallback={null}>
        <WelcomeCheck onWelcome={() => setShowWelcome(true)} />
      </Suspense>

      {/* Welcome Banner für neue Mitglieder */}
      {showWelcome && (
        <div className="mb-8 rounded-lg bg-green-50 border border-green-200 p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Willkommen im Team!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Sie wurden erfolgreich zum Team hinzugefügt. Ihre Rolle: <strong>{roleLabels[userRole || 'member']}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="mt-3 text-sm font-medium text-green-800 hover:text-green-900"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keine Organisation Meldung */}
      {!currentOrganization && organizations.length === 0 && (
        <div className="mb-8 rounded-lg bg-yellow-50 border border-yellow-200 p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Keine Organisation gefunden
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Sie sind derzeit keiner Organisation zugeordnet. Bitte warten Sie auf eine Einladung oder kontaktieren Sie Ihren Administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      {currentOrganization && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Widget - 2/3 Breite */}
          <div className="lg:col-span-2">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <Heading level={2}>Meine Aufgaben</Heading>

              {/* Filter Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter('today')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    filter === 'today'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  Heute
                  {tasks.filter(task => {
                    if (!task.dueDate) return false;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = task.dueDate.toDate();
                    const dueDateOnly = new Date(dueDate);
                    dueDateOnly.setHours(0, 0, 0, 0);
                    return dueDateOnly.getTime() === today.getTime();
                  }).length > 0 && (
                    <Badge color="blue" className="ml-2">
                      {tasks.filter(task => {
                        if (!task.dueDate) return false;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dueDate = task.dueDate.toDate();
                        const dueDateOnly = new Date(dueDate);
                        dueDateOnly.setHours(0, 0, 0, 0);
                        return dueDateOnly.getTime() === today.getTime();
                      }).length}
                    </Badge>
                  )}
                </button>

                <button
                  onClick={() => setFilter('overdue')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    filter === 'overdue'
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  Überfällig
                  {tasks.filter(task => task.isOverdue).length > 0 && (
                    <Badge color="red" className="ml-2">
                      {tasks.filter(task => task.isOverdue).length}
                    </Badge>
                  )}
                </button>

                {filter !== 'all' && (
                  <button
                    onClick={() => setFilter('all')}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50 transition-colors"
                  >
                    Alle anzeigen
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden flex flex-col" style={{ minHeight: '400px' }}>
          {loading ? (
            <>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <Text className="text-zinc-600">Tasks werden geladen...</Text>
                </div>
              </div>
              {/* Pagination */}
              <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50">
                <div className="flex items-center justify-end gap-1">
                  <button
                    disabled
                    className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-3 w-3" />
                  </button>
                  <button
                    disabled
                    className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </>
          ) : filteredTasks.length === 0 ? (
            <>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <CheckCircleIcon className="h-12 w-12 mx-auto text-zinc-300 mb-3" />
                  <Text className="text-zinc-600 font-medium">
                    {filter === 'today' && 'Keine Tasks für heute'}
                    {filter === 'overdue' && 'Keine überfälligen Tasks'}
                    {filter === 'all' && 'Keine offenen Tasks'}
                  </Text>
                  <Text className="text-zinc-500 text-sm mt-1">
                    Gut gemacht! 🎉
                  </Text>
                </div>
              </div>
              {/* Pagination */}
              <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50">
                <div className="flex items-center justify-end gap-1">
                  <button
                    disabled
                    className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-3 w-3" />
                  </button>
                  <button
                    disabled
                    className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Table Header */}
              <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Task
                  </div>
                  <div className="col-span-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Projekt
                  </div>
                  <div className="col-span-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Fortschritt
                  </div>
                </div>
              </div>

              {/* Table Body */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-200">
                {paginatedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="px-6 py-4 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Task */}
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {task.status === 'completed' ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          ) : task.isOverdue ? (
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                          ) : (
                            <ClockIcon className="h-5 w-5 text-orange-500" />
                          )}
                        </div>

                        {/* Task Title */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Text className="text-sm font-medium text-zinc-900 truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.title}>
                              {task.title}
                            </Text>
                            {task.priority === 'urgent' && (
                              <Badge color="red" className="text-xs flex-shrink-0">Dringend</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Projekt */}
                      <div className="col-span-4 min-w-0">
                        {task.projectId && task.projectTitle ? (
                          <Link
                            href={`/dashboard/projects/${task.projectId}`}
                            className="text-sm text-primary hover:text-primary-hover hover:underline truncate whitespace-nowrap overflow-hidden text-ellipsis block"
                            title={task.projectTitle}
                          >
                            {task.projectTitle}
                          </Link>
                        ) : (
                          <Text className="text-sm text-zinc-500">—</Text>
                        )}
                      </div>

                      {/* Fortschritt */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-zinc-200 rounded-full h-2">
                            <div
                              className={`${getProgressColor(task.progress || 0)} rounded-full h-2 transition-all duration-500`}
                              style={{ width: `${task.progress || 0}%` }}
                            ></div>
                          </div>
                          <Text className="text-xs text-zinc-500 w-10 text-right">
                            {Math.round(task.progress || 0)}%
                          </Text>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || totalPages <= 1}
                    className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="h-3 w-3" />
                  </button>

                  {totalPages > 1 && Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage === 1) {
                      pageNum = i + 1;
                    } else if (currentPage === totalPages) {
                      pageNum = totalPages - 2 + i;
                    } else {
                      pageNum = currentPage - 1 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {totalPages > 3 && currentPage < totalPages - 1 && (
                    <span className="text-zinc-500 text-xs">...</span>
                  )}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || totalPages <= 1}
                    className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRightIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </>
          )}
          </div>
          </div>

          {/* Benachrichtigungs Widget - 1/3 Breite */}
          <div className="lg:col-span-1">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between" style={{ minHeight: '41.19px' }}>
                <Heading level={2}>Benachrichtigungen</Heading>
                {unreadCount > 0 && (
                  <Badge color="blue">{unreadCount}</Badge>
                )}
              </div>
            </div>

            {/* Notifications Box */}
            <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden flex flex-col" style={{ minHeight: '400px' }}>
              {notificationsLoading ? (
                <>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                      <Text className="text-zinc-600">Laden...</Text>
                    </div>
                  </div>
                  {/* Pagination */}
                  <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        disabled
                        className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed"
                      >
                        <ChevronLeftIcon className="h-3 w-3" />
                      </button>
                      <button
                        disabled
                        className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed"
                      >
                        <ChevronRightIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </>
              ) : notifications.length === 0 ? (
                <>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <BellIcon className="h-12 w-12 mx-auto text-zinc-300 mb-3" />
                      <Text className="text-zinc-600 font-medium">
                        Keine Benachrichtigungen
                      </Text>
                      <Text className="text-zinc-500 text-sm mt-1">
                        Alles erledigt! 🎉
                      </Text>
                    </div>
                  </div>
                  {/* Pagination */}
                  <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        disabled
                        className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed"
                      >
                        <ChevronLeftIcon className="h-3 w-3" />
                      </button>
                      <button
                        disabled
                        className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed"
                      >
                        <ChevronRightIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Notifications List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-zinc-200">
                    {paginatedNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-zinc-50 cursor-pointer transition-colors ${
                          notification.isRead
                            ? 'bg-white'
                            : 'bg-blue-50'
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Icon & Content */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate whitespace-nowrap overflow-hidden text-ellipsis ${
                                notification.isRead ? 'text-zinc-700' : 'text-zinc-900'
                              }`} title={notification.title}>
                                {notification.title}
                              </p>
                              <p className={`text-xs mt-1 line-clamp-2 ${
                                notification.isRead ? 'text-zinc-500' : 'text-zinc-600'
                              }`}>
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <ClockIcon className="h-3 w-3 text-zinc-400" />
                                <span className="text-xs text-zinc-400">
                                  {formatNotificationTime(notification)}
                                </span>
                                {!notification.isRead && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Neu
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0"
                            title="Löschen"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setNotificationPage(prev => Math.max(1, prev - 1))}
                        disabled={notificationPage === 1 || totalNotificationPages <= 1}
                        className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeftIcon className="h-3 w-3" />
                      </button>

                      {totalNotificationPages > 1 && Array.from({ length: Math.min(3, totalNotificationPages) }, (_, i) => {
                        let pageNum;
                        if (totalNotificationPages <= 3) {
                          pageNum = i + 1;
                        } else if (notificationPage === 1) {
                          pageNum = i + 1;
                        } else if (notificationPage === totalNotificationPages) {
                          pageNum = totalNotificationPages - 2 + i;
                        } else {
                          pageNum = notificationPage - 1 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setNotificationPage(pageNum)}
                            className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                              notificationPage === pageNum
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {totalNotificationPages > 3 && notificationPage < totalNotificationPages - 1 && (
                        <span className="text-zinc-500 text-xs">...</span>
                      )}

                      <button
                        onClick={() => setNotificationPage(prev => Math.min(totalNotificationPages, prev + 1))}
                        disabled={notificationPage === totalNotificationPages || totalNotificationPages <= 1}
                        className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRightIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* E-Mail Performance Widget - Full Width */}
          <div className="lg:col-span-3 mt-6">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <Heading level={2}>E-Mail Performance</Heading>
              {campaigns.length > 0 && (
                <div className="ml-auto" style={{ width: '400px' }}>
                  <Select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                  >
                    <option value="">Kampagne auswählen</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.title}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Performance Box */}
          <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden p-6">
            {loadingCampaigns ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <Text className="text-zinc-600">Lade Kampagnen...</Text>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="p-12 text-center">
                <EnvelopeIcon className="h-12 w-12 mx-auto text-zinc-300 mb-3" />
                <Text className="text-zinc-600 font-medium">
                  Keine versendeten Kampagnen
                </Text>
                <Text className="text-zinc-500 text-sm mt-1">
                  Versende deine erste Kampagne, um Performance-Daten zu sehen
                </Text>
              </div>
            ) : !selectedCampaignId ? (
              <div className="p-12 text-center">
                <Text className="text-zinc-600">Bitte wähle eine Kampagne aus</Text>
              </div>
            ) : loadingSends ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <Text className="text-zinc-600">Lade Performance-Daten...</Text>
              </div>
            ) : sends.length === 0 ? (
              <div className="p-12 text-center">
                <Text className="text-zinc-600">Keine Daten verfügbar</Text>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
                    <Text className="text-sm text-zinc-600">Öffnungsrate</Text>
                    <div className="text-2xl font-semibold text-zinc-900 mt-1">
                      {openRate}%
                    </div>
                  </div>

                  <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
                    <Text className="text-sm text-zinc-600">Klickrate</Text>
                    <div className="text-2xl font-semibold text-zinc-900 mt-1">
                      {clickRate}%
                    </div>
                  </div>

                  <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
                    <Text className="text-sm text-zinc-600">Engagement</Text>
                    <div className="text-2xl font-semibold text-zinc-900 mt-1">
                      {emailStats.opened + emailStats.clicked}
                    </div>
                  </div>

                  <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
                    <Text className="text-sm text-zinc-600">Bounce-Rate</Text>
                    <div className="text-2xl font-semibold text-zinc-900 mt-1">
                      {bounceRate}%
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div>
                    <Text className="text-lg font-semibold text-zinc-900 mb-4">Status-Verteilung</Text>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {pieData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                          <Text className="text-sm text-zinc-600">{item.name}: {item.value}</Text>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats Summary */}
                  <div>
                    <Text className="text-lg font-semibold text-zinc-900 mb-4">Zusammenfassung</Text>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg">
                        <Text className="text-sm text-zinc-600">Versendet</Text>
                        <Text className="text-sm font-semibold text-zinc-900">{emailStats.sent}</Text>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg">
                        <Text className="text-sm text-zinc-600">Zugestellt</Text>
                        <Text className="text-sm font-semibold text-zinc-900">{emailStats.delivered}</Text>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <Text className="text-sm text-blue-600 font-medium">Geöffnet</Text>
                        <Text className="text-sm font-semibold text-blue-900">{emailStats.opened}</Text>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                        <Text className="text-sm text-primary font-medium">Geklickt</Text>
                        <Text className="text-sm font-semibold text-primary">{emailStats.clicked}</Text>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                        <Text className="text-sm text-yellow-700">Bounced</Text>
                        <Text className="text-sm font-semibold text-yellow-900">{emailStats.bounced}</Text>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* PR-Monitoring Widget - 2/3 Breite */}
          <div className="lg:col-span-2 mt-6">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <Heading level={2}>PR-Monitoring</Heading>

                {/* Filter Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMonitoringFilter('published')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      monitoringFilter === 'published'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    Veröffentlichungen
                    {clippings.length > 0 && (
                      <Badge color="blue" className="ml-2">
                        {clippings.length}
                      </Badge>
                    )}
                  </button>

                  <button
                    onClick={() => setMonitoringFilter('pending')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      monitoringFilter === 'pending'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    Auto-Funde
                    {pendingSuggestions.length > 0 && (
                      <Badge color="red" className="ml-2">
                        {pendingSuggestions.length}
                      </Badge>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden flex flex-col" style={{ minHeight: '400px' }}>
              {loadingMonitoring ? (
                <>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                      <Text className="text-zinc-600">Lade Monitoring-Daten...</Text>
                    </div>
                  </div>
                  <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50">
                    <div className="flex items-center justify-end gap-1">
                      <button disabled className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed">
                        <ChevronLeftIcon className="h-3 w-3" />
                      </button>
                      <button disabled className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed">
                        <ChevronRightIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </>
              ) : filteredMonitoringItems.length === 0 ? (
                <>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <NewspaperIcon className="h-12 w-12 mx-auto text-zinc-300 mb-3" />
                      <Text className="text-zinc-600 font-medium">
                        {monitoringFilter === 'published' && 'Noch keine Veröffentlichungen'}
                        {monitoringFilter === 'pending' && 'Keine Auto-Funde'}
                      </Text>
                    </div>
                  </div>
                  <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50">
                    <div className="flex items-center justify-end gap-1">
                      <button disabled className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed">
                        <ChevronLeftIcon className="h-3 w-3" />
                      </button>
                      <button disabled className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed">
                        <ChevronRightIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-1 text-xs font-medium text-zinc-500 uppercase tracking-wider">Typ</div>
                      <div className="col-span-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Titel</div>
                      <div className="col-span-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Medium</div>
                      <div className="col-span-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</div>
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="flex-1 overflow-y-auto divide-y divide-zinc-200">
                    {paginatedMonitoringItems.map((item, idx) => (
                      <div key={`${item.type}-${item.type === 'clipping' ? (item.data as MediaClipping).id : (item.data as MonitoringSuggestion).id}-${idx}`} className="px-6 py-4 hover:bg-zinc-50 transition-colors">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          {/* Typ Icon */}
                          <div className="col-span-1">
                            {item.type === 'clipping' ? (
                              <NewspaperIcon className="h-5 w-5 text-zinc-500" title="Veröffentlichung" />
                            ) : (
                              <SparklesIcon className="h-5 w-5 text-zinc-500" title="Auto-Fund" />
                            )}
                          </div>

                          {/* Titel */}
                          <div className="col-span-6 min-w-0">
                            {item.type === 'clipping' ? (
                              <a
                                href={(item.data as MediaClipping).url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-primary hover:text-primary-hover hover:underline truncate whitespace-nowrap overflow-hidden text-ellipsis block"
                                title={(item.data as MediaClipping).title}
                              >
                                {(item.data as MediaClipping).title}
                              </a>
                            ) : (
                              <a
                                href={(item.data as MonitoringSuggestion).articleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-zinc-900 hover:text-primary hover:underline truncate whitespace-nowrap overflow-hidden text-ellipsis block"
                                title={(item.data as MonitoringSuggestion).articleTitle}
                              >
                                {(item.data as MonitoringSuggestion).articleTitle}
                              </a>
                            )}
                          </div>

                          {/* Medium */}
                          <div className="col-span-3 min-w-0">
                            <Text className="text-sm text-zinc-600 truncate whitespace-nowrap overflow-hidden text-ellipsis">
                              {item.type === 'clipping'
                                ? (item.data as MediaClipping).outletName
                                : (item.data as MonitoringSuggestion).sources?.[0]?.sourceName || 'Unbekannt'}
                            </Text>
                          </div>

                          {/* Status / Sentiment + Aktion */}
                          <div className="col-span-2 flex items-center gap-2">
                            {item.type === 'clipping' ? (
                              <>
                                {(item.data as MediaClipping).sentiment === 'positive' && (
                                  <FaceSmileIcon className="h-5 w-5 text-zinc-400" title="Positiv" />
                                )}
                                {(item.data as MediaClipping).sentiment === 'neutral' && (
                                  <div className="h-5 w-5 rounded-full bg-zinc-400" title="Neutral" />
                                )}
                                {(item.data as MediaClipping).sentiment === 'negative' && (
                                  <FaceFrownIcon className="h-5 w-5 text-zinc-400" title="Negativ" />
                                )}
                                <CalendarIcon className="h-4 w-4 text-zinc-400" />
                                <Text className="text-xs text-zinc-500">
                                  {(item.data as MediaClipping).publishedAt?.toDate?.()?.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                                </Text>
                              </>
                            ) : (
                              <button
                                onClick={() => handleConfirmSuggestion(item.data as MonitoringSuggestion)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                              >
                                Bestätigen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setMonitoringPage(prev => Math.max(1, prev - 1))}
                        disabled={monitoringPage === 1 || totalMonitoringPages <= 1}
                        className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeftIcon className="h-3 w-3" />
                      </button>

                      {totalMonitoringPages > 1 && Array.from({ length: Math.min(3, totalMonitoringPages) }, (_, i) => {
                        let pageNum;
                        if (totalMonitoringPages <= 3) {
                          pageNum = i + 1;
                        } else if (monitoringPage === 1) {
                          pageNum = i + 1;
                        } else if (monitoringPage === totalMonitoringPages) {
                          pageNum = totalMonitoringPages - 2 + i;
                        } else {
                          pageNum = monitoringPage - 1 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setMonitoringPage(pageNum)}
                            className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                              monitoringPage === pageNum
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {totalMonitoringPages > 3 && monitoringPage < totalMonitoringPages - 1 && (
                        <span className="text-zinc-500 text-xs">...</span>
                      )}

                      <button
                        onClick={() => setMonitoringPage(prev => Math.min(totalMonitoringPages, prev + 1))}
                        disabled={monitoringPage === totalMonitoringPages || totalMonitoringPages <= 1}
                        className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRightIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* News Platzhalter - 1/3 Breite */}
          <div className="lg:col-span-1 mt-6">
            <div className="mb-4">
              <div className="flex items-center justify-between" style={{ minHeight: '41.19px' }}>
                <Heading level={2}>News & Updates</Heading>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden flex flex-col p-6" style={{ minHeight: '400px' }}>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <NewspaperIcon className="h-12 w-12 mx-auto text-zinc-300 mb-3" />
                  <Text className="text-zinc-600 font-medium">Coming Soon</Text>
                  <Text className="text-zinc-500 text-sm mt-1">
                    Hier erscheinen bald News und Updates
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
