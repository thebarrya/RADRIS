'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Edit,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import { Report, ReportStatus } from '@/types';
import { formatDate, formatTime } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ReportsParams {
  page: number;
  limit: number;
  status?: ReportStatus;
  search?: string;
}

const statusConfig = {
  DRAFT: {
    icon: Edit,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Brouillon'
  },
  PRELIMINARY: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Préliminaire'
  },
  FINAL: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Final'
  },
  AMENDED: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Amendé'
  }
};

export default function ReportsPage() {
  const [params, setParams] = useState<ReportsParams>({
    page: 1,
    limit: 20
  });

  const {
    data: reportsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['reports', params],
    queryFn: async () => {
      const response = await reportsApi.getAll(params);
      return response.data;
    },
  });

  const handleSearch = (value: string) => {
    setParams(prev => ({ ...prev, search: value || undefined, page: 1 }));
  };

  const handleStatusFilter = (status?: ReportStatus) => {
    setParams(prev => ({ ...prev, status, page: 1 }));
  };

  return (
    <ProtectedRoute roles={['ADMIN', 'RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR']}>
      <AppLayout>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
                <span className="text-gray-400">|</span>
                <p className="text-sm text-gray-600">Gestion des comptes-rendus</p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button asChild>
                  <Link href="/reports/new" className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Nouveau rapport</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 border-b px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher rapport, patient..."
                  className="pl-10"
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={params.status === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusFilter(undefined)}
              >
                Tous
              </Button>
              {Object.entries(statusConfig).map(([status, config]) => (
                <Button
                  key={status}
                  variant={params.status === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusFilter(status as ReportStatus)}
                >
                  {config.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Liste des rapports</span>
                <span className="text-sm font-normal text-gray-500">
                  {reportsData?.pagination?.total || 0} rapport(s)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-32 text-red-600">
                  Erreur de chargement des rapports
                </div>
              ) : !reportsData?.data || reportsData.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <FileText className="w-8 h-8 mb-2" />
                  <p>Aucun rapport trouvé</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportsData.data.map((report: Report) => {
                    const config = statusConfig[report.status];
                    const Icon = config.icon;
                    
                    return (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${config.bgColor}`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">
                                {report.examination?.examType || 'Rapport sans examen'}
                              </h3>
                              <span className={cn(
                                'px-2 py-1 text-xs rounded-full',
                                config.bgColor,
                                config.color
                              )}>
                                {config.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Patient: {report.examination?.patient ? 
                                `${report.examination.patient.lastName} ${report.examination.patient.firstName}` :
                                'Inconnu'
                              }
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>
                                Créé par: {report.createdBy?.firstName} {report.createdBy?.lastName}
                              </span>
                              <span>
                                Le {formatDate(report.createdAt)} à {formatTime(report.createdAt)}
                              </span>
                              {report.validatedAt && (
                                <span>
                                  Validé le {formatDate(report.validatedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/reports/${report.id}/edit`}>
                              <Edit className="w-4 h-4 mr-1" />
                              Éditer
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/reports/${report.id}`}>
                              Voir
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Pagination */}
              {reportsData?.pagination && reportsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-700">
                    Page {reportsData.pagination.page} sur {reportsData.pagination.totalPages}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reportsData.pagination.page === 1}
                      onClick={() => setParams(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reportsData.pagination.page === reportsData.pagination.totalPages}
                      onClick={() => setParams(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
    </ProtectedRoute>
  );
}