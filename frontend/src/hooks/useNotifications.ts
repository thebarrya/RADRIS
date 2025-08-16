'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'system' | 'examination' | 'report' | 'patient' | 'worklist';
  relatedId?: string;
  actionUrl?: string;
}

export function useNotifications() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Générer des notifications d'exemple basées sur les données de la plateforme
  const generateSampleNotifications = (): Notification[] => {
    const now = new Date();
    const userRole = session?.user?.role;
    
    const baseNotifications: Notification[] = [
      {
        id: '1',
        type: 'error',
        title: 'Examen urgent en attente',
        message: 'Scanner thoracique patient Dupont Martin nécessite une lecture immédiate',
        timestamp: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
        read: false,
        priority: 'urgent',
        category: 'examination',
        relatedId: 'exam-123',
        actionUrl: '/examinations/exam-123'
      },
      {
        id: '2',
        type: 'warning',
        title: 'Rapport en attente de validation',
        message: 'IRM encéphalique - Patient Bernard Sophie attend validation senior',
        timestamp: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
        read: false,
        priority: 'high',
        category: 'report',
        relatedId: 'report-456',
        actionUrl: '/reports/report-456'
      },
      {
        id: '3',
        type: 'info',
        title: 'Nouvelle demande d\'examen',
        message: 'Échographie abdominale programmée pour demain 14h00',
        timestamp: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
        read: false,
        priority: 'medium',
        category: 'worklist',
        relatedId: 'exam-789',
        actionUrl: '/worklist'
      },
      {
        id: '4',
        type: 'success',
        title: 'Rapport finalisé',
        message: 'Radiographie thoracique - Patient Moreau Jean validée et envoyée',
        timestamp: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
        read: true,
        priority: 'low',
        category: 'report',
        relatedId: 'report-101',
        actionUrl: '/reports/report-101'
      },
      {
        id: '5',
        type: 'error',
        title: 'Erreur de synchronisation PACS',
        message: 'Échec de transfert des images DICOM - Intervention technique requise',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        read: true,
        priority: 'high',
        category: 'system',
        actionUrl: '/admin/system'
      }
    ];

    // Ajouter des notifications spécifiques selon le rôle
    if (userRole === 'RADIOLOGIST_SENIOR' || userRole === 'RADIOLOGIST_JUNIOR') {
      baseNotifications.push({
        id: 'rad-1',
        type: 'warning',
        title: 'Cas complexe à réviser',
        message: 'IRM cérébrale avec anomalies nécessitant avis senior',
        timestamp: new Date(now.getTime() - 45 * 60 * 1000),
        read: false,
        priority: 'high',
        category: 'examination',
        relatedId: 'exam-complex-1',
        actionUrl: '/examinations/exam-complex-1'
      });
    }

    if (userRole === 'ADMIN') {
      baseNotifications.push({
        id: 'admin-1',
        type: 'info',
        title: 'Maintenance système programmée',
        message: 'Redémarrage du serveur PACS prévu dimanche 3h00',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        read: false,
        priority: 'medium',
        category: 'system',
        actionUrl: '/admin/maintenance'
      });
    }

    return baseNotifications;
  };

  // Charger les notifications
  const fetchNotifications = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      // À remplacer par un vrai appel API vers votre backend
      // const response = await fetch('/api/notifications', {
      //   headers: { 'Authorization': `Bearer ${session.accessToken}` }
      // });
      // const notifications = await response.json();
      
      // Pour le moment, utiliser les données simulées
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const allNotifications = generateSampleNotifications();
      const userRole = session.user?.role;
      
      let filteredNotifications = allNotifications;
      
      // Filtrer selon le rôle
      if (userRole === 'TECHNICIAN') {
        filteredNotifications = allNotifications.filter(n => 
          n.category !== 'report' || n.type === 'info'
        );
      } else if (userRole === 'SECRETARY') {
        filteredNotifications = allNotifications.filter(n => 
          ['worklist', 'patient', 'system'].includes(n.category)
        );
      }
      
      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marquer une notification comme lue
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Supprimer une notification
  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  // Calculer le nombre de notifications non lues
  const unreadCount = notifications.filter(n => !n.read).length;

  // Obtenir les notifications par priorité
  const getNotificationsByPriority = () => {
    const unread = notifications.filter(n => !n.read);
    return {
      urgent: unread.filter(n => n.priority === 'urgent'),
      high: unread.filter(n => n.priority === 'high'),
      medium: unread.filter(n => n.priority === 'medium'),
      low: unread.filter(n => n.priority === 'low')
    };
  };

  // Charger les notifications au montage et quand la session change
  useEffect(() => {
    if (session) {
      fetchNotifications();
      
      // Actualiser les notifications toutes les 30 secondes
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
    getNotificationsByPriority
  };
}