'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  FileText, 
  Search, 
  Calendar,
  Users,
  Settings,
  Download,
  Upload,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { UserRole } from '@/types';

interface QuickActionsProps {
  userRole?: UserRole;
}

export function QuickActions({ userRole }: QuickActionsProps) {
  // Define actions based on user role
  const getActionsForRole = (role?: UserRole) => {
    const commonActions = [
      {
        label: 'Rechercher patient',
        icon: Search,
        href: '/patients',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        description: 'Rechercher un patient'
      },
      {
        label: 'Liste de travail',
        icon: FileText,
        href: '/worklist',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        description: 'Accéder à la worklist'
      }
    ];

    const roleSpecificActions: Record<UserRole, any[]> = {
      'ADMIN': [
        {
          label: 'Gestion utilisateurs',
          icon: Users,
          href: '/admin/users',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          description: 'Gérer les utilisateurs'
        },
        {
          label: 'Configuration',
          icon: Settings,
          href: '/admin/settings',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          description: 'Paramètres système'
        },
        {
          label: 'Statistiques',
          icon: BarChart3,
          href: '/admin/statistics',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          description: 'Rapports statistiques'
        }
      ],
      'RADIOLOGIST_SENIOR': [
        {
          label: 'Rapports en attente',
          icon: AlertTriangle,
          href: '/reports?status=pending',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          description: 'Valider les rapports'
        },
        {
          label: 'Nouveau rapport',
          icon: Plus,
          href: '/reports/new',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          description: 'Créer un rapport'
        }
      ],
      'RADIOLOGIST_JUNIOR': [
        {
          label: 'Mes rapports',
          icon: FileText,
          href: '/reports?assignedTo=me',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          description: 'Mes rapports à rédiger'
        },
        {
          label: 'Nouveau rapport',
          icon: Plus,
          href: '/reports/new',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          description: 'Créer un rapport'
        }
      ],
      'TECHNICIAN': [
        {
          label: 'Planifier examen',
          icon: Calendar,
          href: '/examinations/schedule',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          description: 'Programmer un examen'
        },
        {
          label: 'Importer DICOM',
          icon: Upload,
          href: '/dicom/upload',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          description: 'Importer des images'
        }
      ],
      'SECRETARY': [
        {
          label: 'Nouveau patient',
          icon: Plus,
          href: '/patients/new',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          description: 'Créer un patient'
        },
        {
          label: 'Planifier examen',
          icon: Calendar,
          href: '/examinations/schedule',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          description: 'Programmer un examen'
        },
        {
          label: 'Exporter données',
          icon: Download,
          href: '/export',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          description: 'Exporter des données'
        }
      ]
    };

    const roleActions = role ? roleSpecificActions[role] || [] : [];
    return [...commonActions, ...roleActions];
  };

  const actions = getActionsForRole(userRole);

  // Quick stats for the user (mock data)
  const quickStats = [
    {
      label: 'Mes tâches',
      value: 12,
      color: 'text-blue-600'
    },
    {
      label: 'En attente',
      value: 5,
      color: 'text-orange-600'
    },
    {
      label: 'Urgent',
      value: 2,
      color: 'text-red-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Actions rapides</CardTitle>
        <div className="text-sm text-gray-500">
          {userRole && (
            <span>Rôle: {userRole.replace('_', ' ').toLowerCase()}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
          {quickStats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className={`text-lg font-bold ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-600">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            
            return (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start h-auto p-3 hover:bg-gray-50"
                asChild
              >
                <Link href={action.href} prefetch={true} className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${action.bgColor}`}>
                    <Icon className={`w-4 h-4 ${action.color}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">
                      {action.label}
                    </p>
                    <p className="text-sm text-gray-500">
                      {action.description}
                    </p>
                  </div>
                </Link>
              </Button>
            );
          })}
        </div>

        {/* Emergency Actions */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Urgences</h4>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start border-red-200 text-red-700 hover:bg-red-50"
              asChild
            >
              <Link href="/examinations?status=emergency" prefetch={true} className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Examens d'urgence</span>
              </Link>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start border-orange-200 text-orange-700 hover:bg-orange-50"
              asChild
            >
              <Link href="/reports?priority=urgent" prefetch={true} className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Rapports urgents</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* System Status */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Système</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">Opérationnel</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-gray-600">PACS</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">Connecté</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}