'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function FixMyOrgPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFix = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { auth } = await import('@/lib/firebase/client-init');
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      const token = await currentUser.getIdToken();

      const response = await fetch('/api/admin/fix-my-org', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await response.text();
      console.log('Response:', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { error: 'Invalid JSON', response: text };
      }

      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-6">Not logged in</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Fix My Organization</h1>
      <p className="mb-4 text-gray-600">This will fetch your Stripe subscription and update your organization.</p>

      <button
        onClick={handleFix}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {loading ? 'Fixing...' : 'Fix My Organization'}
      </button>

      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
