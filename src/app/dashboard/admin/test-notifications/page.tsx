// src/app/dashboard/admin/test-notifications/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field, Label } from "@/components/ui/fieldset";
import { notificationsService } from "@/lib/firebase/notifications-service";
import { NotificationType, NOTIFICATION_TEMPLATES } from "@/types/notifications";
import { 
  BeakerIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  RocketLaunchIcon
} from "@heroicons/react/20/solid";

// Mock data for testing
const mockCampaign = {
  id: "test-campaign-123",
  title: "Test Kampagne 2024",
  name: "Test Kampagne 2024"
};

const mockShareLink = {
  id: "test-share-123",
  assetName: "Test-Dokument.pdf"
};

export default function TestNotificationsPage() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<NotificationType>("APPROVAL_GRANTED");
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testingCron, setTestingCron] = useState(false);

  // Custom values for testing
  const [customValues, setCustomValues] = useState({
    senderName: "Max Mustermann",
    recipientCount: "42",
    daysOverdue: "3",
    bouncedEmail: "test@example.com"
  });

  const notificationTypes: { value: NotificationType; label: string }[] = [
    { value: "APPROVAL_GRANTED", label: "Freigabe erteilt" },
    { value: "CHANGES_REQUESTED", label: "Änderungen erbeten" },
    { value: "OVERDUE_APPROVAL", label: "Überfällige Freigabe" },
    { value: "EMAIL_SENT_SUCCESS", label: "E-Mail erfolgreich versendet" },
    { value: "EMAIL_BOUNCED", label: "E-Mail Bounce" },
    { value: "TASK_OVERDUE", label: "Task überfällig" },
    { value: "MEDIA_FIRST_ACCESS", label: "Erster Media-Zugriff" },
    { value: "MEDIA_DOWNLOADED", label: "Media heruntergeladen" },
    { value: "MEDIA_LINK_EXPIRED", label: "Media-Link abgelaufen" }
  ];

  const handleCreateNotification = async () => {
    if (!user) return;

    setCreating(true);
    setError(null);
    setSuccess(false);

    try {
      // Create test notification based on type
      switch (selectedType) {
        case "APPROVAL_GRANTED":
          await notificationsService.notifyApprovalGranted(
            mockCampaign,
            customValues.senderName,
            user.uid
          );
          break;
          
        case "CHANGES_REQUESTED":
          await notificationsService.notifyChangesRequested(
            mockCampaign,
            customValues.senderName,
            user.uid
          );
          break;
          
        case "EMAIL_SENT_SUCCESS":
          await notificationsService.notifyEmailSent(
            mockCampaign,
            parseInt(customValues.recipientCount),
            user.uid
          );
          break;
          
        case "EMAIL_BOUNCED":
          await notificationsService.notifyEmailBounced(
            mockCampaign,
            customValues.bouncedEmail,
            user.uid
          );
          break;
          
        case "MEDIA_FIRST_ACCESS":
          await notificationsService.notifyMediaAccessed(
            mockShareLink,
            user.uid
          );
          break;
          
        case "MEDIA_DOWNLOADED":
          await notificationsService.notifyMediaDownloaded(
            mockShareLink,
            mockShareLink.assetName,
            user.uid,
            "test-org-123"
          );
          break;
          
        default:
          // For other types, create manually
          await notificationsService.create({
            userId: user.uid,
            type: selectedType,
            title: getNotificationTitle(selectedType),
            message: getNotificationMessage(selectedType, customValues),
            linkUrl: getNotificationLink(selectedType),
            linkType: getLinkType(selectedType),
            linkId: "test-123",
            isRead: false,
            metadata: getMetadata(selectedType, customValues)
          });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error creating test notification:", err);
      setError(err.message || "Fehler beim Erstellen der Benachrichtigung");
    } finally {
      setCreating(false);
    }
  };

  const handleTestCronJob = async () => {
    if (!user) return;
    
    setTestingCron(true);
    setError(null);

    try {
      // Importiere die Test-Funktion direkt
      const { testCronJob } = await import('@/lib/cron/test-cron');
      const result = await testCronJob(user.uid);
      
      console.log('Test cron job result:', result);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error testing cron job:", err);
      setError(err.message || "Fehler beim Testen des Cron Jobs");
    } finally {
      setTestingCron(false);
    }
  };

  // Helper functions
  const getNotificationTitle = (type: NotificationType): string => {
    const titles: Record<NotificationType, string> = {
      APPROVAL_GRANTED: "Freigabe erteilt",
      CHANGES_REQUESTED: "Änderungen erbeten",
      OVERDUE_APPROVAL: "Überfällige Freigabe",
      EMAIL_SENT_SUCCESS: "E-Mail versendet",
      EMAIL_BOUNCED: "E-Mail Bounce",
      TASK_OVERDUE: "Task überfällig",
      MEDIA_FIRST_ACCESS: "Media-Zugriff",
      MEDIA_DOWNLOADED: "Media Download",
      MEDIA_LINK_EXPIRED: "Link abgelaufen",
      FIRST_VIEW: "Erste Ansicht",
      TEAM_CHAT_MENTION: "Chat-Erwähnung",
      project_assignment: "Projekt-Zuweisung"
    };
    return titles[type];
  };

  const getNotificationMessage = (type: NotificationType, values: typeof customValues): string => {
    const template = NOTIFICATION_TEMPLATES[type] as string;
    let message = template;
    
    Object.entries(values).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, value);
    });
    
    // Replace remaining placeholders
    message = message.replace("{campaignTitle}", "Test Kampagne 2024");
    message = message.replace("{taskName}", "Test Task");
    message = message.replace("{mediaAssetName}", "Test-Dokument.pdf");
    
    return message;
  };

  const getNotificationLink = (type: NotificationType): string => {
    const links: Partial<Record<NotificationType, string>> = {
      APPROVAL_GRANTED: "/dashboard/pr-tools/campaigns",
      CHANGES_REQUESTED: "/dashboard/pr-tools/campaigns",
      OVERDUE_APPROVAL: "/dashboard/pr-tools/campaigns",
      EMAIL_SENT_SUCCESS: "/dashboard/communication/inbox",
      EMAIL_BOUNCED: "/dashboard/communication/inbox",
      TASK_OVERDUE: "/dashboard/pr-tools/calendar",
      MEDIA_FIRST_ACCESS: "/dashboard/pr-tools/media-library",
      MEDIA_DOWNLOADED: "/dashboard/pr-tools/media-library",
      MEDIA_LINK_EXPIRED: "/dashboard/pr-tools/media-library"
    };
    return links[type] || "/dashboard";
  };

  const getLinkType = (type: NotificationType): "campaign" | "approval" | "media" | "task" => {
    if (["APPROVAL_GRANTED", "CHANGES_REQUESTED", "OVERDUE_APPROVAL", "EMAIL_SENT_SUCCESS", "EMAIL_BOUNCED"].includes(type)) {
      return "campaign";
    }
    if (type === "TASK_OVERDUE") return "task";
    return "media";
  };

  const getMetadata = (type: NotificationType, values: typeof customValues): any => {
    const baseMetadata: any = {};
    
    switch (type) {
      case "APPROVAL_GRANTED":
      case "CHANGES_REQUESTED":
        return {
          campaignId: "test-123",
          campaignTitle: "Test Kampagne 2024",
          senderName: values.senderName
        };
      case "OVERDUE_APPROVAL":
        return {
          campaignId: "test-123",
          campaignTitle: "Test Kampagne 2024",
          daysOverdue: parseInt(values.daysOverdue)
        };
      case "EMAIL_SENT_SUCCESS":
        return {
          campaignId: "test-123",
          campaignTitle: "Test Kampagne 2024",
          recipientCount: parseInt(values.recipientCount)
        };
      case "EMAIL_BOUNCED":
        return {
          campaignId: "test-123",
          campaignTitle: "Test Kampagne 2024",
          bouncedEmail: values.bouncedEmail
        };
      case "MEDIA_FIRST_ACCESS":
      case "MEDIA_DOWNLOADED":
      case "MEDIA_LINK_EXPIRED":
        return {
          mediaAssetName: "Test-Dokument.pdf"
        };
      case "TASK_OVERDUE":
        return {
          taskName: "Test Task"
        };
      default:
        return baseMetadata;
    }
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <BeakerIcon className="h-8 w-8 text-purple-500" />
            <div>
              <Heading level={1}>Test Benachrichtigungen</Heading>
              <Text className="mt-1 text-gray-600">
                Erstelle Test-Benachrichtigungen für Entwicklung und Tests
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-6 rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <Text className="text-sm font-medium text-green-800">
                Test-Benachrichtigung erfolgreich erstellt!
              </Text>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <Text className="text-sm font-medium text-red-800">{error}</Text>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        {/* Create Test Notification */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Test-Benachrichtigung erstellen</h2>
          
          <div className="space-y-4">
            <Field>
              <Label>Benachrichtigungstyp</Label>
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as NotificationType)}
              >
                {notificationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Dynamic fields based on notification type */}
            {["APPROVAL_GRANTED", "CHANGES_REQUESTED"].includes(selectedType) && (
              <Field>
                <Label>Absender Name</Label>
                <Input
                  type="text"
                  value={customValues.senderName}
                  onChange={(e) => setCustomValues({ ...customValues, senderName: e.target.value })}
                />
              </Field>
            )}

            {selectedType === "EMAIL_SENT_SUCCESS" && (
              <Field>
                <Label>Anzahl Empfänger</Label>
                <Input
                  type="number"
                  value={customValues.recipientCount}
                  onChange={(e) => setCustomValues({ ...customValues, recipientCount: e.target.value })}
                />
              </Field>
            )}

            {selectedType === "EMAIL_BOUNCED" && (
              <Field>
                <Label>Bounce E-Mail</Label>
                <Input
                  type="email"
                  value={customValues.bouncedEmail}
                  onChange={(e) => setCustomValues({ ...customValues, bouncedEmail: e.target.value })}
                />
              </Field>
            )}

            {selectedType === "OVERDUE_APPROVAL" && (
              <Field>
                <Label>Tage überfällig</Label>
                <Input
                  type="number"
                  value={customValues.daysOverdue}
                  onChange={(e) => setCustomValues({ ...customValues, daysOverdue: e.target.value })}
                />
              </Field>
            )}

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Vorschau:</Text>
              <Text className="text-sm text-gray-600">
                {getNotificationMessage(selectedType, customValues)}
              </Text>
            </div>

            <Button
              onClick={handleCreateNotification}
              disabled={creating}
              className="w-full"
            >
              <RocketLaunchIcon className="h-4 w-4" />
              {creating ? "Erstelle..." : "Test-Benachrichtigung erstellen"}
            </Button>
          </div>
        </div>

        {/* Test Cron Job */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Cron Job testen</h2>
          <Text className="text-sm text-gray-600 mb-4">
            Erstellt eine Test-Benachrichtigung direkt ohne API Route
          </Text>
          <Button
            onClick={handleTestCronJob}
            disabled={testingCron}
            className="w-full"
            color="zinc"
          >
            {testingCron ? "Teste..." : "Test Cron Benachrichtigung erstellen"}
          </Button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-lg p-4">
          <Text className="text-sm text-blue-800">
            <strong>Hinweis:</strong> Diese Seite ist nur für Entwicklungszwecke gedacht. 
            In der Produktion sollten Benachrichtigungen nur durch echte Ereignisse ausgelöst werden.
          </Text>
        </div>
      </div>
    </div>
  );
}