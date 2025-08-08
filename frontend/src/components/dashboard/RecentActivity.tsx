'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  User,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

// Mock data for recent activities - in real app this would come from API
const mockActivities = [
  {
    id: '1',
    type: 'examination_completed',
    title: 'Examen validé',
    description: 'Scanner thoracique - Patient MARTIN Jean',
    user: 'Dr. DUPONT Marie',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
    priority: 'normal',
    link: '/examinations/exam123'
  },
  {
    id: '2',
    type: 'report_pending',
    title: 'Rapport en attente',
    description: 'IRM cérébrale - Patient DUBOIS Claire',
    user: 'Dr. BERNARD Paul',
    timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
    priority: 'high',
    link: '/reports/report456'
  },
  {
    id: '3',
    type: 'examination_acquired',
    title: 'Images acquises',
    description: 'Échographie abdominale - Patient LEROY Pierre',
    user: 'Tech. MARTIN Sophie',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    priority: 'normal',
    link: '/examinations/exam789'
  },
  {
    id: '4',
    type: 'urgent_examination',
    title: 'Examen urgent programmé',
    description: 'Scanner cérébral - Patient ROUSSEAU Marie',
    user: 'Dr. THOMAS Julie',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    priority: 'urgent',
    link: '/examinations/exam101'
  },
  {
    id: '5',
    type: 'report_validated',
    title: 'Rapport validé',
    description: 'Radiographie thoracique - Patient MOREAU Jean',
    user: 'Dr. LAMBERT Pierre',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    priority: 'normal',
    link: '/reports/report202'
  }
];

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Activité récente</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href="/activity" className="flex items-center space-x-1">
            <span>Voir tout</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => {
            const config = activityConfig[activity.type as keyof typeof activityConfig];
            const Icon = config.icon;

            return (
              <div
                key={activity.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors ${priorityStyles[activity.priority as keyof typeof priorityStyles]}`}
              >
                <div className={`p-2 rounded-full ${config.bgColor}`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
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
              <span className="font-medium text-blue-900">Activité du jour</span>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-900">
                {mockActivities.filter(a => 
                  new Date(a.timestamp).toDateString() === new Date().toDateString()
                ).length}
              </p>
              <p className="text-xs text-blue-600">événements</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}