'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  BarChart3,
  Zap,
  Target,
  Users
} from 'lucide-react';
import { WorklistTable } from './WorklistTable';
import { WorklistFilters } from './WorklistFilters';
import { BulkActions } from './BulkActions';
import { useAIPrioritization } from '@/hooks/useAIPrioritization';
import { useSmartAssignment } from '@/hooks/useSmartAssignment';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';
import { type Examination } from '@/types';

interface SmartWorklistProps {
  examinations: Examination[];
  onExaminationUpdate: (id: string, updates: Partial<Examination>) => void;
  onBulkAction: (action: string, ids: string[]) => void;
  selectedRows: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function SmartWorklist({
  examinations,
  onExaminationUpdate,
  onBulkAction,
  selectedRows,
  onSelectionChange
}: SmartWorklistProps) {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [autoAssignment, setAutoAssignment] = useState(false);
  const [showInsights, setShowInsights] = useState(true);

  // AI Hooks
  const { 
    prioritizedExams, 
    urgencyScore, 
    isAnalyzing,
    refreshPrioritization 
  } = useAIPrioritization(examinations, aiEnabled);

  const {
    assignmentSuggestions,
    workloadBalance,
    generateAssignments
  } = useSmartAssignment(examinations, autoAssignment);

  const {
    predictions,
    bottlenecks,
    recommendations
  } = usePredictiveAnalytics(examinations);

  // Auto-refresh AI analysis every 5 minutes
  useEffect(() => {
    if (aiEnabled) {
      const interval = setInterval(() => {
        refreshPrioritization();
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [aiEnabled, refreshPrioritization]);

  // Smart-sorted examinations based on AI priority
  const smartExaminations = useMemo(() => {
    if (!aiEnabled) return examinations;
    return prioritizedExams;
  }, [examinations, prioritizedExams, aiEnabled]);

  const handleAIToggle = async (enabled: boolean) => {
    setAiEnabled(enabled);
    if (enabled) {
      await refreshPrioritization();
    }
  };

  const handleAutoAssignment = async () => {
    if (autoAssignment) {
      await generateAssignments();
    }
  };

  const aiInsights = useMemo(() => {
    if (!aiEnabled || !predictions) return [];

    const insights = [];
    
    // High urgency alerts
    const highUrgencyCount = smartExaminations.filter(e => 
      urgencyScore(e.id) > 0.8
    ).length;
    
    if (highUrgencyCount > 0) {
      insights.push({
        type: 'alert',
        icon: AlertTriangle,
        title: `${highUrgencyCount} examen(s) haute priorité`,
        description: 'Nécessitent une attention immédiate',
        color: 'text-red-600 bg-red-50'
      });
    }

    // Workload imbalance
    if (workloadBalance && workloadBalance.imbalanceScore > 0.3) {
      insights.push({
        type: 'warning',
        icon: Users,
        title: 'Déséquilibre de charge détecté',
        description: `${Math.round(workloadBalance.imbalanceScore * 100)}% de déséquilibre`,
        color: 'text-orange-600 bg-orange-50'
      });
    }

    // Bottleneck prediction
    if (bottlenecks && bottlenecks.length > 0) {
      insights.push({
        type: 'prediction',
        icon: TrendingUp,
        title: 'Goulots d\'étranglement prédits',
        description: `${bottlenecks[0].department} dans ${bottlenecks[0].estimatedTime}`,
        color: 'text-purple-600 bg-purple-50'
      });
    }

    // Performance optimization
    if (recommendations && recommendations.length > 0) {
      insights.push({
        type: 'optimization',
        icon: Target,
        title: 'Optimisation suggérée',
        description: recommendations[0].description,
        color: 'text-blue-600 bg-blue-50'
      });
    }

    return insights;
  }, [aiEnabled, predictions, smartExaminations, urgencyScore, workloadBalance, bottlenecks, recommendations]);

  return (
    <div className="space-y-6">
      {/* AI Control Panel */}
      <Card className="border-gradient-to-r from-blue-200 to-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Assistant IA Worklist</CardTitle>
              {isAnalyzing && (
                <Badge variant="secondary" className="animate-pulse">
                  <Zap className="w-3 h-3 mr-1" />
                  Analyse en cours...
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="ai-toggle" className="text-sm font-medium">
                  Priorisation IA
                </label>
                <Switch
                  id="ai-toggle"
                  checked={aiEnabled}
                  onCheckedChange={handleAIToggle}
                />
              </div>
              <div className="flex items-center space-x-2">
                <label htmlFor="auto-assignment" className="text-sm font-medium">
                  Assignation auto
                </label>
                <Switch
                  id="auto-assignment"
                  checked={autoAssignment}
                  onCheckedChange={setAutoAssignment}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        {/* AI Insights Panel */}
        {showInsights && aiInsights.length > 0 && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {aiInsights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${insight.color.split(' ')[1]}`}
                  >
                    <div className="flex items-start space-x-2">
                      <Icon className={`w-4 h-4 mt-0.5 ${insight.color.split(' ')[0]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {insight.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-4 flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={refreshPrioritization}
                disabled={isAnalyzing}
              >
                <Brain className="w-4 h-4 mr-2" />
                Actualiser l'analyse
              </Button>
              {autoAssignment && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAutoAssignment}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Générer assignations
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowInsights(!showInsights)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {showInsights ? 'Masquer' : 'Afficher'} insights
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Enhanced Filters with AI suggestions */}
      <WorklistFilters 
        params={{}}
        onParamsChange={() => {}}
      />

      {/* Bulk Actions with AI recommendations */}
      <BulkActions
        selectedExaminations={smartExaminations.filter(exam => selectedRows.includes(exam.id))}
        selectedIds={selectedRows}
        onClearSelection={() => onSelectionChange([])}
        onBulkUpdate={async (action: string, data: any) => {
          selectedRows.forEach(id => onBulkAction(action, [id]));
        }}
      />

      {/* Smart Worklist Table */}
      <WorklistTable
        data={smartExaminations}
        params={{}}
        onParamsChange={() => {}}
        isLoading={false}
      />

      {/* AI Performance Metrics */}
      {aiEnabled && predictions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Métriques IA en temps réel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(predictions.accuracyScore * 100)}%
                </div>
                <div className="text-xs text-gray-500">Précision prédictions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {predictions.optimizationGain}%
                </div>
                <div className="text-xs text-gray-500">Gain d'efficacité</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(predictions.confidenceLevel * 100)}%
                </div>
                <div className="text-xs text-gray-500">Niveau de confiance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}