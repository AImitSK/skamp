// src/lib/cron/test-cron.ts

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

export async function testCronJob(userId: string) {
  console.log('Running test cron job for user:', userId);
  
  try {
    // Create a simple test notification
    const notificationData = {
      userId: userId,
      type: 'OVERDUE_APPROVAL',
      title: 'Test Cron Benachrichtigung',
      message: 'Dies ist eine Test-Benachrichtigung vom Cron Job',
      linkUrl: '/dashboard',
      linkType: 'campaign',
      isRead: false,
      metadata: {
        campaignTitle: 'Test Campaign',
        daysOverdue: 5
      },
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    
    console.log('Test notification created with ID:', docRef.id);
    
    return {
      success: true,
      notificationId: docRef.id,
      timestamp: new Date().toISOString(),
      message: 'Test notification created successfully'
    };
  } catch (error) {
    console.error('Error creating test notification:', error);
    throw error;
  }
}