'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
  Target,
  Zap,
  BarChart3
} from 'lucide-react';

interface PredictiveChartsProps {
  volumeData: Array<{
    time: string;
    actual: number;
    predicted: number;
    confidence: number;
  }>;
  performanceMetrics: Array<{
    metric: string;
    current: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
    forecast: number[];
  }>;
  bottleneckAnalysis: Array<{
    department: string;
    severity: number;
    impact: number;
    prediction: number;
  }>;
  workloadDistribution: Array<{
    radiologist: string;
    current: number;
    optimal: number;
    efficiency: number;
  }>;
  qualityTrends: Array<{
    date: string;
    accuracy: number;
    timeliness: number;
    satisfaction: number;
  }>;
}

export function PredictiveCharts({
  volumeData,
  performanceMetrics,
  bottleneckAnalysis,
  workloadDistribution,
  qualityTrends
}: PredictiveChartsProps) {
  
  // Color schemes for charts
  const colors = {
    primary: '#0066CC',
    secondary: '#00AA44',
    warning: '#FF8800',
    danger: '#CC0000',
    purple: '#9900CC',
    blue: '#0066CC',
    green: '#00AA44',
    orange: '#FF8800',
    red: '#CC0000'
  };

  // Calculate key insights
  const insights = useMemo(() => {
    const volumeTrend = volumeData.length > 1 
      ? volumeData[volumeData.length - 1].predicted - volumeData[0].actual
      : 0;
    
    const avgAccuracy = qualityTrends.reduce((sum, item) => sum + item.accuracy, 0) / Math.max(1, qualityTrends.length);
    
    const criticalBottlenecks = bottleneckAnalysis.filter(b => b.severity > 0.7).length;
    
    const workloadImbalance = workloadDistribution.reduce((sum, item) => 
      sum + Math.abs(item.current - item.optimal), 0
    ) / Math.max(1, workloadDistribution.length);

    return {
      volumeTrend,
      avgAccuracy,
      criticalBottlenecks,
      workloadImbalance
    };
  }, [volumeData, qualityTrends, bottleneckAnalysis, workloadDistribution]);

  return (
    <div className="space-y-6">
      {/* Key Insights Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className={`w-4 h-4 ${insights.volumeTrend > 0 ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <p className="text-sm font-medium">Tendance Volume</p>
                <p className={`text-lg font-bold ${insights.volumeTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {insights.volumeTrend > 0 ? '+' : ''}{Math.round(insights.volumeTrend)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Précision Moyenne</p>
                <p className="text-lg font-bold text-blue-600">
                  {Math.round(insights.avgAccuracy * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Goulots Critiques</p>
                <p className="text-lg font-bold text-orange-600">
                  {insights.criticalBottlenecks}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Déséquilibre</p>
                <p className="text-lg font-bold text-purple-600">
                  {Math.round(insights.workloadImbalance * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Volume Prediction Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Prédiction de Volume - Prochaines 24h
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border rounded shadow">
                        <p className="font-medium">{label}</p>
                        <p className="text-blue-600">
                          Réel: {payload[0]?.value}
                        </p>
                        <p className="text-purple-600">
                          Prédit: {payload[1]?.value}
                        </p>
                        <p className="text-sm text-gray-500">
                          Confiance: {payload[0]?.payload?.confidence}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="actual" fill={colors.blue} name="Volume Réel" />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke={colors.purple} 
                strokeWidth={2}
                name="Prédiction IA"
                strokeDasharray="5 5"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Métriques de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={performanceMetrics} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="metric" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="current" fill={colors.blue} name="Actuel" />
                <Bar dataKey="target" fill={colors.green} name="Objectif" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bottleneck Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Analyse des Goulots d'Étranglement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={bottleneckAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis domain={[0, 1]} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${Math.round(value * 100)}%`,
                    name === 'severity' ? 'Sévérité' : 
                    name === 'impact' ? 'Impact' : 'Prédiction'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="severity" 
                  stackId="1" 
                  stroke={colors.orange} 
                  fill={colors.orange}
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="impact" 
                  stackId="1" 
                  stroke={colors.red} 
                  fill={colors.red}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Distribution de la Charge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={workloadDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="radiologist" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="current" fill={colors.blue} name="Charge Actuelle" />
                <Bar dataKey="optimal" fill={colors.green} name="Charge Optimale" />
                <Line 
                  type="monotone" 
                  dataKey="efficiency" 
                  stroke={colors.purple} 
                  strokeWidth={2}
                  name="Efficacité (%)"
                  yAxisId="right"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quality Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Tendances Qualité (7 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={qualityTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => [`${Math.round(value)}%`]} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke={colors.blue} 
                  strokeWidth={2}
                  name="Précision"
                />
                <Line 
                  type="monotone" 
                  dataKey="timeliness" 
                  stroke={colors.green} 
                  strokeWidth={2}
                  name="Délais"
                />
                <Line 
                  type="monotone" 
                  dataKey="satisfaction" 
                  stroke={colors.purple} 
                  strokeWidth={2}
                  name="Satisfaction"
                />
                <ReferenceLine y={85} stroke={colors.orange} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Recommandations IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.criticalBottlenecks > 0 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-orange-800">Goulots Détectés</span>
                </div>
                <p className="text-sm text-orange-700 mb-3">
                  {insights.criticalBottlenecks} départements en surcharge
                </p>
                <Button size="sm" variant="outline" className="text-orange-700 border-orange-300">
                  Optimiser maintenant
                </Button>
              </div>
            )}

            {insights.workloadImbalance > 0.3 && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-800">Déséquilibre</span>
                </div>
                <p className="text-sm text-purple-700 mb-3">
                  Redistribution de charge recommandée
                </p>
                <Button size="sm" variant="outline" className="text-purple-700 border-purple-300">
                  Rééquilibrer
                </Button>
              </div>
            )}

            {insights.avgAccuracy < 0.85 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Amélioration</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Précision en dessous de l'objectif (85%)
                </p>
                <Button size="sm" variant="outline" className="text-blue-700 border-blue-300">
                  Analyser causes
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}