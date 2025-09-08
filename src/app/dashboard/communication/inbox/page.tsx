// DEBUGGING STEP 3: FIREBASE IMPORTS TEST
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase/client-init';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function InboxStep3Page() {
  const [message, setMessage] = useState('Step 3: Firebase Imports Test');
  const [firebaseTestResult, setFirebaseTestResult] = useState('Not tested');
  
  // Test Context hooks
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // Test Firebase connection
  const testFirebaseConnection = () => {
    try {
      if (!currentOrganization?.id) {
        setFirebaseTestResult('No organization - cannot test');
        return;
      }

      // Test Firebase query construction (not executed)
      const testQuery = query(
        collection(db, 'email_messages'),
        where('organizationId', '==', currentOrganization.id),
        orderBy('receivedAt', 'desc'),
        limit(5)
      );

      setFirebaseTestResult('Firebase query constructed successfully');
      setMessage('Step 3 Firebase Test - Query built successfully!');
    } catch (error: any) {
      setFirebaseTestResult(`Firebase Error: ${error.message}`);
      setMessage('Step 3 Firebase Test - Error occurred!');
    }
  };

  return (
    <div className="p-4">
      <Heading level={1}>Inbox Debug - Step 3</Heading>
      <p className="mt-2">{message}</p>
      
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2">
          <Badge color="green">User:</Badge>
          <span className="text-sm">{user?.email || 'Not logged in'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="blue">Organization:</Badge>
          <span className="text-sm">{currentOrganization?.name || 'None'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="purple">Firebase Test:</Badge>
          <span className="text-sm">{firebaseTestResult}</span>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button 
          onClick={testFirebaseConnection}
          color="dark/zinc"
        >
          Test Firebase
        </Button>
        <Button 
          onClick={() => setMessage('Step 3 Firebase imports - Button clicked!')}
          plain
        >
          Basic Test
        </Button>
      </div>
    </div>
  );
}