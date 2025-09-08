// DEBUGGING STEP 5: INBOX COMPONENTS TEST (MOST DANGEROUS!)
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
import { TeamFolderSidebar } from '@/components/inbox/TeamFolderSidebar';
import { EmailList } from '@/components/inbox/EmailList';
import { EmailViewer } from '@/components/inbox/EmailViewer';

export default function InboxStep5Page() {
  const [message, setMessage] = useState('Step 5: Inbox Components Test');
  const [componentTestResults, setComponentTestResults] = useState({
    sidebar: 'Not tested',
    emailList: 'Not tested', 
    emailViewer: 'Not tested',
    rendering: 'Not tested'
  });
  const [showComponents, setShowComponents] = useState(false);
  
  // Test Context hooks
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // Test Inbox Components Import
  const testComponentImports = () => {
    try {
      const sidebarExists = !!TeamFolderSidebar;
      const emailListExists = !!EmailList;  
      const emailViewerExists = !!EmailViewer;

      setComponentTestResults(prev => ({
        ...prev,
        sidebar: sidebarExists ? '✅ Import OK' : '❌ Import failed',
        emailList: emailListExists ? '✅ Import OK' : '❌ Import failed', 
        emailViewer: emailViewerExists ? '✅ Import OK' : '❌ Import failed'
      }));

      setMessage('Step 5 - All component imports tested!');
    } catch (error: any) {
      setComponentTestResults(prev => ({
        ...prev,
        rendering: `❌ Error: ${error.message}`
      }));
      setMessage(`Step 5 - Component import error: ${error.message}`);
    }
  };

  // Test Component Rendering (DANGEROUS!)
  const testComponentRendering = () => {
    try {
      setShowComponents(true);
      setComponentTestResults(prev => ({
        ...prev,
        rendering: '✅ Components rendered'
      }));
      setMessage('Step 5 - Components rendered successfully!');
    } catch (error: any) {
      setComponentTestResults(prev => ({
        ...prev,
        rendering: `❌ Render Error: ${error.message}`
      }));
      setMessage(`Step 5 - Render error: ${error.message}`);
    }
  };

  return (
    <div className="p-4">
      <Heading level={1}>Inbox Debug - Step 5</Heading>
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
          <Badge color="purple">TeamFolderSidebar:</Badge>
          <span className="text-xs">{componentTestResults.sidebar}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="orange">EmailList:</Badge>
          <span className="text-xs">{componentTestResults.emailList}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="red">EmailViewer:</Badge>
          <span className="text-xs">{componentTestResults.emailViewer}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="cyan">Rendering:</Badge>
          <span className="text-xs">{componentTestResults.rendering}</span>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button 
          onClick={testComponentImports}
          color="dark/zinc"
        >
          Test Imports
        </Button>
        <Button 
          onClick={testComponentRendering}
          color="red"
        >
          ⚠️ Render Components
        </Button>
        <Button 
          onClick={() => setMessage('Step 5 - Basic button clicked!')}
          plain
        >
          Basic Test
        </Button>
      </div>

      {showComponents && (
        <div className="mt-8 p-4 border-2 border-red-500 rounded">
          <h2 className="text-lg font-bold text-red-600 mb-4">⚠️ DANGER ZONE - COMPONENT RENDERING</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="border p-2">
              <h3 className="font-semibold">TeamFolderSidebar Test</h3>
              <div className="h-20 bg-gray-100 flex items-center justify-center text-sm">
                Sidebar Placeholder
              </div>
            </div>
            <div className="border p-2">
              <h3 className="font-semibold">EmailList Test</h3>
              <div className="h-20 bg-gray-100 flex items-center justify-center text-sm">
                EmailList Placeholder  
              </div>
            </div>
            <div className="border p-2">
              <h3 className="font-semibold">EmailViewer Test</h3>
              <div className="h-20 bg-gray-100 flex items-center justify-center text-sm">
                EmailViewer Placeholder
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}