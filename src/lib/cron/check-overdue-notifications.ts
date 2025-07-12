// src/lib/cron/check-overdue-notifications.ts

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  addDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

/**
 * Check for overdue items - to be called by external cron service
 * This function should be called via an API endpoint that is triggered by a cron job
 */
export async function checkOverdueItems() {
  console.log('Starting overdue items check...');
  
  try {
    await Promise.all([
      checkOverdueApprovals(),
      checkOverdueTasks(),
      checkExpiredMediaLinks()
    ]);
    
    console.log('Overdue items check completed successfully');
    return { success: true, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('Error checking overdue items:', error);
    throw error;
  }
}

/**
 * Check for overdue approval requests
 */
async function checkOverdueApprovals() {
  console.log('Checking overdue approvals...');
  
  // Get all users with their notification settings
  const settingsSnapshot = await getDocs(
    query(
      collection(db, 'notification_settings'),
      where('overdueApprovals', '==', true)
    )
  );

  for (const settingDoc of settingsSnapshot.docs) {
    const settings = settingDoc.data();
    const userId = settings.userId;
    const overdueDays = settings.overdueApprovalDays || 3;
    
    // Calculate the threshold date
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - overdueDays);
    
    // Find overdue campaigns for this user
    const campaignsSnapshot = await getDocs(
      query(
        collection(db, 'pr_campaigns'),
        where('userId', '==', userId),
        where('status', '==', 'in_review'), // KORRIGIERT: richtiger Status
        where('approvalData.status', '!=', 'approved') // Nicht genehmigte
      )
    );

    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaign = campaignDoc.data();
      
      // Prüfe ob die Kampagne tatsächlich überfällig ist
      if (!campaign.updatedAt) continue;
      
      const lastUpdateDate = campaign.updatedAt.toDate();
      if (lastUpdateDate > thresholdDate) continue; // Nicht überfällig
      
      // Check if we already sent a notification for this overdue campaign today
      const existingNotification = await getDocs(
        query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          where('type', '==', 'OVERDUE_APPROVAL'),
          where('metadata.campaignId', '==', campaignDoc.id),
          where('createdAt', '>=', Timestamp.fromDate(getStartOfDay())),
          limit(1)
        )
      );

      if (existingNotification.empty) {
        // Calculate days overdue
        const daysOverdue = Math.floor((Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Create notification
        await addDoc(collection(db, 'notifications'), {
          userId: userId,
          type: 'OVERDUE_APPROVAL',
          title: 'Überfällige Freigabe-Anfrage',
          message: `Die Freigabe-Anfrage für "${campaign.title}" ist seit ${daysOverdue} Tagen überfällig.`,
          linkUrl: `/dashboard/pr-kampagnen/${campaignDoc.id}`,
          linkType: 'campaign',
          linkId: campaignDoc.id,
          isRead: false,
          metadata: {
            campaignId: campaignDoc.id,
            campaignTitle: campaign.title,
            daysOverdue: daysOverdue
          },
          createdAt: serverTimestamp()
        });
        
        console.log(`Created overdue notification for campaign ${campaignDoc.id}`);
      }
    }
  }
}

/**
 * Check for overdue tasks
 */
async function checkOverdueTasks() {
  console.log('Checking overdue tasks...');
  
  // Get all users with task notifications enabled
  const settingsSnapshot = await getDocs(
    query(
      collection(db, 'notification_settings'),
      where('taskOverdue', '==', true)
    )
  );

  const userIds = settingsSnapshot.docs.map(doc => doc.data().userId);
  
  if (userIds.length === 0) return;
  
  // Process in batches if there are many users (Firestore 'in' query limit is 10)
  const userBatches = [];
  for (let i = 0; i < userIds.length; i += 10) {
    userBatches.push(userIds.slice(i, i + 10));
  }
  
  const now = Timestamp.now();
  
  for (const userBatch of userBatches) {
    // Get overdue tasks for this batch of users
    const tasksSnapshot = await getDocs(
      query(
        collection(db, 'tasks'),
        where('userId', 'in', userBatch),
        where('status', '!=', 'completed'),
        where('dueDate', '<=', now)
      )
    );

    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      
      // Check if we already sent a notification for this overdue task today
      const existingNotification = await getDocs(
        query(
          collection(db, 'notifications'),
          where('userId', '==', task.userId),
          where('type', '==', 'TASK_OVERDUE'),
          where('linkId', '==', taskDoc.id), // KORRIGIERT: linkId statt metadata.taskId
          where('createdAt', '>=', Timestamp.fromDate(getStartOfDay())),
          limit(1)
        )
      );

      if (existingNotification.empty) {
        // Create notification
        await addDoc(collection(db, 'notifications'), {
          userId: task.userId,
          type: 'TASK_OVERDUE',
          title: 'Überfälliger Task',
          message: `Dein Task "${task.title}" ist überfällig.`,
          linkUrl: `/dashboard/tasks/${taskDoc.id}`,
          linkType: 'task',
          linkId: taskDoc.id,
          isRead: false,
          metadata: {
            taskName: task.title // KORRIGIERT: nur taskName
          },
          createdAt: serverTimestamp()
        });
        
        console.log(`Created overdue notification for task ${taskDoc.id}`);
      }
    }
  }
}

/**
 * Check for expired media share links
 */
async function checkExpiredMediaLinks() {
  console.log('Checking expired media links...');
  
  // Get all users with media link expiry notifications enabled
  const settingsSnapshot = await getDocs(
    query(
      collection(db, 'notification_settings'),
      where('mediaLinkExpired', '==', true)
    )
  );

  const userIds = settingsSnapshot.docs.map(doc => doc.data().userId);
  
  if (userIds.length === 0) return;
  
  // Process in batches
  const userBatches = [];
  for (let i = 0; i < userIds.length; i += 10) {
    userBatches.push(userIds.slice(i, i + 10));
  }
  
  // Get share links expiring today
  const todayStart = getStartOfDay();
  const todayEnd = getEndOfDay();
  
  for (const userBatch of userBatches) {
    // KORRIGIERT: Richtige Collection und Felder
    const shareLinksSnapshot = await getDocs(
      query(
        collection(db, 'media_shares'), // KORRIGIERT: richtige Collection
        where('userId', 'in', userBatch),
        where('settings.expiresAt', '>=', Timestamp.fromDate(todayStart)), // KORRIGIERT: verschachtelte Struktur
        where('settings.expiresAt', '<=', Timestamp.fromDate(todayEnd)),
        where('active', '==', true) // KORRIGIERT: 'active' statt 'isActive'
      )
    );

    for (const linkDoc of shareLinksSnapshot.docs) {
      const shareLink = linkDoc.data();
      
      // Check if we already sent a notification for this expired link
      const existingNotification = await getDocs(
        query(
          collection(db, 'notifications'),
          where('userId', '==', shareLink.userId),
          where('type', '==', 'MEDIA_LINK_EXPIRED'),
          where('linkId', '==', linkDoc.id), // KORRIGIERT: linkId statt metadata.shareLinkId
          limit(1)
        )
      );

      if (existingNotification.empty) {
        // Bestimme den Asset-Namen
        let assetName = shareLink.title || 'Unbekannte Datei';
        
        // Create notification
        await addDoc(collection(db, 'notifications'), {
          userId: shareLink.userId,
          type: 'MEDIA_LINK_EXPIRED',
          title: 'Link abgelaufen',
          message: `Der geteilte Link für "${assetName}" ist heute abgelaufen.`,
          linkUrl: `/dashboard/mediencenter`, // KORRIGIERT: generischer Link
          linkType: 'media',
          linkId: linkDoc.id,
          isRead: false,
          metadata: {
            mediaAssetName: assetName // KORRIGIERT: nur mediaAssetName
          },
          createdAt: serverTimestamp()
        });
        
        console.log(`Created expiry notification for share link ${linkDoc.id}`);
      }
    }
  }
}

/**
 * Helper function to get start of day
 */
function getStartOfDay(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Helper function to get end of day
 */
function getEndOfDay(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}