'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  History, 
  User, 
  Calendar, 
  FileText, 
  Edit3, 
  Eye, 
  GitBranch,
  Clock,
  CheckCircle,
  AlertCircle,
  Diff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Report, User as UserType, ReportStatus } from '@/types';

interface ReportVersion {
  id: string;
  version: number;
  status: ReportStatus;
  changes: string[];
  changesSummary: string;
  createdBy: UserType;
  createdAt: string;
  content: {
    indication?: string;
    technique?: string;
    findings?: string;
    impression?: string;
    recommendation?: string;
  };
  validatedBy?: UserType;
  validatedAt?: string;
  comments?: string;
}

interface ReportVersionHistoryProps {
  reportId: string;
  currentVersion: Report;
  onRestoreVersion?: (versionId: string) => void;
  onCompareVersions?: (version1: string, version2: string) => void;
  className?: string;
}

const VERSION_TYPES = {
  'major': { color: 'bg-blue-100 text-blue-800', label: 'Major' },
  'minor': { color: 'bg-green-100 text-green-800', label: 'Minor' },
  'patch': { color: 'bg-gray-100 text-gray-800', label: 'Patch' }
};

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PRELIMINARY: 'bg-yellow-100 text-yellow-800',
  FINAL: 'bg-green-100 text-green-800',
  AMENDED: 'bg-blue-100 text-blue-800'
};

export default function ReportVersionHistory({
  reportId,
  currentVersion,
  onRestoreVersion,
  onCompareVersions,
  className
}: ReportVersionHistoryProps) {
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    loadVersionHistory();
  }, [reportId]);

  const loadVersionHistory = async () => {
    try {
      setIsLoading(true);
      
      // Mock data - In real implementation, this would come from API
      const mockVersions: ReportVersion[] = [
        {
          id: 'v3',
          version: 3,
          status: 'FINAL',
          changes: ['Updated impression section', 'Added recommendation'],
          changesSummary: 'Final validation with minor corrections',
          createdBy: {
            id: 'user2',
            email: 'senior@radris.com',
            firstName: 'Marie',
            lastName: 'Dubois',
            role: 'RADIOLOGIST_SENIOR',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          content: {
            indication: currentVersion.indication,
            technique: currentVersion.technique,
            findings: currentVersion.findings,
            impression: currentVersion.impression + ' Final validation completed.',
            recommendation: currentVersion.recommendation + ' Follow-up recommended in 6 months.'
          },
          validatedBy: {
            id: 'user2',
            email: 'senior@radris.com',
            firstName: 'Marie',
            lastName: 'Dubois',
            role: 'RADIOLOGIST_SENIOR',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          validatedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
          comments: 'Report approved with minor corrections'
        },
        {
          id: 'v2',
          version: 2,
          status: 'PRELIMINARY',
          changes: ['Modified findings section', 'Corrected technique description'],
          changesSummary: 'Addressed reviewer comments',
          createdBy: currentVersion.createdBy,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          content: {
            indication: currentVersion.indication,
            technique: currentVersion.technique?.replace('standard', 'enhanced'),
            findings: currentVersion.findings?.replace('normal', 'within normal limits'),
            impression: currentVersion.impression,
            recommendation: currentVersion.recommendation
          },
          comments: 'Incorporated feedback from senior radiologist'
        },
        {
          id: 'v1',
          version: 1,
          status: 'DRAFT',
          changes: ['Initial report creation'],
          changesSummary: 'Initial draft',
          createdBy: currentVersion.createdBy,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
          content: {
            indication: 'Initial clinical indication',
            technique: 'Standard imaging technique',
            findings: 'Initial findings description',
            impression: 'Preliminary impression',
            recommendation: 'Initial recommendations'
          }
        }
      ];

      setVersions(mockVersions);
    } catch (error) {
      console.error('Error loading version history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        return [prev[1], versionId];
      }
    });
  };

  const getVersionType = (version: ReportVersion, previousVersion?: ReportVersion) => {
    if (!previousVersion) return 'major';
    
    const hasStatusChange = version.status !== previousVersion.status;
    const hasContentChange = JSON.stringify(version.content) !== JSON.stringify(previousVersion.content);
    
    if (hasStatusChange) return 'major';
    if (hasContentChange) return 'minor';
    return 'patch';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getChangeIcon = (change: string) => {
    if (change.toLowerCase().includes('created') || change.toLowerCase().includes('initial')) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    } else if (change.toLowerCase().includes('updated') || change.toLowerCase().includes('modified')) {
      return <Edit3 className="h-4 w-4 text-orange-500" />;
    } else if (change.toLowerCase().includes('validated') || change.toLowerCase().includes('approved')) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading version history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Version History</span>
              <Badge variant="outline">{versions.length} versions</Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              {selectedVersions.length === 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCompareVersions?.(selectedVersions[0], selectedVersions[1])}
                >
                  <Diff className="h-4 w-4 mr-1" />
                  Compare
                </Button>
              )}
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <GitBranch className="h-4 w-4 mr-1" />
                    Timeline
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Report Timeline</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {versions.map((version, index) => (
                        <div key={version.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">v{version.version}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{version.changesSummary}</h4>
                              <Badge className={STATUS_COLORS[version.status]}>
                                {version.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              by Dr. {version.createdBy.firstName} {version.createdBy.lastName} • 
                              {formatTimestamp(version.createdAt)}
                            </p>
                            <div className="space-y-1">
                              {version.changes.map((change, changeIndex) => (
                                <div key={changeIndex} className="flex items-center space-x-2 text-sm">
                                  {getChangeIcon(change)}
                                  <span>{change}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {versions.map((version, index) => {
                const previousVersion = versions[index + 1];
                const versionType = getVersionType(version, previousVersion);
                const isSelected = selectedVersions.includes(version.id);
                
                return (
                  <div
                    key={version.id}
                    className={cn(
                      "flex items-start space-x-4 p-4 border rounded-lg cursor-pointer transition-colors",
                      isSelected ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                    )}
                    onClick={() => handleVersionSelect(version.id)}
                  >
                    <div className="flex-shrink-0">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                        index === 0 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                      )}>
                        v{version.version}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            {version.changesSummary}
                          </h4>
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">Current</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge className={VERSION_TYPES[versionType].color}>
                            {VERSION_TYPES[versionType].label}
                          </Badge>
                          <Badge className={STATUS_COLORS[version.status]}>
                            {version.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>Dr. {version.createdBy.firstName} {version.createdBy.lastName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatTimestamp(version.createdAt)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        {version.changes.slice(0, 2).map((change, changeIndex) => (
                          <div key={changeIndex} className="flex items-center space-x-2 text-sm text-gray-700">
                            {getChangeIcon(change)}
                            <span>{change}</span>
                          </div>
                        ))}
                        {version.changes.length > 2 && (
                          <p className="text-xs text-gray-500 ml-6">
                            +{version.changes.length - 2} more changes
                          </p>
                        )}
                      </div>
                      
                      {version.comments && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                          <p className="text-gray-700">{version.comments}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0 flex items-center space-x-1">
                      {index !== 0 && onRestoreVersion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestoreVersion(version.id);
                          }}
                          title="Restore this version"
                        >
                          <GitBranch className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Open version details
                        }}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          
          {selectedVersions.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                {selectedVersions.length === 1 
                  ? `Selected version ${versions.find(v => v.id === selectedVersions[0])?.version}`
                  : `Selected ${selectedVersions.length} versions for comparison`
                }
              </p>
              {selectedVersions.length === 2 && (
                <p className="text-xs text-blue-600 mt-1">
                  Click "Compare" to see differences between versions
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}