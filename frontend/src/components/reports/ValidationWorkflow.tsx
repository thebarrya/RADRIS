'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  User, 
  Calendar,
  AlertTriangle,
  ArrowRight,
  Edit3,
  Eye,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Report, User as UserType, ReportStatus } from '@/types';
import { useViewerReportsIntegration } from '@/services/viewerReportsIntegration';

interface ValidationStep {
  id: string;
  role: string;
  userId?: string;
  user?: UserType;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  comments?: string;
  timestamp?: string;
  required: boolean;
}

interface ValidationWorkflowProps {
  report: Report;
  currentUser: UserType;
  onValidate: (action: 'approve' | 'reject' | 'request_changes', comments?: string) => void;
  onEdit?: () => void;
  className?: string;
}

const VALIDATION_WORKFLOW: Record<string, ValidationStep[]> = {
  'RADIOLOGIST_JUNIOR': [
    {
      id: 'senior_review',
      role: 'RADIOLOGIST_SENIOR',
      status: 'pending',
      required: true
    }
  ],
  'RADIOLOGIST_SENIOR': [
    {
      id: 'final_approval',
      role: 'RADIOLOGIST_SENIOR',
      status: 'completed',
      required: false
    }
  ],
  'TECHNICIAN': [
    {
      id: 'radiologist_review',
      role: 'RADIOLOGIST_JUNIOR',
      status: 'pending',
      required: true
    },
    {
      id: 'senior_review',
      role: 'RADIOLOGIST_SENIOR',
      status: 'pending',
      required: true
    }
  ]
};

const STATUS_CONFIG = {
  DRAFT: { 
    color: 'bg-gray-100 text-gray-800', 
    label: 'Draft',
    icon: Edit3
  },
  PRELIMINARY: { 
    color: 'bg-yellow-100 text-yellow-800', 
    label: 'Pending Review',
    icon: Clock
  },
  FINAL: { 
    color: 'bg-green-100 text-green-800', 
    label: 'Final',
    icon: CheckCircle
  },
  AMENDED: { 
    color: 'bg-blue-100 text-blue-800', 
    label: 'Amended',
    icon: Edit3
  }
};

const ROLE_LABELS: Record<string, string> = {
  'RADIOLOGIST_SENIOR': 'Senior Radiologist',
  'RADIOLOGIST_JUNIOR': 'Junior Radiologist',
  'TECHNICIAN': 'Technician',
  'ADMIN': 'Administrator',
  'SECRETARY': 'Secretary'
};

export default function ValidationWorkflow({
  report,
  currentUser,
  onValidate,
  onEdit,
  className
}: ValidationWorkflowProps) {
  const [validationSteps, setValidationSteps] = useState<ValidationStep[]>([]);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Integration with viewer-reports system
  const { getAnnotations, navigateToViewer } = useViewerReportsIntegration();

  useEffect(() => {
    // Initialize validation workflow based on report author's role
    const authorRole = report.createdBy.role;
    const baseSteps = VALIDATION_WORKFLOW[authorRole] || [];
    
    // Simulate loading validation history
    const steps = baseSteps.map((step, index) => ({
      ...step,
      status: index === 0 && report.status === 'PRELIMINARY' ? 'pending' as const : step.status
    }));

    setValidationSteps(steps);
  }, [report]);

  const canValidate = () => {
    const currentStep = validationSteps.find(step => step.status === 'pending');
    return currentStep && 
           (currentUser.role === currentStep.role || currentUser.role === 'ADMIN') &&
           currentUser.id !== report.createdBy.id;
  };

  const canEdit = () => {
    return currentUser.id === report.createdBy.id && 
           (report.status === 'DRAFT' || report.status === 'PRELIMINARY');
  };

  const handleValidation = async (action: 'approve' | 'reject' | 'request_changes') => {
    if (!canValidate()) return;

    setIsSubmitting(true);
    try {
      await onValidate(action, comments);
      setComments('');
      setShowComments(false);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepIcon = (step: ValidationStep) => {
    switch (step.status) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepStatus = (step: ValidationStep) => {
    switch (step.status) {
      case 'approved':
      case 'completed':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending';
      default:
        return 'Not Started';
    }
  };

  const statusConfig = STATUS_CONFIG[report.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusIcon className="h-5 w-5" />
              <span>Report Status</span>
            </div>
            <Badge className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <Label className="font-medium text-gray-900">Author</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>Dr. {report.createdBy.firstName} {report.createdBy.lastName}</span>
                  <Badge variant="outline" className="text-xs">
                    {ROLE_LABELS[report.createdBy.role]}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="font-medium text-gray-900">Created</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{new Date(report.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              
              <div>
                <Label className="font-medium text-gray-900">Last Updated</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{new Date(report.updatedAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </div>

            {/* Image References Summary */}
            {(() => {
              const annotations = getAnnotations();
              if (annotations.length > 0) {
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium text-blue-900">Image References</Label>
                        <p className="text-sm text-blue-700 mt-1">
                          {annotations.length} annotation(s) linked to this report
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateToViewer()}
                        className="text-blue-600 border-blue-300 hover:bg-blue-100"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Images
                      </Button>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Validation Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowRight className="h-5 w-5 mr-2" />
            Validation Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {validationSteps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  {getStepIcon(step)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      {ROLE_LABELS[step.role]} Review
                      {step.required && <span className="text-red-500 ml-1">*</span>}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        step.status === 'approved' || step.status === 'completed' ? 'text-green-700 border-green-300' :
                        step.status === 'rejected' ? 'text-red-700 border-red-300' :
                        step.status === 'pending' ? 'text-yellow-700 border-yellow-300' :
                        'text-gray-500 border-gray-300'
                      )}
                    >
                      {getStepStatus(step)}
                    </Badge>
                  </div>
                  
                  {step.user && (
                    <p className="text-sm text-gray-600 mb-2">
                      Assigned to: Dr. {step.user.firstName} {step.user.lastName}
                    </p>
                  )}
                  
                  {step.comments && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="flex items-start space-x-2">
                        <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-800">{step.comments}</p>
                          {step.timestamp && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(step.timestamp).toLocaleString('fr-FR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Validation Actions */}
            {canValidate() && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">This report requires your validation</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="validation-comments">Comments (optional)</Label>
                    <Textarea
                      id="validation-comments"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Add comments about your validation decision..."
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => handleValidation('approve')}
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Report
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleValidation('request_changes')}
                      disabled={isSubmitting}
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Request Changes
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleValidation('reject')}
                      disabled={isSubmitting}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Report
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Actions */}
            {canEdit() && onEdit && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Edit3 className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">You can edit this report</span>
                </div>
                
                <Button
                  variant="outline"
                  onClick={onEdit}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Report
                </Button>
              </div>
            )}

            {/* View Only */}
            {!canValidate() && !canEdit() && (
              <div className="text-center py-4">
                <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  You have read-only access to this report
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Validation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-3">
              {/* Mock validation history */}
              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Report created</p>
                  <p className="text-xs text-gray-600">
                    by Dr. {report.createdBy.firstName} {report.createdBy.lastName} • 
                    {new Date(report.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
              
              {report.status === 'PRELIMINARY' && (
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-md">
                  <Clock className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Submitted for review</p>
                    <p className="text-xs text-gray-600">
                      Awaiting validation • {new Date(report.updatedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}