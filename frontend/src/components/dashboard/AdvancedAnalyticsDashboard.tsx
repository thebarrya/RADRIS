'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Brain,
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  Users,
  Zap,
  Target,
  AlertCircle,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react';
import { PredictiveCharts } from './PredictiveCharts';
import { DashboardStats } from './DashboardStats';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';

interface AdvancedAnalyticsDashboardProps {
  examinations: any[];
}

export function AdvancedAnalyticsDashboard({
  examinations
}: AdvancedAnalyticsDashboardProps) {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  // Hooks for data
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { 
    predictions, 
    bottlenecks, 
    recommendations, 
    trends,
    isLoading: analyticsLoading,
    refreshAnalytics 
  } = usePredictiveAnalytics(examinations);

  // Mock data for charts (in real implementation, this would come from APIs)
  const volumeData = React.useMemo(() => [
    { time: '00:00', actual: 2, predicted: 3, confidence: 85 },
    { time: '04:00', actual: 1, predicted: 1, confidence: 92 },
    { time: '08:00', actual: 8, predicted: 7, confidence: 88 },
    { time: '12:00', actual: 12, predicted: 11, confidence: 90 },
    { time: '16:00', actual: 15, predicted: 16, confidence: 87 },
    { time: '20:00', actual: 6, predicted: 8, confidence: 84 },
    { time: '24:00', actual: 0, predicted: 2, confidence: 89 }
  ], []);

  const performanceMetrics = React.useMemo(() => [
    { metric: 'Délais', current: 85, target: 90, trend: 'up' as const, forecast: [85, 87, 89, 90] },
    { metric: 'Qualité', current: 92, target: 95, trend: 'up' as const, forecast: [92, 93, 94, 95] },
    { metric: 'Satisfaction', current: 88, target: 90, trend: 'stable' as const, forecast: [88, 88, 89, 90] },
    { metric: 'Efficacité', current: 76, target: 85, trend: 'up' as const, forecast: [76, 78, 81, 85] }
  ], []);

  const workloadDistribution = React.useMemo(() => [
    { radiologist: 'Dr. Martin', current: 8, optimal: 6, efficiency: 92 },
    { radiologist: 'Dr. Durand', current: 4, optimal: 6, efficiency: 78 },
    { radiologist: 'Dr. Bernard', current: 9, optimal: 6, efficiency: 85 },
    { radiologist: 'Dr. Moreau', current: 3, optimal: 6, efficiency: 65 }
  ], []);

  const qualityTrends = React.useMemo(() => [
    { date: 'Lun', accuracy: 88, timeliness: 92, satisfaction: 85 },
    { date: 'Mar', accuracy: 91, timeliness: 89, satisfaction: 87 },
    { date: 'Mer', accuracy: 89, timeliness: 94, satisfaction: 89 },
    { date: 'Jeu', accuracy: 93, timeliness: 87, satisfaction: 91 },
    { date: 'Ven', accuracy: 90, timeliness: 91, satisfaction: 88 },
    { date: 'Sam', accuracy: 87, timeliness: 85, satisfaction: 86 },
    { date: 'Dim', accuracy: 92, timeliness: 93, satisfaction: 90 }
  ], []);

  // Auto-refresh logic
  useEffect(() => {
    if (autoRefresh && aiEnabled) {
      const interval = setInterval(() => {
        refreshAnalytics();
      }, refreshInterval * 1000);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, aiEnabled, refreshInterval, refreshAnalytics]);

  const handleExportData = () => {
    // Implementation for data export
    console.log('Exporting analytics data...');
  };

  const currentInsights = React.useMemo(() => {
    const insights = [];
    
    if (bottlenecks && bottlenecks.length > 0) {
      const criticalBottlenecks = bottlenecks.filter(b => b.severity > 0.7);
      if (criticalBottlenecks.length > 0) {
        insights.push({
          type: 'warning',
          icon: AlertCircle,
          title: `${criticalBottlenecks.length} goulot(s) critique(s)`,
          description: 'Intervention immédiate recommandée',
          action: 'Voir détails'
        });
      }
    }

    if (recommendations && recommendations.length > 0) {
      const highPriorityRecs = recommendations.filter(r => r.priority === 'high');
      if (highPriorityRecs.length > 0) {
        insights.push({
          type: 'info',
          icon: Target,
          title: `${highPriorityRecs.length} recommandation(s) prioritaire(s)`,
          description: 'Optimisations disponibles',
          action: 'Implémenter'
        });
      }
    }

    if (predictions && predictions.optimizationGain > 20) {
      insights.push({
        type: 'success',
        icon: TrendingUp,
        title: `+${Math.round(predictions.optimizationGain)}% d'efficacité possible`,
        description: 'Avec les optimisations IA',
        action: 'Activer'
      });
    }

    return insights;
  }, [bottlenecks, recommendations, predictions]);

  return (
    <div className="space-y-6">
      {/* AI Analytics Header */}
      <Card className="border-gradient-to-r from-blue-200 to-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl">Analytics IA Avancés</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Insights prédictifs et optimisations intelligentes
                </p>
              </div>
              {(analyticsLoading || statsLoading) && (
                <Badge variant="secondary" className="animate-pulse">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Analyse en cours...
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="ai-analytics" className="text-sm font-medium">
                  IA Analytics
                </label>
                <Switch
                  id="ai-analytics"
                  checked={aiEnabled}
                  onCheckedChange={setAiEnabled}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <label htmlFor="auto-refresh" className="text-sm font-medium">
                  Auto-refresh
                </label>
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
              </div>
              
              <Button size="sm" variant="outline" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Quick Insights */}
        {currentInsights.length > 0 && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentInsights.map((insight, index) => {
                const Icon = insight.icon;
                const colorClasses = {
                  warning: 'bg-orange-50 border-orange-200 text-orange-800',
                  info: 'bg-blue-50 border-blue-200 text-blue-800',
                  success: 'bg-green-50 border-green-200 text-green-800'
                };
                
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${colorClasses[insight.type as keyof typeof colorClasses]}`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className="w-5 h-5 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-xs opacity-80 mt-1">{insight.description}</p>
                        <Button size="sm" variant="ghost" className="mt-2 p-0 h-auto text-xs">
                          {insight.action} →
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Standard Stats */}
      <DashboardStats 
        stats={stats} 
        isLoading={statsLoading} 
        error={statsError} 
      />

      {/* Tabbed Analytics Views */}
      <Tabs defaultValue="predictive" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predictive" className="flex items-center space-x-2">
            <Brain className="w-4 h-4" />
            <span>Prédictif</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Workflow</span>
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Qualité</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="predictive" className="space-y-6">
          {aiEnabled ? (
            <PredictiveCharts
              volumeData={volumeData}
              performanceMetrics={performanceMetrics}
              bottleneckAnalysis={bottlenecks?.map(b => ({
                department: b.department,
                severity: b.severity,
                impact: b.affectedExams / 20, // Normalize to 0-1
                prediction: Math.random() * 0.8 + 0.1 // Mock prediction
              })) || []}
              workloadDistribution={workloadDistribution}
              qualityTrends={qualityTrends}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">
                    Analytics IA désactivés
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Activez l'IA pour accéder aux insights prédictifs
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setAiEnabled(true)}
                  >
                    Activer l'IA Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Délais de Traitement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Acquisition → Rapport</span>
                    <Badge variant="outline">4.2h moyenne</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rapport → Validation</span>
                    <Badge variant="outline">1.8h moyenne</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total processus</span>
                    <Badge variant="default">6.0h moyenne</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Productivité Radiologues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workloadDistribution.map((radiologist, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{radiologist.radiologist}</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {radiologist.current} examens
                        </Badge>
                        <Badge 
                          variant={radiologist.efficiency > 80 ? 'default' : 'secondary'}
                        >
                          {radiologist.efficiency}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Examens en Cours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {examinations?.filter(e => ['IN_PROGRESS', 'REPORTING'].includes(e.status)).length || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  En cours de traitement
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">File d'Attente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {examinations?.filter(e => e.status === 'SCHEDULED').length || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  En attente d'acquisition
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Validés Aujourd'hui</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {examinations?.filter(e => e.status === 'VALIDATED').length || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Examens terminés
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Bottlenecks */}
          {bottlenecks && bottlenecks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Goulots d'Étranglement Détectés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bottlenecks.slice(0, 3).map((bottleneck, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{bottleneck.department}</p>
                        <p className="text-xs text-gray-600">
                          {bottleneck.affectedExams} examens affectés
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={bottleneck.severity > 0.7 ? 'destructive' : 'secondary'}
                        >
                          {Math.round(bottleneck.severity * 100)}%
                        </Badge>
                        <Button size="sm" variant="outline">
                          Résoudre
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Indicateurs Qualité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Taux de précision</span>
                    <Badge variant="default">94.2%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Délais respectés</span>
                    <Badge variant="default">87.5%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Satisfaction patient</span>
                    <Badge variant="default">91.8%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Taux d'amendement</span>
                    <Badge variant="secondary">2.3%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Améliorations Suggérées
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recommendations && recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {recommendations.slice(0, 3).map((rec, index) => (
                      <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline">
                            +{rec.estimatedBenefit}% efficacité
                          </Badge>
                          <Button size="sm" variant="ghost">
                            Voir détails →
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Aucune recommandation disponible pour le moment
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}