// DEBUGGING STEP 1: CONTEXT IMPORTS TEST
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

export default function InboxStep1Page() {
  const [message, setMessage] = useState('Step 1: Context Imports Test');
  
  // Test Context hooks
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Inbox Debug - Step 1</h1>
      <p>{message}</p>
      <div className="mt-2 text-sm text-gray-600">
        <p>User: {user?.email || 'Not logged in'}</p>
        <p>Organization: {currentOrganization?.name || 'None'}</p>
      </div>
      <button 
        onClick={() => setMessage('Step 1 Context Test - Button clicked!')}
        className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
      >
        Test Context Button
      </button>
    </div>
  );
}