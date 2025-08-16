'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    case 'info':
    default:
      return <Info className="w-4 h-4 text-blue-600" />;
  }
};

const getPriorityColor = (priority: Notification['priority']) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 border-red-200 text-red-800';
    case 'high':
      return 'bg-orange-100 border-orange-200 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 border-yellow-200 text-yellow-800';
    case 'low':
    default:
      return 'bg-gray-100 border-gray-200 text-gray-800';
  }
};

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'À l\'instant';
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `Il y a ${diffInDays}j`;
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(notification.id);
  };

  const content = (
    <div className={`p-3 border rounded-lg transition-colors hover:bg-gray-50 ${
      !notification.read ? 'bg-blue-50 border-blue-200' : getPriorityColor(notification.priority)
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {getNotificationIcon(notification.type)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {notification.title}
              </h4>
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {notification.message}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {notification.category}
                </Badge>
                {notification.priority === 'urgent' && (
                  <Badge variant="destructive" className="text-xs">
                    URGENT
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(notification.timestamp)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAsRead}
            className="h-6 w-6 p-0"
            title={notification.read ? "Marquer comme non lu" : "Marquer comme lu"}
          >
            {notification.read ? (
              <EyeOff className="w-3 h-3" />
            ) : (
              <Eye className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            title="Supprimer"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl} prefetch={true} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export function NotificationDropdown() {
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const recentNotifications = notifications
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center min-w-[20px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Tout marquer comme lu
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Chargement...</p>
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="p-4 text-center">
            <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Aucune notification</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-2 p-2">
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          </ScrollArea>
        )}
        
        {notifications.length > 10 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/notifications" prefetch={true} className="w-full text-center">
                Voir toutes les notifications
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}