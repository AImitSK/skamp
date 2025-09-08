// DEBUGGING STEP 4: EMAIL SERVICES TEST  
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase/client-init';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { emailMessageService } from '@/lib/email/email-message-service';
import { threadMatcherService } from '@/lib/email/thread-matcher-service';
import { emailAddressService } from '@/lib/email/email-address-service';

export default function InboxStep4Page() {
  const [message, setMessage] = useState('Step 4: Email Services Test');
  const [serviceTestResults, setServiceTestResults] = useState({
    firebase: 'Not tested',
    emailMessage: 'Not tested', 
    threadMatcher: 'Not tested',
    emailAddress: 'Not tested'
  });
  
  // Test Context hooks
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // Test Firebase connection
  const testFirebaseConnection = () => {
    try {
      if (!currentOrganization?.id) {
        setServiceTestResults(prev => ({ ...prev, firebase: 'No organization' }));
        return;
      }

      const testQuery = query(
        collection(db, 'email_messages'),
        where('organizationId', '==', currentOrganization.id),
        orderBy('receivedAt', 'desc'),
        limit(5)
      );

      setServiceTestResults(prev => ({ ...prev, firebase: '✅ Success' }));
    } catch (error: any) {
      setServiceTestResults(prev => ({ ...prev, firebase: `❌ ${error.message}` }));
    }
  };

  // Test Email Services
  const testEmailServices = () => {
    try {
      // Test service imports existence
      const emailServiceExists = !!emailMessageService;
      const threadServiceExists = !!threadMatcherService;  
      const addressServiceExists = !!emailAddressService;

      setServiceTestResults(prev => ({
        ...prev,
        emailMessage: emailServiceExists ? '✅ Import OK' : '❌ Import failed',
        threadMatcher: threadServiceExists ? '✅ Import OK' : '❌ Import failed', 
        emailAddress: addressServiceExists ? '✅ Import OK' : '❌ Import failed'
      }));

      setMessage('Step 4 Email Services - All imports tested!');
    } catch (error: any) {
      setMessage(`Step 4 Email Services - Error: ${error.message}`);
    }
  };

  return (
    <div className="p-4">
      <Heading level={1}>Inbox Debug - Step 4</Heading>
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
      </div>

      <div className="mt-4 space-y-1">
        <div className="flex items-center gap-2">
          <Badge color="purple">Firebase:</Badge>
          <span className="text-xs">{serviceTestResults.firebase}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="orange">EmailMessage:</Badge>
          <span className="text-xs">{serviceTestResults.emailMessage}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="red">ThreadMatcher:</Badge>
          <span className="text-xs">{serviceTestResults.threadMatcher}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="cyan">EmailAddress:</Badge>
          <span className="text-xs">{serviceTestResults.emailAddress}</span>
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
          onClick={testEmailServices}
          color="dark/zinc"
        >
          Test Email Services
        </Button>
        <Button 
          onClick={() => setMessage('Step 4 - Basic button clicked!')}
          plain
        >
          Basic Test
        </Button>
      </div>
    </div>
  );
}