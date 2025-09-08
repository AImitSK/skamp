// DEBUGGING STEP 2: BASIC UI COMPONENTS TEST
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function InboxStep2Page() {
  const [message, setMessage] = useState('Step 2: Basic UI Components Test');
  
  // Test Context hooks
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return (
    <div className="p-4">
      <Heading level={1}>Inbox Debug - Step 2</Heading>
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

      <div className="mt-6 flex gap-3">
        <Button 
          onClick={() => setMessage('Step 2 UI Components - Button clicked!')}
          color="dark/zinc"
        >
          Test UI Button
        </Button>
        <Button 
          onClick={() => setMessage('Secondary button clicked!')}
          plain
        >
          Secondary Button
        </Button>
      </div>
    </div>
  );
}