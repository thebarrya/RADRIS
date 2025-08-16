'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  Clock,
  Filter,
  CheckCircle2,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import Link from 'next/link';

const getNotificationIcon = (type: Notification['type'], size = 'w-5 h-5') => {
  switch (type) {
    case 'success':
      return <CheckCircle className={`${size} text-green-600`} />;
    case 'warning':
      return <AlertTriangle className={`${size} text-yellow-600`} />;
    case 'error':
      return <AlertCircle className={`${size} text-red-600`} />;
    case 'info':
    default:
      return <Info className={`${size} text-blue-600`} />;
  }
};

const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
};

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch
  } = useNotifications();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/auth/login');
  }

  const sortedNotifications = notifications
    .sort((a, b) => {
      // Urgent en premier, puis par date
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-600">
                {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Toutes les notifications sont lues'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Tout marquer comme lu
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{notifications.length}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {notifications.filter(n => n.priority === 'urgent').length}
                </p>
                <p className="text-sm text-gray-600">Urgentes</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {notifications.filter(n => n.priority === 'high').length}
                </p>
                <p className="text-sm text-gray-600">Priorité haute</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {notifications.filter(n => n.read).length}
                </p>
                <p className="text-sm text-gray-600">Lues</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg border">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Chargement des notifications...</p>
            </div>
          ) : sortedNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune notification</h3>
              <p className="text-gray-500">Vous êtes à jour !</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(notification.timestamp)}
                            </div>
                            
                            <Badge variant="outline" className="text-xs">
                              {notification.category}
                            </Badge>
                            
                            {notification.priority === 'urgent' && (
                              <Badge variant="destructive" className="text-xs">
                                URGENT
                              </Badge>
                            )}
                            
                            {notification.priority === 'high' && (
                              <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                                PRIORITÉ HAUTE
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {notification.actionUrl && (
                            <Button asChild variant="outline" size="sm">
                              <Link href={notification.actionUrl}>
                                Voir
                              </Link>
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}