'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  FileText, 
  Clock, 
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react';
import { DashboardStats as DashboardStatsType } from '@/types';

interface DashboardStatsProps {
  stats?: DashboardStatsType;
  isLoading: boolean;
  error?: Error | null;
}

export function DashboardStats({ stats, isLoading, error }: DashboardStatsProps) {
  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700">Erreur lors du chargement des statistiques</p>
            <p className="text-sm text-red-600 mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatReportingTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}j ${remainingHours.toFixed(0)}h`;
    }
  };

  const kpiCards = [
    {
      title: "Examens du jour",
      value: isLoading ? '-' : stats?.todayExams || 0,
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Examens programmés aujourd'hui"
    },
    {
      title: "Rapports en attente",
      value: isLoading ? '-' : stats?.pendingReports || 0,
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Rapports en cours de rédaction"
    },
    {
      title: "Temps moyen CR",
      value: isLoading ? '-' : formatReportingTime(stats?.avgReportingTime || 0),
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Délai moyen acquisition → validation"
    },
    {
      title: "Activité totale",
      value: isLoading ? '-' : stats?.statusDistribution.reduce((sum, item) => sum + item.count, 0) || 0,
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Total examens (7 derniers jours)"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpiCards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold text-gray-900">
                  {isLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                  ) : (
                    card.value
                  )}
                </div>
                {index === 3 && stats?.statusDistribution && stats.statusDistribution.length > 0 && !isLoading && (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {card.description}
              </p>
              
              {/* Additional context for specific cards */}
              {index === 0 && stats && !isLoading && (
                <div className="mt-2 text-xs text-gray-400">
                  {new Date().toLocaleDateString('fr-FR', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              )}
              
              {index === 1 && stats && !isLoading && (
                <div className="mt-2 text-xs">
                  {stats.pendingReports > 5 ? (
                    <span className="text-orange-600 font-medium">Attention requise</span>
                  ) : (
                    <span className="text-green-600">Niveau normal</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}