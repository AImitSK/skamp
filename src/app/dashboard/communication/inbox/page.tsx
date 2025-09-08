// TEMPORARY MINIMAL INBOX FOR DEBUGGING
"use client";

import { useState } from 'react';

export default function MinimalInboxPage() {
  const [message, setMessage] = useState('Minimal Inbox Test');

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Minimal Inbox</h1>
      <p>{message}</p>
      <button 
        onClick={() => setMessage('Button clicked!')}
        className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
      >
        Test Button
      </button>
    </div>
  );
}