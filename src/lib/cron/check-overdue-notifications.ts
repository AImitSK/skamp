// src/lib/cron/check-overdue-notifications.ts

import { Timestamp } from 'firebase/firestore';

// Firestore REST API Helper
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function firestoreQuery(body: any) {
  const url = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firestore query failed: ${error}`);
  }
  
  return response.json();
}

async function createDocument(collection: string, data: any) {
  const url = `${FIRESTORE_BASE_URL}/${collection}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(convertToFirestoreDocument(data)),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firestore create failed: ${error}`);
  }
  
  return response.json();
}

// Convert Firestore document to JS object
function convertFirestoreDocument(doc: any): any {
  if (!doc.fields) return null;
  
  const result: any = {};
  
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = convertFirestoreValue(value);
  }
  
  return result;
}

function convertFirestoreValue(value: any): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue);
  if (value.arrayValue !== undefined) {
    return value.arrayValue.values?.map((v: any) => convertFirestoreValue(v)) || [];
  }
  if (value.mapValue !== undefined) {
    const result: any = {};
    if (value.mapValue.fields) {
      for (const [k, v] of Object.entries(value.mapValue.fields)) {
        result[k] = convertFirestoreValue(v);
      }
    }
    return result;
  }
  return null;
}

// Convert JS object to Firestore document
function convertToFirestoreDocument(data: any): any {
  const fields: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    fields[key] = convertToFirestoreValue(value);
  }
  
  return { fields };
}

function convertToFirestoreValue(value: any): any {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: value.toString() };
    }
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (value instanceof Timestamp) {
    return { timestampValue: value.toDate().toISOString() };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(v => convertToFirestoreValue(v))
      }
    };
  }
  if (typeof value === 'object') {
    const fields: any = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = convertToFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

/**
 * Check for overdue items - to be called by external cron service
 * This function should be called via an API endpoint that is triggered by a cron job
 */
export async function checkOverdueItems() {
  console.log('Starting overdue items check...');
  
  try {
    // Temporär: Nur eine einfache Test-Benachrichtigung erstellen
    await createTestNotification();
    
    // TODO: Diese Funktionen benötigen Service Account Zugriff
    // await Promise.all([
    //   checkOverdueApprovals(),
    //   checkOverdueTasks(),
    //   checkExpiredMediaLinks()
    // ]);
    
    console.log('Overdue items check completed successfully');
    return { 
      success: true, 
      timestamp: new Date().toISOString(),
      message: 'Test notification created - full cron job needs service account access'
    };
  } catch (error) {
    console.error('Error checking overdue items:', error);
    throw error;
  }
}

/**
 * Temporäre Test-Funktion
 */
async function createTestNotification() {
  console.log('Creating test notification...');
  
  // Erstelle eine Test-Benachrichtigung
  await createDocument('notifications', {
    userId: 'test-user-id', // Ersetze mit einer echten User ID
    type: 'TASK_OVERDUE',
    title: 'Cron Job Test',
    message: 'Der Cron Job läuft! Dies ist eine Test-Benachrichtigung.',
    linkUrl: '/dashboard',
    linkType: 'task',
    linkId: 'test-task',
    isRead: false,
    metadata: {
      taskName: 'Test Task'
    },
    createdAt: new Date()
  });
  
  console.log('Test notification created successfully');
}

/**
 * Check for overdue approval requests
 */
async function checkOverdueApprovals() {
  console.log('Checking overdue approvals...');
  
  // Get all users with their notification settings
  const settingsResponse = await firestoreQuery({
    structuredQuery: {
      from: [{ collectionId: 'notification_settings' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'overdueApprovals' },
          op: 'EQUAL',
          value: { booleanValue: true }
        }
      }
    }
  });

  for (const result of settingsResponse) {
    if (!result.document) continue;
    
    const settings = convertFirestoreDocument(result.document);
    const userId = settings.userId;
    const overdueDays = settings.overdueApprovalDays || 3;
    
    // Calculate the threshold date
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - overdueDays);
    
    // Find overdue campaigns for this user
    const campaignsResponse = await firestoreQuery({
      structuredQuery: {
        from: [{ collectionId: 'pr_campaigns' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'userId' },
                  op: 'EQUAL',
                  value: { stringValue: userId }
                }
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'status' },
                  op: 'EQUAL',
                  value: { stringValue: 'in_review' }
                }
              }
            ]
          }
        }
      }
    });

    for (const campaignResult of campaignsResponse) {
      if (!campaignResult.document) continue;
      
      const campaign = convertFirestoreDocument(campaignResult.document);
      const campaignId = campaignResult.document.name.split('/').pop();
      
      // Prüfe ob die Kampagne tatsächlich überfällig ist
      if (!campaign.updatedAt) continue;
      
      const lastUpdateDate = campaign.updatedAt instanceof Date ? campaign.updatedAt : new Date(campaign.updatedAt);
      if (lastUpdateDate > thresholdDate) continue; // Nicht überfällig
      
      // Check if we already sent a notification for this overdue campaign today
      const existingNotificationResponse = await firestoreQuery({
        structuredQuery: {
          from: [{ collectionId: 'notifications' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'userId' },
                    op: 'EQUAL',
                    value: { stringValue: userId }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'type' },
                    op: 'EQUAL',
                    value: { stringValue: 'OVERDUE_APPROVAL' }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'metadata.campaignId' },
                    op: 'EQUAL',
                    value: { stringValue: campaignId }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'createdAt' },
                    op: 'GREATER_THAN_OR_EQUAL',
                    value: { timestampValue: getStartOfDay().toISOString() }
                  }
                }
              ]
            }
          },
          limit: 1
        }
      });

      if (existingNotificationResponse.length === 0 || !existingNotificationResponse[0].document) {
        // Calculate days overdue
        const daysOverdue = Math.floor((Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Create notification
        await createDocument('notifications', {
          userId: userId,
          type: 'OVERDUE_APPROVAL',
          title: 'Überfällige Freigabe-Anfrage',
          message: `Die Freigabe-Anfrage für "${campaign.title}" ist seit ${daysOverdue} Tagen überfällig.`,
          linkUrl: `/dashboard/pr-kampagnen/${campaignId}`,
          linkType: 'campaign',
          linkId: campaignId,
          isRead: false,
          metadata: {
            campaignId: campaignId,
            campaignTitle: campaign.title,
            daysOverdue: daysOverdue
          },
          createdAt: new Date()
        });
        
        console.log(`Created overdue notification for campaign ${campaignId}`);
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
  const settingsResponse = await firestoreQuery({
    structuredQuery: {
      from: [{ collectionId: 'notification_settings' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'taskOverdue' },
          op: 'EQUAL',
          value: { booleanValue: true }
        }
      }
    }
  });

  const userIds = settingsResponse
    .filter((r: any) => r.document)
    .map((r: any) => convertFirestoreDocument(r.document).userId);
  
  if (userIds.length === 0) return;
  
  const now = new Date();
  
  // Process users in batches (Firestore 'in' query limit is 10)
  for (let i = 0; i < userIds.length; i += 10) {
    const userBatch = userIds.slice(i, i + 10);
    
    // Get overdue tasks for this batch of users
    const tasksResponse = await firestoreQuery({
      structuredQuery: {
        from: [{ collectionId: 'tasks' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'userId' },
                  op: 'IN',
                  value: { 
                    arrayValue: {
                      values: userBatch.map((id: string) => ({ stringValue: id }))
                    }
                  }
                }
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'status' },
                  op: 'NOT_EQUAL',
                  value: { stringValue: 'completed' }
                }
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'dueDate' },
                  op: 'LESS_THAN_OR_EQUAL',
                  value: { timestampValue: now.toISOString() }
                }
              }
            ]
          }
        }
      }
    });

    for (const taskResult of tasksResponse) {
      if (!taskResult.document) continue;
      
      const task = convertFirestoreDocument(taskResult.document);
      const taskId = taskResult.document.name.split('/').pop();
      
      // Check if we already sent a notification for this overdue task today
      const existingNotificationResponse = await firestoreQuery({
        structuredQuery: {
          from: [{ collectionId: 'notifications' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'userId' },
                    op: 'EQUAL',
                    value: { stringValue: task.userId }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'type' },
                    op: 'EQUAL',
                    value: { stringValue: 'TASK_OVERDUE' }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'linkId' },
                    op: 'EQUAL',
                    value: { stringValue: taskId }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'createdAt' },
                    op: 'GREATER_THAN_OR_EQUAL',
                    value: { timestampValue: getStartOfDay().toISOString() }
                  }
                }
              ]
            }
          },
          limit: 1
        }
      });

      if (existingNotificationResponse.length === 0 || !existingNotificationResponse[0].document) {
        // Create notification
        await createDocument('notifications', {
          userId: task.userId,
          type: 'TASK_OVERDUE',
          title: 'Überfälliger Task',
          message: `Dein Task "${task.title}" ist überfällig.`,
          linkUrl: `/dashboard/tasks/${taskId}`,
          linkType: 'task',
          linkId: taskId,
          isRead: false,
          metadata: {
            taskName: task.title
          },
          createdAt: new Date()
        });
        
        console.log(`Created overdue notification for task ${taskId}`);
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
  const settingsResponse = await firestoreQuery({
    structuredQuery: {
      from: [{ collectionId: 'notification_settings' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'mediaLinkExpired' },
          op: 'EQUAL',
          value: { booleanValue: true }
        }
      }
    }
  });

  const userIds = settingsResponse
    .filter((r: any) => r.document)
    .map((r: any) => convertFirestoreDocument(r.document).userId);
  
  if (userIds.length === 0) return;
  
  // Get share links expiring today
  const todayStart = getStartOfDay();
  const todayEnd = getEndOfDay();
  
  // Process users in batches
  for (let i = 0; i < userIds.length; i += 10) {
    const userBatch = userIds.slice(i, i + 10);
    
    const shareLinksResponse = await firestoreQuery({
      structuredQuery: {
        from: [{ collectionId: 'media_shares' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'userId' },
                  op: 'IN',
                  value: { 
                    arrayValue: {
                      values: userBatch.map((id: string) => ({ stringValue: id }))
                    }
                  }
                }
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'settings.expiresAt' },
                  op: 'GREATER_THAN_OR_EQUAL',
                  value: { timestampValue: todayStart.toISOString() }
                }
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'settings.expiresAt' },
                  op: 'LESS_THAN_OR_EQUAL',
                  value: { timestampValue: todayEnd.toISOString() }
                }
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'active' },
                  op: 'EQUAL',
                  value: { booleanValue: true }
                }
              }
            ]
          }
        }
      }
    });

    for (const linkResult of shareLinksResponse) {
      if (!linkResult.document) continue;
      
      const shareLink = convertFirestoreDocument(linkResult.document);
      const linkId = linkResult.document.name.split('/').pop();
      
      // Check if we already sent a notification for this expired link
      const existingNotificationResponse = await firestoreQuery({
        structuredQuery: {
          from: [{ collectionId: 'notifications' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'userId' },
                    op: 'EQUAL',
                    value: { stringValue: shareLink.userId }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'type' },
                    op: 'EQUAL',
                    value: { stringValue: 'MEDIA_LINK_EXPIRED' }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'linkId' },
                    op: 'EQUAL',
                    value: { stringValue: linkId }
                  }
                }
              ]
            }
          },
          limit: 1
        }
      });

      if (existingNotificationResponse.length === 0 || !existingNotificationResponse[0].document) {
        // Bestimme den Asset-Namen
        let assetName = shareLink.title || 'Unbekannte Datei';
        
        // Create notification
        await createDocument('notifications', {
          userId: shareLink.userId,
          ...(shareLink.organizationId && { organizationId: shareLink.organizationId }),
          type: 'MEDIA_LINK_EXPIRED',
          title: 'Link abgelaufen',
          message: `Der geteilte Link für "${assetName}" ist heute abgelaufen.`,
          linkUrl: `/dashboard/mediencenter`,
          linkType: 'media',
          linkId: linkId,
          isRead: false,
          metadata: {
            mediaAssetName: assetName
          },
          createdAt: new Date()
        });
        
        console.log(`Created expiry notification for share link ${linkId}`);
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