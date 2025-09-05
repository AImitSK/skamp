# Pipeline-Task Integration Workflows

## Übersicht
Detaillierte Dokumentation der Workflows und Automatisierungen für die Integration des Task-Systems in die 7-stufige Projekt-Pipeline. Definiert Trigger, Abhängigkeiten und automatische Prozesse zwischen Pipeline-Stages und Tasks.

## 1. PIPELINE-STAGE MAPPING & WORKFLOWS

### 1.1 Ideas/Planning → Creation Workflow
```typescript
// STAGE TRANSITION: ideas_planning → creation
interface StageTransitionWorkflow {
  currentStage: 'ideas_planning';
  nextStage: 'creation';
  
  // PRE-TRANSITION CHECKS
  requiredTasks: [
    'Projekt-Briefing erstellen',
    'Strategie-Dokument verfassen'
  ];
  
  // AUTOMATIC ACTIONS ON TRANSITION
  onTransition: [
    // 1. Auto-complete Planning Tasks
    {
      action: 'auto_complete_tasks',
      filter: { category: 'project_setup', autoCompleteOnStageChange: true },
      reason: 'Planungsphase abgeschlossen'
    },
    
    // 2. Create Creation Stage Tasks
    {
      action: 'create_stage_tasks',
      stage: 'creation',
      templates: ['content_outline', 'text_creation', 'media_selection', 'distribution_prep']
    },
    
    // 3. Transfer Planning Data to Creation Tasks
    {
      action: 'transfer_context',
      sourceStage: 'ideas_planning',
      targetStage: 'creation',
      contextMappings: [
        { source: 'strategy_document', target: 'content_outline.description' },
        { source: 'target_audience', target: 'media_selection.criteria' },
        { source: 'key_messages', target: 'text_creation.guidelines' }
      ]
    },
    
    // 4. Update Project Progress
    {
      action: 'update_progress',
      progressUpdates: {
        'ideas_planning': 100,
        'creation': 0
      }
    },
    
    // 5. Create Project Folder Structure
    {
      action: 'create_folders',
      folders: ['content', 'media', 'drafts', 'reviews']
    }
  ];
}
```

### 1.2 Creation → Internal Approval Workflow
```typescript
// STAGE TRANSITION: creation → internal_approval
interface CreationToInternalApprovalWorkflow {
  currentStage: 'creation';
  nextStage: 'internal_approval';
  
  // PRE-TRANSITION VALIDATION
  requiredTasks: [
    'Content-Outline erstellen',
    'Texte verfassen',
    'Bilder und Grafiken auswählen'
  ];
  
  // QUALITY CHECKS
  validationChecks: [
    {
      check: 'content_completeness',
      rule: 'project.linkedElements.campaignId !== null',
      message: 'Kampagne muss erstellt und verknüpft sein'
    },
    {
      check: 'media_assets',
      rule: 'project.linkedElements.attachedAssets.length > 0',
      message: 'Mindestens ein Medien-Asset muss ausgewählt sein'
    },
    {
      check: 'text_content',
      rule: 'hasValidTextContent(project.linkedElements.campaignId)',
      message: 'Haupttext der Kampagne muss verfasst sein'
    }
  ];
  
  onTransition: [
    // 1. Generate Internal PDF Version
    {
      action: 'generate_pdf',
      type: 'internal_review',
      includeAssets: true,
      template: 'internal_approval_template',
      autoComplete: true // Marks "PDF-Version für Review erstellen" as completed
    },
    
    // 2. Create Internal Approval Tasks
    {
      action: 'create_stage_tasks',
      stage: 'internal_approval',
      templates: ['internal_review', 'pdf_creation', 'team_feedback', 'implement_corrections']
    },
    
    // 3. Assign Review Tasks to Team
    {
      action: 'assign_tasks',
      assignmentRules: [
        { taskCategory: 'internal_review', assignTo: 'project.assignedTeamMembers[0]' }, // Project Lead
        { taskCategory: 'content_creation', assignTo: 'getTeamMemberByRole("content_creator")' }
      ]
    },
    
    // 4. Send Team Notifications
    {
      action: 'send_notifications',
      recipients: 'project.assignedTeamMembers',
      template: 'internal_review_ready',
      data: {
        projectTitle: 'project.title',
        pdfUrl: 'generated_pdf.url',
        reviewDeadline: '+3 days'
      }
    }
  ];
}
```

### 1.3 Internal Approval → Customer Approval Workflow
```typescript
// STAGE TRANSITION: internal_approval → customer_approval
interface InternalToCustomerApprovalWorkflow {
  currentStage: 'internal_approval';
  nextStage: 'customer_approval';
  
  requiredTasks: [
    'Interne Review durchführen',
    'Feedback Team-Mitglieder einholen',
    'Korrekturen implementieren'
  ];
  
  // CONTENT FINALIZATION CHECKS
  finalizationChecks: [
    {
      check: 'internal_approval_complete',
      rule: 'allInternalFeedbackResolved(project.id)',
      message: 'Alle internen Kommentare müssen abgearbeitet sein'
    },
    {
      check: 'content_final',
      rule: 'project.linkedElements.campaignStatus === "ready_for_approval"',
      message: 'Kampagne muss für Freigabe markiert sein'
    }
  ];
  
  onTransition: [
    // 1. Create Customer Approval Request
    {
      action: 'create_approval_request',
      type: 'customer_approval',
      includeContext: {
        strategy: 'project_strategy_document',
        content: 'campaign_content',
        media: 'selected_assets',
        timeline: 'distribution_timeline'
      }
    },
    
    // 2. Generate Customer-Facing Materials
    {
      action: 'generate_customer_materials',
      materials: [
        { type: 'pdf', template: 'customer_approval_template' },
        { type: 'preview', includeInteractiveElements: true },
        { type: 'media_gallery', selectedAssets: 'project.linkedElements.attachedAssets' }
      ]
    },
    
    // 3. Create Customer Approval Tasks
    {
      action: 'create_stage_tasks',
      stage: 'customer_approval',
      templates: ['approval_prep', 'send_approval_request', 'track_feedback', 'implement_changes']
    },
    
    // 4. Set Approval Deadlines
    {
      action: 'set_deadlines',
      rules: [
        { task: 'Freigabe-Request versenden', dueDate: '+1 day' },
        { task: 'Kunden-Feedback verfolgen', dueDate: '+7 days' }
      ]
    }
  ];
}
```

### 1.4 Customer Approval → Distribution Workflow
```typescript
// STAGE TRANSITION: customer_approval → distribution
interface CustomerApprovalToDistributionWorkflow {
  currentStage: 'customer_approval';
  nextStage: 'distribution';
  
  requiredTasks: [
    'Freigabe-Materialien vorbereiten',
    'Freigabe-Request versenden'
  ];
  
  // APPROVAL STATUS VALIDATION
  approvalChecks: [
    {
      check: 'customer_approval_received',
      rule: 'project.linkedElements.currentApprovalStatus === "approved"',
      message: 'Kunde muss finale Freigabe erteilt haben'
    },
    {
      check: 'final_materials_ready',
      rule: 'allCustomerChangesImplemented(project.id)',
      message: 'Alle Kunden-Änderungen müssen implementiert sein'
    }
  ];
  
  onTransition: [
    // 1. Finalize Distribution Materials
    {
      action: 'finalize_materials',
      steps: [
        'lock_content_editing',
        'generate_final_versions',
        'prepare_distribution_assets'
      ]
    },
    
    // 2. Prepare Distribution Channels
    {
      action: 'setup_distribution',
      channels: [
        { type: 'email', setup: 'configure_email_campaigns' },
        { type: 'press', setup: 'prepare_press_materials' },
        { type: 'social', setup: 'schedule_social_posts' }
      ]
    },
    
    // 3. Create Distribution Tasks
    {
      action: 'create_stage_tasks',
      stage: 'distribution',
      templates: ['finalize_timeline', 'configure_campaigns', 'send_press_release', 'social_posts', 'direct_outreach']
    },
    
    // 4. Schedule Distribution Timeline
    {
      action: 'create_timeline',
      baseDate: 'project.distributionDate || "tomorrow"',
      schedule: [
        { time: '09:00', task: 'Pressemitteilung versenden' },
        { time: '10:30', task: 'Social Media Posts veröffentlichen' },
        { time: '14:00', task: 'Direktansprache wichtiger Medien' }
      ]
    }
  ];
}
```

### 1.5 Distribution → Monitoring Workflow
```typescript
// STAGE TRANSITION: distribution → monitoring
interface DistributionToMonitoringWorkflow {
  currentStage: 'distribution';
  nextStage: 'monitoring';
  
  requiredTasks: [
    'Versand-Timeline finalisieren',
    'E-Mail-Kampagnen konfigurieren',
    'Pressemitteilung versenden'
  ];
  
  // DISTRIBUTION COMPLETION CHECKS
  distributionChecks: [
    {
      check: 'primary_distribution_sent',
      rule: 'project.linkedElements.emailCampaignIds.some(id => getCampaignStatus(id) === "sent")',
      message: 'Hauptversand muss durchgeführt sein'
    },
    {
      check: 'press_release_distributed',
      rule: 'pressReleaseDistributionComplete(project.id)',
      message: 'Pressemitteilung muss versendet sein'
    }
  ];
  
  onTransition: [
    // 1. Initialize Monitoring Systems
    {
      action: 'setup_monitoring',
      systems: [
        { type: 'email_tracking', trackOpens: true, trackClicks: true },
        { type: 'media_monitoring', keywords: 'project.keywords', alerts: true },
        { type: 'social_listening', hashtags: 'project.hashtags' },
        { type: 'web_analytics', landingPages: 'project.linkedElements.landingPages' }
      ]
    },
    
    // 2. Create Monitoring Tasks
    {
      action: 'create_stage_tasks',
      stage: 'monitoring',
      templates: ['track_media_coverage', 'analyze_engagement', 'roi_analysis', 'lessons_learned']
    },
    
    // 3. Schedule Monitoring Reports
    {
      action: 'schedule_reports',
      reports: [
        { type: 'daily_digest', frequency: 'daily', duration: '7 days' },
        { type: 'weekly_summary', frequency: 'weekly', duration: '4 weeks' },
        { type: 'final_report', delay: '30 days' }
      ]
    },
    
    // 4. Set Performance Baselines
    {
      action: 'set_baselines',
      metrics: [
        'email_open_rate',
        'click_through_rate',
        'media_mentions',
        'social_engagement',
        'website_traffic'
      ]
    }
  ];
}
```

### 1.6 Monitoring → Completed Workflow
```typescript
// STAGE TRANSITION: monitoring → completed
interface MonitoringToCompletedWorkflow {
  currentStage: 'monitoring';
  nextStage: 'completed';
  
  requiredTasks: [
    'Medienresonanz verfolgen',
    'Engagement-Metriken analysieren'
  ];
  
  // COMPLETION CRITERIA
  completionChecks: [
    {
      check: 'monitoring_period_complete',
      rule: 'project.createdAt.toMillis() + (30 * 24 * 60 * 60 * 1000) < Date.now()',
      message: 'Mindest-Monitoring-Periode von 30 Tagen muss abgelaufen sein'
    },
    {
      check: 'final_report_ready',
      rule: 'project.analytics && project.analytics.finalReportGenerated',
      message: 'Finaler Performance-Report muss erstellt sein'
    }
  ];
  
  onTransition: [
    // 1. Generate Final Analytics Report
    {
      action: 'generate_final_report',
      includeMetrics: [
        'total_reach',
        'engagement_rates',
        'media_coverage',
        'roi_calculation',
        'goal_achievement'
      ]
    },
    
    // 2. Archive Project Materials
    {
      action: 'archive_project',
      archiveLocations: [
        { type: 'project_folder', status: 'archived' },
        { type: 'campaign_content', status: 'final_version' },
        { type: 'media_assets', status: 'project_completed' }
      ]
    },
    
    // 3. Create Project Closure Tasks
    {
      action: 'create_closure_tasks',
      tasks: [
        'Finalen Report versenden',
        'Client-Feedback einholen',
        'Lessons Learned dokumentieren',
        'Team-Retrospektive durchführen'
      ]
    },
    
    // 4. Update Team Performance Metrics
    {
      action: 'update_team_metrics',
      metrics: [
        'project_completion_rate',
        'timeline_adherence',
        'client_satisfaction',
        'quality_scores'
      ]
    },
    
    // 5. Generate Success Insights
    {
      action: 'extract_insights',
      insights: [
        'most_effective_channels',
        'optimal_timing_patterns',
        'content_performance_factors',
        'resource_utilization'
      ]
    }
  ];
}
```

## 2. TASK-ABHÄNGIGKEITEN & AUTOMATION RULES

### 2.1 Cross-Stage Dependencies
```typescript
// Abhängigkeiten zwischen verschiedenen Stages
interface CrossStageDependencies {
  // Planning → Creation Dependencies
  'content_creation_depends_on_planning': {
    prerequisite: {
      stage: 'ideas_planning',
      requiredTasks: ['Strategie-Dokument verfassen', 'Zeitplan und Meilensteine festlegen']
    },
    dependent: {
      stage: 'creation',
      blockedTasks: ['Texte verfassen', 'Content-Outline erstellen']
    },
    autoUnblockRule: 'when all prerequisite tasks completed'
  };
  
  // Creation → Approval Dependencies
  'approval_depends_on_content': {
    prerequisite: {
      stage: 'creation',
      requiredTasks: ['Texte verfassen', 'Bilder und Grafiken auswählen']
    },
    dependent: {
      stage: 'internal_approval',
      blockedTasks: ['Interne Review durchführen']
    }
  };
  
  // Approval → Distribution Dependencies
  'distribution_depends_on_approval': {
    prerequisite: {
      stage: 'customer_approval',
      requiredConditions: [
        'project.linkedElements.currentApprovalStatus === "approved"',
        'allCustomerFeedbackImplemented(project.id)'
      ]
    },
    dependent: {
      stage: 'distribution',
      blockedTasks: ['E-Mail-Kampagnen konfigurieren', 'Pressemitteilung versenden']
    }
  };
}
```

### 2.2 Automatic Task Creation Rules
```typescript
// Regeln für automatische Task-Erstellung
interface AutoTaskCreationRules {
  // Bei Kampagnen-Verknüpfung
  'on_campaign_linked': {
    trigger: 'project.linkedElements.campaignId !== null',
    createTasks: [
      {
        title: 'Kampagne-Inhalte finalisieren',
        category: 'content_creation',
        stage: 'creation',
        assignTo: 'getTeamMemberByRole("content_creator")',
        dueDate: '+3 days'
      }
    ]
  };
  
  // Bei Asset-Auswahl
  'on_assets_selected': {
    trigger: 'project.linkedElements.attachedAssets.length > 0',
    createTasks: [
      {
        title: 'Asset-Qualität prüfen',
        category: 'media_selection',
        stage: 'creation',
        priority: 'high',
        requiredForStageCompletion: true
      },
      {
        title: 'Asset-Rechte verifizieren',
        category: 'administrative',
        stage: 'creation',
        priority: 'medium'
      }
    ]
  };
  
  // Bei Deadline-Nähe
  'on_deadline_approaching': {
    trigger: 'task.dueDate && task.dueDate - Date.now() <= (48 * 60 * 60 * 1000)', // 48h
    createTasks: [
      {
        title: 'Deadline-Check: ${task.title}',
        category: 'administrative',
        priority: 'urgent',
        assignTo: 'task.assignedTo[0] || project.assignedTeamMembers[0]',
        dueDate: 'task.dueDate'
      }
    ]
  };
}
```

### 2.3 Progress Calculation Algorithms
```typescript
// Fortschritts-Berechnung pro Stage
interface StageProgressCalculation {
  calculateStageProgress(stage: PipelineStage, tasks: Task[]): number {
    const stageTasks = tasks.filter(t => t.pipelineStage === stage);
    if (stageTasks.length === 0) return 0;
    
    // Gewichtete Berechnung
    let totalWeight = 0;
    let completedWeight = 0;
    
    stageTasks.forEach(task => {
      const weight = getTaskWeight(task);
      totalWeight += weight;
      
      if (task.status === 'completed') {
        completedWeight += weight;
      } else if (task.status === 'in_progress') {
        completedWeight += weight * 0.5; // 50% für laufende Tasks
      }
    });
    
    return totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
  }
  
  getTaskWeight(task: Task): number {
    // Critical Tasks haben höheres Gewicht
    let weight = task.requiredForStageCompletion ? 3 : 1;
    
    // Priority-Modifier
    switch (task.priority) {
      case 'urgent': weight *= 2; break;
      case 'high': weight *= 1.5; break;
      case 'medium': weight *= 1; break;
      case 'low': weight *= 0.5; break;
    }
    
    return weight;
  }
  
  calculateOverallProgress(project: Project, tasks: Task[]): number {
    const stageWeights = {
      'ideas_planning': 10,
      'creation': 25,
      'internal_approval': 15,
      'customer_approval': 15,
      'distribution': 25,
      'monitoring': 8,
      'completed': 2
    };
    
    let totalWeight = 0;
    let completedWeight = 0;
    
    Object.entries(stageWeights).forEach(([stage, weight]) => {
      totalWeight += weight;
      const stageProgress = this.calculateStageProgress(stage as PipelineStage, tasks);
      completedWeight += (stageProgress / 100) * weight;
    });
    
    return totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
  }
}
```

## 3. NOTIFICATION & ALERT WORKFLOWS

### 3.1 Task-Based Notifications
```typescript
// Benachrichtigungs-Trigger für Tasks
interface TaskNotificationWorkflows {
  // Überfällige kritische Tasks
  'critical_task_overdue': {
    trigger: 'task.requiredForStageCompletion && task.dueDate < now() && task.status !== "completed"',
    notification: {
      type: 'CRITICAL_TASK_OVERDUE',
      recipients: ['task.assignedTo', 'project.assignedTeamMembers[0]'],
      title: 'Kritische Aufgabe überfällig',
      message: 'Die kritische Aufgabe "${task.title}" in Projekt "${project.title}" ist überfällig. Das Projekt kann nicht fortgesetzt werden.',
      actions: [
        { label: 'Aufgabe öffnen', url: '/dashboard/projects/${project.id}/tasks/${task.id}' },
        { label: 'Projekt anzeigen', url: '/dashboard/projects/${project.id}' }
      ],
      frequency: 'daily'
    }
  };
  
  // Stage kann nicht abgeschlossen werden
  'stage_completion_blocked': {
    trigger: 'attemptedStageTransition && !canCompleteStage',
    notification: {
      type: 'STAGE_BLOCKED',
      recipients: 'project.assignedTeamMembers',
      title: 'Projekt-Phase blockiert',
      message: 'Die Phase "${currentStage}" in Projekt "${project.title}" kann nicht abgeschlossen werden. ${missingTasks.length} kritische Aufgaben sind noch offen.',
      priority: 'high',
      actions: [
        { label: 'Fehlende Aufgaben anzeigen', url: '/dashboard/projects/${project.id}?tab=tasks&filter=critical' }
      ]
    }
  };
  
  // Neue Stage-Tasks erstellt
  'stage_tasks_created': {
    trigger: 'onStageTransition && newTasksCreated.length > 0',
    notification: {
      type: 'NEW_STAGE_TASKS',
      recipients: 'newTasks.assignedTo',
      title: 'Neue Aufgaben zugewiesen',
      message: 'Projekt "${project.title}" ist in die Phase "${newStage}" übergegangen. ${newTasks.length} neue Aufgaben wurden dir zugewiesen.',
      actions: [
        { label: 'Aufgaben anzeigen', url: '/dashboard/projects/${project.id}?tab=tasks&filter=assigned' }
      ]
    }
  };
}
```

### 3.2 Deadline Management
```typescript
// Automatische Deadline-Verwaltung
interface DeadlineManagementWorkflow {
  // Deadlines basierend auf Stage-Übergängen setzen
  setStageDeadlines(project: Project, newStage: PipelineStage): void {
    const deadlineRules = {
      'creation': {
        'Content-Outline erstellen': { days: 2, priority: 'high' },
        'Texte verfassen': { days: 5, priority: 'high' },
        'Bilder und Grafiken auswählen': { days: 4, priority: 'medium' }
      },
      'internal_approval': {
        'Interne Review durchführen': { days: 1, priority: 'high' },
        'Feedback Team-Mitglieder einholen': { days: 3, priority: 'medium' },
        'Korrekturen implementieren': { days: 2, priority: 'high' }
      },
      'customer_approval': {
        'Freigabe-Request versenden': { days: 1, priority: 'urgent' },
        'Kunden-Feedback verfolgen': { days: 7, priority: 'high' }
      },
      'distribution': {
        'E-Mail-Kampagnen konfigurieren': { days: 1, priority: 'urgent' },
        'Pressemitteilung versenden': { days: 1, priority: 'urgent' }
      }
    };
    
    const stageRules = deadlineRules[newStage];
    if (stageRules) {
      const stageTasks = await taskService.getByProjectStage(project.organizationId, project.id, newStage);
      
      stageTasks.forEach(async (task) => {
        const rule = stageRules[task.title];
        if (rule) {
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + rule.days);
          
          await taskService.update(task.id!, {
            dueDate: Timestamp.fromDate(deadline),
            priority: rule.priority
          });
        }
      });
    }
  }
  
  // Deadline-Verlängerungen bei Verzögerungen
  handleStageDelay(project: Project, stage: PipelineStage, delayDays: number): void {
    // Alle nachfolgenden Stage-Deadlines entsprechend verschieben
    const stageOrder = ['ideas_planning', 'creation', 'internal_approval', 'customer_approval', 'distribution', 'monitoring'];
    const currentIndex = stageOrder.indexOf(stage);
    
    for (let i = currentIndex + 1; i < stageOrder.length; i++) {
      const futureStage = stageOrder[i] as PipelineStage;
      const futureTasks = await taskService.getByProjectStage(project.organizationId, project.id, futureStage);
      
      futureTasks.forEach(async (task) => {
        if (task.dueDate) {
          const newDeadline = new Date(task.dueDate.toDate());
          newDeadline.setDate(newDeadline.getDate() + delayDays);
          
          await taskService.update(task.id!, {
            dueDate: Timestamp.fromDate(newDeadline)
          });
        }
      });
    }
  }
}
```

## 4. REAL-TIME SYNCHRONISATION

### 4.1 Firestore Listeners für Task-Updates
```typescript
// Real-time Task-Updates
interface TaskSyncWorkflows {
  setupProjectTaskListener(projectId: string): () => void {
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'tasks'),
        where('linkedProjectId', '==', projectId),
        orderBy('updatedAt', 'desc')
      ),
      async (snapshot) => {
        const changes = snapshot.docChanges();
        
        for (const change of changes) {
          const task = { id: change.doc.id, ...change.doc.data() } as Task;
          
          switch (change.type) {
            case 'added':
              await handleTaskAdded(task);
              break;
            case 'modified':
              await handleTaskModified(task);
              break;
            case 'removed':
              await handleTaskRemoved(task);
              break;
          }
        }
        
        // Re-calculate project progress
        await updateProjectProgress(projectId);
      }
    );
    
    return unsubscribe;
  }
  
  async handleTaskModified(task: Task): Promise<void> {
    // Check if task completion affects stage progress
    if (task.status === 'completed' && task.requiredForStageCompletion) {
      const project = await projectService.getProjectById(task.linkedProjectId!, task.organizationId);
      const completionCheck = await taskService.checkStageCompletionRequirements(
        task.linkedProjectId!,
        project!.stage
      );
      
      if (completionCheck.canComplete) {
        // Notify team that stage can be completed
        await notificationsService.create({
          type: 'STAGE_READY_FOR_COMPLETION',
          recipients: project!.assignedTeamMembers,
          title: 'Phase bereit zum Abschluss',
          message: `Alle kritischen Aufgaben für Phase "${project!.stage}" sind erledigt. Das Projekt kann zur nächsten Phase übergehen.`
        });
      }
    }
    
    // Auto-trigger dependent tasks
    if (task.status === 'completed') {
      await handleTaskDependencies(task);
    }
  }
  
  async handleTaskDependencies(completedTask: Task): Promise<void> {
    // Find tasks that depend on this completed task
    const dependentTasks = await taskService.getByProjectId(
      completedTask.organizationId,
      completedTask.linkedProjectId!
    );
    
    const unblockableTasks = dependentTasks.filter(t => 
      t.dependsOnTaskIds?.includes(completedTask.id!) &&
      t.status === 'pending'
    );
    
    // Update status and send notifications
    for (const task of unblockableTasks) {
      await taskService.update(task.id!, {
        status: 'pending' // Make available for work
      });
      
      if (task.assignedTo && task.assignedTo.length > 0) {
        await notificationsService.create({
          type: 'TASK_UNBLOCKED',
          recipients: task.assignedTo,
          title: 'Aufgabe verfügbar',
          message: `Die Aufgabe "${task.title}" kann jetzt bearbeitet werden.`
        });
      }
    }
  }
}
```

### 4.2 Progress Synchronisation
```typescript
// Automatische Fortschritts-Updates
interface ProgressSyncWorkflow {
  async updateProjectProgress(projectId: string): Promise<void> {
    const project = await projectService.getProjectById(projectId, organizationId);
    const tasks = await taskService.getByProjectId(organizationId, projectId);
    
    if (!project) return;
    
    // Calculate stage-specific progress
    const stageProgress: Record<PipelineStage, number> = {} as any;
    const stages: PipelineStage[] = ['ideas_planning', 'creation', 'internal_approval', 'customer_approval', 'distribution', 'monitoring', 'completed'];
    
    stages.forEach(stage => {
      stageProgress[stage] = calculateStageProgress(stage, tasks);
    });
    
    // Calculate overall progress
    const overallPercent = calculateOverallProgress(project, tasks);
    
    // Update project with new progress
    await projectService.update(projectId, {
      progress: {
        overallPercent,
        stageProgress,
        taskCompletion: tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0,
        lastUpdated: serverTimestamp()
      }
    });
    
    // Check for milestone achievements
    await checkMilestoneAchievements(project, stageProgress, overallPercent);
  }
  
  async checkMilestoneAchievements(
    project: Project,
    stageProgress: Record<PipelineStage, number>,
    overallPercent: number
  ): Promise<void> {
    const milestones = [
      { threshold: 25, message: 'Projekt zu 25% abgeschlossen' },
      { threshold: 50, message: 'Projekt-Halbzeit erreicht' },
      { threshold: 75, message: 'Projekt zu 75% abgeschlossen' },
      { threshold: 90, message: 'Projekt kurz vor Abschluss' }
    ];
    
    const currentMilestone = milestones.find(m => 
      overallPercent >= m.threshold && 
      (project.progress?.overallPercent || 0) < m.threshold
    );
    
    if (currentMilestone) {
      await notificationsService.create({
        type: 'PROJECT_MILESTONE',
        recipients: project.assignedTeamMembers,
        title: 'Projekt-Meilenstein erreicht',
        message: `${currentMilestone.message}: "${project.title}"`,
        linkUrl: `/dashboard/projects/${project.id}`
      });
    }
  }
}
```

## 5. ERROR HANDLING & RECOVERY

### 5.1 Task-Workflow Fehlerbehandlung
```typescript
// Fehlerbehandlung für Task-Workflows
interface TaskWorkflowErrorHandling {
  async handleStageTransitionError(
    projectId: string,
    fromStage: PipelineStage,
    toStage: PipelineStage,
    error: Error
  ): Promise<void> {
    // Log the error
    console.error(`Stage transition failed: ${fromStage} → ${toStage}`, error);
    
    // Rollback any partial changes
    await rollbackStageTransition(projectId, fromStage);
    
    // Create recovery task
    await taskService.create({
      title: `FEHLERBEHANDLUNG: Stage-Übergang ${fromStage} → ${toStage}`,
      description: `Automatischer Stage-Übergang ist fehlgeschlagen. Manuelle Prüfung erforderlich.\n\nFehler: ${error.message}`,
      priority: 'urgent',
      linkedProjectId: projectId,
      pipelineStage: fromStage,
      requiredForStageCompletion: true,
      status: 'pending',
      assignedTo: [getProjectLead(projectId)],
      organizationId: organizationId,
      userId: 'system'
    });
    
    // Notify team
    await notificationsService.create({
      type: 'WORKFLOW_ERROR',
      recipients: [getProjectLead(projectId)],
      title: 'Projekt-Workflow Fehler',
      message: `Automatischer Übergang von "${fromStage}" zu "${toStage}" ist fehlgeschlagen. Eine Korrektur-Aufgabe wurde erstellt.`,
      priority: 'urgent'
    });
  }
  
  async handleTaskCreationFailure(
    projectId: string,
    stage: PipelineStage,
    templates: string[],
    error: Error
  ): Promise<void> {
    // Create manual task creation reminder
    await taskService.create({
      title: `MANUELL: Tasks für ${stage} erstellen`,
      description: `Automatische Task-Erstellung fehlgeschlagen. Folgende Templates sollten manuell angewandt werden:\n\n${templates.join('\n- ')}`,
      priority: 'high',
      linkedProjectId: projectId,
      pipelineStage: stage,
      status: 'pending',
      organizationId: organizationId,
      userId: 'system'
    });
  }
  
  async validateTaskIntegrity(projectId: string): Promise<TaskIntegrityReport> {
    const project = await projectService.getProjectById(projectId, organizationId);
    const tasks = await taskService.getByProjectId(organizationId, projectId);
    
    const issues: TaskIntegrityIssue[] = [];
    
    // Check for orphaned tasks
    const orphanedTasks = tasks.filter(t => 
      t.pipelineStage && 
      getStageOrder(t.pipelineStage) > getStageOrder(project!.stage) + 1
    );
    if (orphanedTasks.length > 0) {
      issues.push({
        type: 'orphaned_tasks',
        severity: 'warning',
        message: `${orphanedTasks.length} Tasks sind weiter als die aktuelle Project-Stage`,
        affectedTasks: orphanedTasks.map(t => t.id!)
      });
    }
    
    // Check for missing required tasks
    const requiredTemplates = getRequiredTemplatesForStage(project!.stage);
    const existingTasks = tasks.filter(t => t.pipelineStage === project!.stage);
    const missingTemplates = requiredTemplates.filter(template => 
      !existingTasks.some(task => task.templateCategory === template.category)
    );
    
    if (missingTemplates.length > 0) {
      issues.push({
        type: 'missing_required_tasks',
        severity: 'error',
        message: `${missingTemplates.length} erforderliche Task-Templates fehlen für Stage "${project!.stage}"`,
        missingTemplates: missingTemplates.map(t => t.id)
      });
    }
    
    return {
      projectId,
      stage: project!.stage,
      issues,
      isValid: issues.filter(i => i.severity === 'error').length === 0
    };
  }
}
```

## ZUSAMMENFASSUNG

### 🔄 WORKFLOW-INTEGRATION ÜBERSICHT

#### **Automatisierte Übergänge:**
1. **Ideas/Planning → Creation**: Auto-complete Planning, Create Content Tasks, Transfer Context
2. **Creation → Internal Approval**: PDF Generation, Team Assignment, Quality Checks
3. **Internal → Customer Approval**: Customer Materials, Approval Requests, Deadline Setting
4. **Customer → Distribution**: Material Finalization, Channel Setup, Timeline Scheduling
5. **Distribution → Monitoring**: Tracking Setup, Report Scheduling, Baseline Setting
6. **Monitoring → Completed**: Final Reports, Archiving, Team Metrics

#### **Task-Abhängigkeiten:**
- **Cross-Stage Dependencies**: Planning → Creation → Approval → Distribution
- **Automatic Task Creation**: Trigger-based Task Generation
- **Progress Calculation**: Weighted Stage Progress with Critical Task Priority
- **Real-time Sync**: Firestore Listeners für Live Updates

#### **Benachrichtigungs-System:**
- **Critical Task Alerts**: Überfällige kritische Aufgaben
- **Stage Completion**: Bereitschaft für nächste Phase
- **Milestone Notifications**: 25%, 50%, 75%, 90% Projekt-Fortschritt
- **Dependency Updates**: Task-Verfügbarkeit nach Abhängigkeits-Erfüllung

#### **Fehlerbehandlung:**
- **Stage Transition Rollback**: Automatisches Rollback bei Fehlern
- **Recovery Tasks**: Systemgenerierte Korrektur-Aufgaben
- **Integrity Validation**: Regelmäßige Prüfung der Task-Konsistenz
- **Manual Fallbacks**: Manuelle Überbrückung bei Automatisierungs-Fehlern

Die Workflows sorgen für eine nahtlose Integration zwischen der Pipeline und dem Task-System, mit robusten Automatisierungen und intelligenten Fallback-Mechanismen.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Projekt-Aufgaben & Checklisten-System analysieren", "status": "completed", "activeForm": "Analysiere Aufgaben-System"}, {"content": "Task-Management Datenstrukturen designen", "status": "completed", "activeForm": "Designe Task-Strukturen"}, {"content": "Aufgaben-Templates und Workflows konzipieren", "status": "completed", "activeForm": "Konzipiere Task-Workflows"}, {"content": "Task-UI-Komponenten spezifizieren", "status": "completed", "activeForm": "Spezifiziere Task-UI"}, {"content": "Integration mit Pipeline-Stages dokumentieren", "status": "completed", "activeForm": "Dokumentiere Pipeline-Integration"}]