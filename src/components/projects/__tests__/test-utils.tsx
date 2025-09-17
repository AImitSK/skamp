// src/components/projects/__tests__/test-utils.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { ProjectTask, TaskStatus, TaskPriority } from '@/types/tasks';
import { TeamMember } from '@/types/international';
import { Timestamp } from 'firebase/firestore';

// Test Data Factories
export const createMockTask = (overrides: Partial<ProjectTask> = {}): ProjectTask => ({
  id: 'test-task-1',
  userId: 'user-123',
  organizationId: 'org-123',
  projectId: 'project-123',
  assignedUserId: 'user-123',
  title: 'Test Task',
  description: 'Test Description',
  status: 'pending',
  priority: 'medium',
  progress: 50,
  dueDate: Timestamp.fromDate(new Date('2024-12-25')),
  isOverdue: false,
  daysUntilDue: 5,
  overdueBy: 0,
  ...overrides
});

export const createMockTeamMember = (overrides: Partial<TeamMember> = {}): TeamMember => ({
  id: 'member-1',
  userId: 'user-123',
  displayName: 'John Doe',
  email: 'john@example.com',
  photoUrl: 'https://example.com/john.jpg',
  role: 'member',
  permissions: [],
  ...overrides
});

// Mock Data Sets
export const mockTasksDataSet = {
  pending: createMockTask({
    id: 'pending-task',
    status: 'pending',
    priority: 'high',
    progress: 25
  }),
  inProgress: createMockTask({
    id: 'in-progress-task',
    status: 'in_progress',
    priority: 'medium',
    progress: 75
  }),
  completed: createMockTask({
    id: 'completed-task',
    status: 'completed',
    priority: 'low',
    progress: 100
  }),
  overdue: createMockTask({
    id: 'overdue-task',
    status: 'pending',
    priority: 'urgent',
    progress: 30,
    dueDate: Timestamp.fromDate(new Date('2024-11-01')),
    isOverdue: true,
    daysUntilDue: 0,
    overdueBy: 15
  }),
  dueToday: createMockTask({
    id: 'due-today-task',
    status: 'pending',
    priority: 'high',
    progress: 80,
    dueDate: Timestamp.fromDate(new Date()),
    isOverdue: false,
    daysUntilDue: 0,
    overdueBy: 0
  }),
  noDueDate: createMockTask({
    id: 'no-due-date-task',
    status: 'pending',
    priority: 'medium',
    progress: 60,
    dueDate: undefined,
    isOverdue: false,
    daysUntilDue: 0,
    overdueBy: 0
  })
};

export const mockTeamMembersDataSet = {
  projectManager: createMockTeamMember({
    id: 'pm-1',
    userId: 'pm-user-123',
    displayName: 'Project Manager',
    role: 'manager'
  }),
  developer: createMockTeamMember({
    id: 'dev-1',
    userId: 'dev-user-123',
    displayName: 'Developer One',
    role: 'member'
  }),
  designer: createMockTeamMember({
    id: 'design-1',
    userId: 'design-user-123',
    displayName: 'Designer One',
    role: 'member'
  })
};

// Mock Props Generators
export const createMockProjectTaskManagerProps = (overrides = {}) => ({
  projectId: 'project-123',
  organizationId: 'org-123',
  projectManagerId: 'pm-user-123',
  teamMembers: Object.values(mockTeamMembersDataSet),
  projectTitle: 'Test Project',
  ...overrides
});

export const createMockTaskCreateModalProps = (overrides = {}) => ({
  isOpen: true,
  onClose: jest.fn(),
  onSuccess: jest.fn(),
  projectId: 'project-123',
  organizationId: 'org-123',
  projectManagerId: 'pm-user-123',
  teamMembers: Object.values(mockTeamMembersDataSet),
  ...overrides
});

export const createMockTaskEditModalProps = (overrides = {}) => ({
  isOpen: true,
  onClose: jest.fn(),
  onSuccess: jest.fn(),
  task: mockTasksDataSet.pending,
  teamMembers: Object.values(mockTeamMembersDataSet),
  ...overrides
});

// Utility Functions
export const createDateRelativeToToday = (daysOffset: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const createTimestampRelativeToToday = (daysOffset: number): Timestamp => {
  return Timestamp.fromDate(createDateRelativeToToday(daysOffset));
};

// Mock Progress Click Event
export const createMockProgressClickEvent = (progressPercentage: number) => {
  const event = new MouseEvent('click', {
    clientX: progressPercentage // 0-100 entspricht der Click-Position
  });

  // Mock getBoundingClientRect
  const mockBoundingClientRect = {
    left: 0,
    width: 100
  };

  return { event, mockBoundingClientRect };
};

// Test Assertion Helpers
export const expectTaskToBeVisible = (screen: any, task: ProjectTask) => {
  expect(screen.getByText(task.title)).toBeInTheDocument();
  if (task.description) {
    expect(screen.getByText(task.description)).toBeInTheDocument();
  }
  expect(screen.getByText(`${task.progress || 0}%`)).toBeInTheDocument();
};

export const expectFilterButtonToBeActive = (screen: any, buttonText: string) => {
  const button = screen.getByText(buttonText);
  expect(button).toHaveClass(/bg-\w+-100/, /text-\w+-700/);
};

export const expectFilterButtonToBeInactive = (screen: any, buttonText: string) => {
  const button = screen.getByText(buttonText);
  expect(button).not.toHaveClass(/bg-\w+-100/, /text-\w+-700/);
};

// Error Testing Helpers
export const mockConsoleError = () => {
  const originalError = console.error;
  const mockError = jest.fn();
  console.error = mockError;

  return {
    mockError,
    restore: () => {
      console.error = originalError;
    }
  };
};

export const mockWindowConfirm = (returnValue: boolean = true) => {
  const originalConfirm = window.confirm;
  const mockConfirm = jest.fn(() => returnValue);
  window.confirm = mockConfirm;

  return {
    mockConfirm,
    restore: () => {
      window.confirm = originalConfirm;
    }
  };
};

// Date Helpers for Testing
export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatDateForDisplay = (timestamp: Timestamp): string => {
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Async Test Helpers
export const waitForTasksToLoad = async (screen: any) => {
  // Warte bis Loading-Indikator verschwunden ist
  await expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
};

export const waitForModalToOpen = async (screen: any, modalTestId: string) => {
  await expect(screen.getByTestId(modalTestId)).toBeInTheDocument();
};

export const waitForModalToClose = async (screen: any, modalTestId: string) => {
  await expect(screen.queryByTestId(modalTestId)).not.toBeInTheDocument();
};