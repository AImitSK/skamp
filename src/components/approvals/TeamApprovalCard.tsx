// src/components/approvals/TeamApprovalCard.tsx - Team-Approval Avatar-Grid
"use client";

import { ApprovalWorkflow, TeamApproval } from '@/types/approvals-enhanced';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface TeamApprovalCardProps {
  workflow: ApprovalWorkflow;
  userApproval: TeamApproval;
  currentUserId: string;
  onSubmitDecision: (decision: 'approved' | 'rejected') => void;
}

export function TeamApprovalCard({
  workflow,
  userApproval,
  currentUserId
}: TeamApprovalCardProps) {
  const teamApprovers = workflow.teamSettings.approvers;
  const approvedCount = teamApprovers.filter(a => a.status === 'approved').length;
  const rejectedCount = teamApprovers.filter(a => a.status === 'rejected').length;
  const pendingCount = teamApprovers.filter(a => a.status === 'pending').length;
  const totalCount = teamApprovers.length;
  
  const currentUserApprover = teamApprovers.find(a => a.userId === currentUserId);
  const isCurrentUserApprover = !!currentUserApprover;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircleIcon;
      case 'rejected': return XCircleIcon;
      default: return ClockIcon;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'approved': return 'ring-green-500 bg-green-50';
      case 'rejected': return 'ring-red-500 bg-red-50';
      default: return 'ring-yellow-500 bg-yellow-50';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-gray-400" />
            Team-Freigabe Status
          </h2>
          <div className="flex items-center gap-2">
            <Badge color="blue">
              {approvedCount}/{totalCount} freigegeben
            </Badge>
            {rejectedCount > 0 && (
              <Badge color="red">
                {rejectedCount} abgelehnt
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Team Message */}
        {workflow.teamSettings.message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Nachricht vom Ersteller</p>
                <p className="text-sm text-blue-800">{workflow.teamSettings.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Approver Grid */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamApprovers.map((approver) => {
              const StatusIcon = getStatusIcon(approver.status);
              const isCurrentUser = approver.userId === currentUserId;
              
              return (
                <div
                  key={approver.userId}
                  className={clsx(
                    "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                    isCurrentUser 
                      ? "border-blue-200 bg-blue-50" 
                      : "border-gray-200 bg-gray-50",
                    getStatusBgColor(approver.status)
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {approver.photoUrl ? (
                      <img
                        src={approver.photoUrl}
                        alt={approver.displayName}
                        className={clsx(
                          "h-12 w-12 rounded-full object-cover ring-2",
                          getStatusBgColor(approver.status).includes('ring-') 
                            ? getStatusBgColor(approver.status).split(' ')[0]
                            : 'ring-gray-300'
                        )}
                      />
                    ) : (
                      <div className={clsx(
                        "h-12 w-12 rounded-full flex items-center justify-center ring-2",
                        getStatusBgColor(approver.status)
                      )}>
                        <span className="text-sm font-medium text-gray-700">
                          {approver.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    {/* Status Icon */}
                    <div className={clsx(
                      "absolute -bottom-1 -right-1 p-1 rounded-full bg-white ring-2 ring-white",
                      getStatusColor(approver.status)
                    )}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {approver.displayName}
                        {isCurrentUser && (
                          <span className="text-blue-600 ml-1">(Sie)</span>
                        )}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {approver.email}
                    </p>
                    
                    {/* Status Details */}
                    <div className="mt-1">
                      {approver.status === 'pending' ? (
                        <Text className="text-xs text-gray-500">
                          Wartet auf Entscheidung
                        </Text>
                      ) : (
                        <div className="space-y-1">
                          <Text className="text-xs text-gray-600">
                            {approver.status === 'approved' ? 'Freigegeben' : 'Abgelehnt'} am{' '}
                            {formatDate(approver.approvedAt || approver.rejectedAt)}
                          </Text>
                          {approver.message && (
                            <Text className="text-xs text-gray-600 italic">
                              "{approver.message}"
                            </Text>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <Text className="text-sm font-medium text-gray-700">Fortschritt</Text>
              <Text className="text-sm text-gray-600">
                {approvedCount + rejectedCount}/{totalCount} bearbeitet
              </Text>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(approvedCount / totalCount) * 100}%` }}
              />
            </div>
            
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>{approvedCount} freigegeben</span>
              {rejectedCount > 0 && <span>{rejectedCount} abgelehnt</span>}
              <span>{pendingCount} ausstehend</span>
            </div>
          </div>

          {/* Current User Status */}
          {isCurrentUserApprover && (
            <div className="mt-4 p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="font-medium text-blue-900">Ihre Entscheidung</Text>
                  <Text className="text-sm text-blue-700">
                    {userApproval.status === 'pending' 
                      ? 'Entscheidung ausstehend'
                      : `Sie haben ${userApproval.status === 'approved' ? 'freigegeben' : 'abgelehnt'}`
                    }
                  </Text>
                </div>
                {userApproval.status !== 'pending' && (
                  <Badge color={userApproval.status === 'approved' ? 'green' : 'red'}>
                    {userApproval.status === 'approved' ? 'Freigegeben' : 'Abgelehnt'}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}