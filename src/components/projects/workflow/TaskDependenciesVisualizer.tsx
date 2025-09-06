'use client';

import { useState, useEffect } from 'react';
import { PipelineAwareTask } from '@/types/tasks';
import { 
  ArrowRightIcon, 
  LockClosedIcon, 
  CheckCircleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

interface TaskDependenciesVisualizerProps {
  projectId: string;
  tasks: PipelineAwareTask[];
  onTaskUpdate?: (taskId: string, updates: Partial<PipelineAwareTask>) => Promise<void>;
}

interface TaskNode {
  task: PipelineAwareTask;
  dependencies: string[];
  dependents: string[];
  level: number;
  position: { x: number; y: number };
}

export default function TaskDependenciesVisualizer({
  projectId,
  tasks,
  onTaskUpdate
}: TaskDependenciesVisualizerProps) {
  const [taskNodes, setTaskNodes] = useState<TaskNode[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showCriticalPath, setShowCriticalPath] = useState(true);

  // Berechne Task-Abhängigkeits-Graph
  useEffect(() => {
    const nodes: TaskNode[] = [];
    
    tasks.forEach((task, index) => {
      const dependencies = task.dependsOnTaskIds || [];
      const dependents = tasks
        .filter(t => t.dependsOnTaskIds?.includes(task.id!))
        .map(t => t.id!);

      // Berechne Level basierend auf Dependencies
      let level = 0;
      if (dependencies.length > 0) {
        const depTasks = tasks.filter(t => dependencies.includes(t.id!));
        level = Math.max(...depTasks.map(t => 
          nodes.find(n => n.task.id === t.id)?.level || 0
        )) + 1;
      }

      nodes.push({
        task,
        dependencies,
        dependents,
        level,
        position: {
          x: level * 200 + 50,
          y: index * 100 + 50
        }
      });
    });

    // Sortiere Nodes nach Level für bessere Darstellung
    nodes.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.position.y - b.position.y;
    });

    // Aktualisiere Y-Positionen
    let currentLevel = -1;
    let levelIndex = 0;
    nodes.forEach((node, index) => {
      if (node.level !== currentLevel) {
        currentLevel = node.level;
        levelIndex = 0;
      }
      node.position.y = levelIndex * 80 + 50;
      levelIndex++;
    });

    setTaskNodes(nodes);
  }, [tasks]);

  const getTaskStatus = (task: PipelineAwareTask) => {
    if (task.status === 'completed') return 'completed';
    if (task.status === 'blocked') return 'blocked';
    if (task.dependsOnTaskIds?.some(depId => 
      tasks.find(t => t.id === depId)?.status !== 'completed'
    )) return 'waiting';
    return 'ready';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300 text-green-800';
      case 'blocked': return 'bg-red-100 border-red-300 text-red-800';
      case 'waiting': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'ready': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="w-4 h-4" />;
      case 'blocked': return <LockClosedIcon className="w-4 h-4" />;
      case 'waiting': return <ClockIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTask(taskId === selectedTask ? null : taskId);
  };

  const handleUnblockTask = async (taskId: string) => {
    if (!onTaskUpdate) return;
    
    try {
      await onTaskUpdate(taskId, { status: 'pending' });
    } catch (error) {
      console.error('Fehler beim Entsperren der Task:', error);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Task-Abhängigkeiten
          </h3>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showCriticalPath}
                onChange={(e) => setShowCriticalPath(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Kritischen Pfad anzeigen</span>
            </label>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Legende */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-sm text-gray-600">Abgeschlossen</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span className="text-sm text-gray-600">Bereit</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-sm text-gray-600">Wartend</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-sm text-gray-600">Blockiert</span>
          </div>
        </div>

        {/* Task-Graph */}
        <div className="relative overflow-x-auto" style={{ minHeight: '400px' }}>
          <svg
            width="100%"
            height="400"
            viewBox="0 0 800 400"
            className="absolute inset-0"
          >
            {/* Dependency Lines */}
            {taskNodes.map(node => 
              node.dependencies.map(depId => {
                const depNode = taskNodes.find(n => n.task.id === depId);
                if (!depNode) return null;

                const isHighlighted = showCriticalPath && 
                  (node.task.stageContext?.criticalPath || depNode.task.stageContext?.criticalPath);

                return (
                  <line
                    key={`${depNode.task.id}-${node.task.id}`}
                    x1={depNode.position.x + 100}
                    y1={depNode.position.y + 25}
                    x2={node.position.x}
                    y2={node.position.y + 25}
                    stroke={isHighlighted ? '#ef4444' : '#d1d5db'}
                    strokeWidth={isHighlighted ? 3 : 1}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })
            )}

            {/* Arrow Marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#d1d5db"
                />
              </marker>
            </defs>
          </svg>

          {/* Task Nodes */}
          {taskNodes.map(node => {
            const status = getTaskStatus(node.task);
            const isSelected = selectedTask === node.task.id;
            const isCriticalPath = showCriticalPath && node.task.stageContext?.criticalPath;

            return (
              <div
                key={node.task.id}
                style={{
                  position: 'absolute',
                  left: `${node.position.x}px`,
                  top: `${node.position.y}px`,
                  width: '180px'
                }}
                className="cursor-pointer"
                onClick={() => handleTaskClick(node.task.id!)}
              >
                <div
                  className={`
                    p-3 rounded-lg border-2 transition-all
                    ${getStatusColor(status)}
                    ${isSelected ? 'ring-2 ring-blue-500' : ''}
                    ${isCriticalPath ? 'ring-2 ring-red-500' : ''}
                    hover:shadow-md
                  `}
                >
                  <div className="flex items-start space-x-2">
                    {getStatusIcon(status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {node.task.title}
                      </p>
                      <p className="text-xs opacity-75">
                        {node.task.pipelineStage}
                      </p>
                    </div>
                  </div>

                  {node.task.requiredForStageCompletion && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                        Kritisch für Stage
                      </span>
                    </div>
                  )}
                </div>

                {/* Dependency Info on Selection */}
                {isSelected && (
                  <div className="mt-2 p-2 bg-white border border-gray-200 rounded shadow-lg">
                    {node.dependencies.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-700">
                          Abhängigkeiten:
                        </p>
                        <ul className="text-xs text-gray-600">
                          {node.dependencies.map(depId => {
                            const depTask = tasks.find(t => t.id === depId);
                            return depTask ? (
                              <li key={depId}>{depTask.title}</li>
                            ) : null;
                          })}
                        </ul>
                      </div>
                    )}

                    {status === 'blocked' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnblockTask(node.task.id!);
                        }}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Entsperren
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Task-Liste als Fallback für kleine Bildschirme */}
        <div className="mt-6 lg:hidden">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Task-Liste
          </h4>
          <div className="space-y-2">
            {tasks.map(task => {
              const status = getTaskStatus(task);
              return (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${getStatusColor(status)}`}
                >
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(status)}
                    <span className="flex-1 text-sm font-medium">
                      {task.title}
                    </span>
                    {task.requiredForStageCompletion && (
                      <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">
                        Kritisch
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}