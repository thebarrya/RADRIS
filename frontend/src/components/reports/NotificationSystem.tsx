'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  User,
  Calendar,
  Eye,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User as UserType } from '@/types';

export interface Notification {
  id: string;
  type: 'report_submitted' | 'report_validated' | 'report_rejected' | 'report_amended' | 'comment_added';
  title: string;
  message: string;
  reportId: string;
  reportTitle: string;
  fromUser: UserType;
  toUser: UserType;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
}

interface NotificationSystemProps {
  currentUser: UserType;
  className?: string;
}

const NOTIFICATION_ICONS = {
  report_submitted: Clock,
  report_validated: CheckCircle,
  report_rejected: AlertCircle,
  report_amended: FileText,
  comment_added: MessageSquare
};

const NOTIFICATION_COLORS = {
  report_submitted: 'text-yellow-600 bg-yellow-50',
  report_validated: 'text-green-600 bg-green-50',
  report_rejected: 'text-red-600 bg-red-50',
  report_amended: 'text-blue-600 bg-blue-50',
  comment_added: 'text-purple-600 bg-purple-50'
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

export default function NotificationSystem({ currentUser, className }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load notifications
  useEffect(() => {
    loadNotifications();
    
    // Set up real-time updates (WebSocket or polling)
    const interval = setInterval(loadNotifications, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      
      // Mock data - In real implementation, this would come from API/WebSocket
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          type: 'report_submitted',
          title: 'New Report Submitted',
          message: 'Dr. Jean Martin has submitted a CT Thorax report for your review',
          reportId: 'report-123',
          reportTitle: 'CT Thorax - Patient Dupont',
          fromUser: {
            id: 'user-junior',
            email: 'martin@radris.com',
            firstName: 'Jean',
            lastName: 'Martin',
            role: 'RADIOLOGIST_JUNIOR',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          toUser: currentUser,
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
          read: false,
          priority: 'high',
          actionUrl: '/reports/report-123'
        },
        {
          id: 'notif-2',
          type: 'report_validated',
          title: 'Report Validated',
          message: 'Your MR Brain report has been validated and finalized',
          reportId: 'report-124',
          reportTitle: 'MR Brain - Patient Moreau',
          fromUser: {
            id: 'user-senior',
            email: 'senior@radris.com',
            firstName: 'Marie',
            lastName: 'Dubois',
            role: 'RADIOLOGIST_SENIOR',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          toUser: currentUser,
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
          read: false,
          priority: 'medium',
          actionUrl: '/reports/report-124'
        },
        {
          id: 'notif-3',
          type: 'comment_added',
          title: 'New Comment',
          message: 'Dr. Dubois added a comment to your US Abdomen report',
          reportId: 'report-125',
          reportTitle: 'US Abdomen - Patient Leroy',
          fromUser: {
            id: 'user-senior',
            email: 'senior@radris.com',
            firstName: 'Marie',
            lastName: 'Dubois',
            role: 'RADIOLOGIST_SENIOR',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          toUser: currentUser,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          read: true,
          priority: 'low',
          actionUrl: '/reports/report-125'
        }
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // API call to mark as read
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      });

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const highPriorityCount = notifications.filter(n => !n.read && n.priority === 'high').length;

  return (
    <div className={cn("relative", className)}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            className={cn(
              "absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs",
              highPriorityCount > 0 ? "bg-red-500" : "bg-blue-500"
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <Card className="absolute right-0 top-full mt-2 w-96 max-h-96 z-50 shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span className="font-medium">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary">{unreadCount} new</Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-80">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => {
                      const Icon = NOTIFICATION_ICONS[notification.type];
                      const colorClass = NOTIFICATION_COLORS[notification.type];
                      
                      return (
                        <div
                          key={notification.id}
                          className={cn(
                            "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                            !notification.read && "bg-blue-50/50"
                          )}
                          onClick={() => {
                            if (!notification.read) {
                              markAsRead(notification.id);
                            }
                            if (notification.actionUrl) {
                              window.open(notification.actionUrl, '_blank');
                            }
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={cn("p-2 rounded-full", colorClass)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className={cn(
                                  "text-sm font-medium",
                                  !notification.read && "text-gray-900",
                                  notification.read && "text-gray-700"
                                )}>
                                  {notification.title}
                                </h4>
                                
                                <div className="flex items-center space-x-1">
                                  <Badge 
                                    variant="outline" 
                                    className={cn("text-xs", PRIORITY_COLORS[notification.priority])}
                                  >
                                    {notification.priority}
                                  </Badge>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-2">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center space-x-2">
                                  <User className="h-3 w-3" />
                                  <span>Dr. {notification.fromUser.firstName} {notification.fromUser.lastName}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatTimestamp(notification.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </ScrollArea>

            {notifications.length > 0 && (
              <div className="border-t p-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Navigate to full notifications page
                    window.open('/notifications', '_blank');
                    setIsOpen(false);
                  }}
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View all notifications
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}