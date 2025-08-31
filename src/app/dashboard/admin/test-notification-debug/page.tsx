'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { notificationsService } from '@/lib/firebase/notifications-service';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  limit 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

interface NotificationDebugData {
  id: string;
  userId?: string;
  toUserId?: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: any;
  organizationId?: string;
}

export default function NotificationDebugPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  
  const [notifications, setNotifications] = useState<NotificationDebugData[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  // Lade alle Notifications für Debug
  const loadAllNotifications = async () => {
    if (!user || !currentOrganization) return;
    
    setLoading(true);
    try {
      // Query alle notifications für diesen User (beide Felder)
      const queries = [
        // Standard notifications-service (userId)
        query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          limit(20)
        ),
        // Enhanced service (toUserId)  
        query(
          collection(db, 'notifications'),
          where('toUserId', '==', user.uid),
          limit(20)
        )
      ];
      
      const results = await Promise.all(queries.map(q => getDocs(q)));
      
      const allNotifications: NotificationDebugData[] = [];
      
      results.forEach((snapshot, index) => {
        snapshot.forEach(doc => {
          const data = doc.data();
          allNotifications.push({
            id: doc.id,
            userId: data.userId,
            toUserId: data.toUserId,
            type: data.type,
            title: data.title,
            message: data.message,
            isRead: data.isRead,
            createdAt: data.createdAt,
            organizationId: data.organizationId
          });
        });
      });
      
      // Deduplicate by ID
      const uniqueNotifications = allNotifications.filter((notification, index, self) => 
        index === self.findIndex(n => n.id === notification.id)
      );
      
      setNotifications(uniqueNotifications.sort((a, b) => 
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      ));
      
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test: Erstelle CHANGES_REQUESTED Notification
  const testChangesRequested = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const mockCampaign = {
        id: 'debug-campaign-123',
        title: 'Debug Test Campaign',
        userId: user.uid
      };
      
      await notificationsService.notifyChangesRequested(
        mockCampaign,
        'Debug Test User',
        user.uid
      );
      
      setTestResult('✅ CHANGES_REQUESTED notification created');
      
      // Reload notifications
      setTimeout(loadAllNotifications, 1000);
      
    } catch (error) {
      setTestResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test: Erstelle FIRST_VIEW Notification  
  const testFirstView = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const mockCampaign = {
        id: 'debug-campaign-456',
        title: 'Debug First View Campaign',
        userId: user.uid
      };
      
      await notificationsService.notifyFirstView(
        mockCampaign,
        'Debug Customer',
        user.uid
      );
      
      setTestResult('✅ FIRST_VIEW notification created');
      
      // Reload notifications
      setTimeout(loadAllNotifications, 1000);
      
    } catch (error) {
      setTestResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && currentOrganization) {
      loadAllNotifications();
    }
  }, [user, currentOrganization]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'No date';
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString('de-DE');
    }
    return new Date(timestamp).toLocaleString('de-DE');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Heading level={1} className="mb-6">🐛 Notification System Debug</Heading>
      
      <div className="space-y-6">
        {/* Test Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Heading level={2} className="mb-4">Test Controls</Heading>
          
          <div className="flex gap-4 mb-4">
            <Button 
              onClick={testChangesRequested}
              disabled={loading}
              color="blue"
            >
              🧪 Test CHANGES_REQUESTED
            </Button>
            
            <Button 
              onClick={testFirstView}
              disabled={loading}
              color="green"  
            >
              🧪 Test FIRST_VIEW
            </Button>
            
            <Button 
              onClick={loadAllNotifications}
              disabled={loading}
              plain
            >
              🔄 Reload Data
            </Button>
          </div>
          
          {testResult && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <code>{testResult}</code>
            </div>
          )}
        </div>

        {/* Notifications Table */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Heading level={2} className="mb-4">
            All Notifications ({notifications.length})
          </Heading>
          
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Title</th>
                    <th className="text-left p-2">userId</th>
                    <th className="text-left p-2">toUserId</th>
                    <th className="text-left p-2">isRead</th>
                    <th className="text-left p-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notification) => (
                    <tr key={notification.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {notification.type}
                        </code>
                      </td>
                      <td className="p-2 max-w-xs truncate">
                        {notification.title}
                      </td>
                      <td className="p-2">
                        <code className="text-xs">
                          {notification.userId ? '✅' : '❌'} {notification.userId?.slice(-8)}
                        </code>
                      </td>
                      <td className="p-2">
                        <code className="text-xs">
                          {notification.toUserId ? '✅' : '❌'} {notification.toUserId?.slice(-8)}
                        </code>
                      </td>
                      <td className="p-2">
                        {notification.isRead ? '📖' : '🔶'}
                      </td>
                      <td className="p-2 text-xs">
                        {formatDate(notification.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="bg-gray-50 rounded-lg p-6">
          <Heading level={2} className="mb-4">Debug Info</Heading>
          <div className="space-y-2 text-sm">
            <div><strong>Current User:</strong> <code>{user?.uid}</code></div>
            <div><strong>Organization:</strong> <code>{currentOrganization?.id}</code></div>
            <div><strong>Enhanced Service Query:</strong> <code>toUserId == {user?.uid}</code></div>
            <div><strong>Notifications Service Query:</strong> <code>userId == {user?.uid}</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}