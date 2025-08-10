'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  User,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { examinationsApi } from '@/lib/api';
import { Examination } from '@/types';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  user: string;
  timestamp: Date;
  priority: 'normal' | 'high' | 'urgent';
  link: string;
}

// Convert examinations to activity feed
const createActivityFromExaminations = (examinations: Examination[]): ActivityItem[] => {
  const activities: ActivityItem[] = [];
  
  examinations.forEach(exam => {
    const patientName = `${exam.patient.lastName} ${exam.patient.firstName}`;
    const assignedUser = exam.assignedTo ? `Dr. ${exam.assignedTo.firstName} ${exam.assignedTo.lastName}` : 'Non assigné';
    
    // Create activity based on examination status and timing
    let activityType = '';
    let title = '';
    let priority: 'normal' | 'high' | 'urgent' = 'normal';
    let timestamp = new Date(exam.updatedAt);
    
    switch (exam.status) {
      case 'VALIDATED':
        activityType = 'examination_completed';
        title = 'Examen validé';
        break;
      case 'REPORTING':
        activityType = 'report_pending';
        title = 'Rapport en attente';
        priority = 'high';
        break;
      case 'ACQUIRED':
        activityType = 'examination_acquired';
        title = 'Images acquises';
        break;
      case 'EMERGENCY':
        activityType = 'urgent_examination';
        title = 'Examen d\'urgence';
        priority = 'urgent';
        break;
      case 'IN_PROGRESS':
        activityType = 'examination_in_progress';
        title = 'Examen en cours';
        break;
      default:
        activityType = 'examination_scheduled';
        title = 'Examen programmé';
    }
    
    activities.push({
      id: exam.id,
      type: activityType,
      title,
      description: `${exam.examType} - Patient ${patientName}`,
      user: assignedUser,
      timestamp,
      priority,
      link: `/examinations/${exam.id}`
    });
  });
  
  // Sort by most recent first
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
};

const activityConfig = {
  examination_completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  report_pending: {
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  examination_acquired: {
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  urgent_examination: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  examination_in_progress: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  examination_scheduled: {
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  report_validated: {
    icon: CheckCircle2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  }
};

const priorityStyles = {
  normal: 'border-l-gray-300',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500'
};

export function RecentActivity() {
  // Fetch recent examinations for activity feed
  const { data: worklistData, isLoading, error } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await examinationsApi.getWorklist({
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} min`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `Il y a ${hours}h`;
    } else {
      return format(date, 'dd/MM à HH:mm', { locale: fr });
    }
  };

  // Convert examinations to activities
  const activities = worklistData?.examinations ? createActivityFromExaminations(worklistData.examinations) : [];

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600">Erreur de chargement</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Activité récente</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href="/worklist" className="flex items-center space-x-1">
            <span>Voir tout</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Chargement...</p>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune activité récente</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {activities.map((activity) => {
                const config = activityConfig[activity.type as keyof typeof activityConfig];
                const Icon = config?.icon || Activity;

                return (
                  <div
                    key={activity.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors ${priorityStyles[activity.priority as keyof typeof priorityStyles]}`}
                  >
                    <div className={`p-2 rounded-full ${config?.bgColor || 'bg-gray-100'}`}>
                      <Icon className={`w-4 h-4 ${config?.color || 'text-gray-600'}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {activity.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {activity.description}
                          </p>
                          <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {activity.user}
                            </span>
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTimeAgo(activity.timestamp)}
                            </span>
                          </div>
                        </div>
                        
                        {activity.priority === 'urgent' && (
                          <div className="ml-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Urgent
                            </span>
                          </div>
                        )}
                        
                        {activity.priority === 'high' && (
                          <div className="ml-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Priorité
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {activity.link && (
                        <div className="mt-2">
                          <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-xs">
                            <Link href={activity.link} className="flex items-center space-x-1">
                              <span>Voir détails</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Activity Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Activité récente</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-900">
                    {activities.length}
                  </p>
                  <p className="text-xs text-blue-600">événements</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}