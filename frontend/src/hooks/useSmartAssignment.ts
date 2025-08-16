'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { type Examination, type User } from '@/types';

interface SmartAssignmentResult {
  assignmentSuggestions: AssignmentSuggestion[];
  workloadBalance: WorkloadBalance | null;
  generateAssignments: () => Promise<void>;
  radiologistMetrics: RadiologistMetrics[];
}

interface AssignmentSuggestion {
  examId: string;
  suggestedRadiologist: User;
  confidence: number;
  reasoning: string[];
  alternativeOptions: {
    radiologist: User;
    score: number;
  }[];
}

interface WorkloadBalance {
  radiologists: {
    id: string;
    name: string;
    currentLoad: number;
    capacity: number;
    efficiency: number;
    specializations: string[];
  }[];
  imbalanceScore: number; // 0-1, where 1 is severely imbalanced
  recommendations: string[];
}

interface RadiologistMetrics {
  id: string;
  name: string;
  averageReportTime: number; // hours
  accuracy: number; // 0-1
  productivity: number; // exams per day
  specializations: string[];
  currentWorkload: number;
  availabilityScore: number; // 0-1
}

// Mock radiologist data - in real implementation, this would come from user management
const MOCK_RADIOLOGISTS: (User & { specializations?: string[] })[] = [
  {
    id: '1',
    firstName: 'Jean',
    lastName: 'Martin',
    email: 'dr.martin@radris.fr',
    role: 'RADIOLOGIST_SENIOR',
    active: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    specializations: ['CT', 'MR', 'Neurologie']
  },
  {
    id: '2', 
    firstName: 'Marie',
    lastName: 'Durand',
    email: 'dr.durand@radris.fr',
    role: 'RADIOLOGIST_SENIOR',
    active: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    specializations: ['US', 'Cardiologie', 'Gynécologie']
  },
  {
    id: '3',
    firstName: 'Pierre',
    lastName: 'Bernard',
    email: 'dr.bernard@radris.fr', 
    role: 'RADIOLOGIST_JUNIOR',
    active: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    specializations: ['RX', 'Ostéo-articulaire', 'Traumatologie']
  }
];

export function useSmartAssignment(
  examinations: Examination[],
  enabled: boolean
): SmartAssignmentResult {
  const [assignmentSuggestions, setAssignmentSuggestions] = useState<AssignmentSuggestion[]>([]);
  const [workloadBalance, setWorkloadBalance] = useState<WorkloadBalance | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Calculate radiologist metrics
  const radiologistMetrics = useMemo((): RadiologistMetrics[] => {
    return MOCK_RADIOLOGISTS.map(radiologist => {
      const radiologistExams = examinations.filter(exam => 
        exam.assignedTo?.id === radiologist.id
      );

      const completedExams = radiologistExams.filter(exam => 
        exam.status === 'VALIDATED'
      );

      const inProgressExams = radiologistExams.filter(exam => 
        ['IN_PROGRESS', 'REPORTING'].includes(exam.status)
      );

      // Calculate average report time (mock calculation)
      const avgReportTime = completedExams.length > 0 
        ? completedExams.reduce((sum, exam) => {
            const start = new Date(exam.accessionTime || exam.scheduledDate);
            const end = new Date(exam.completedAt || start);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          }, 0) / completedExams.length
        : 8; // Default 8 hours

      // Calculate efficiency metrics
      const productivity = completedExams.length / 7; // exams per day (last week)
      const accuracy = 0.85 + Math.random() * 0.1; // 85-95% accuracy
      const currentWorkload = inProgressExams.length;
      const availabilityScore = Math.max(0, 1 - (currentWorkload / 10)); // Capacity of 10 exams

      return {
        id: radiologist.id,
        name: `${radiologist.firstName} ${radiologist.lastName}`,
        averageReportTime: avgReportTime,
        accuracy,
        productivity,
        specializations: radiologist.specializations || [],
        currentWorkload,
        availabilityScore
      };
    });
  }, [examinations]);

  // Calculate optimal assignment for an examination
  const calculateOptimalAssignment = useCallback((exam: Examination): AssignmentSuggestion | null => {
    if (!enabled) return null;

    const scores = MOCK_RADIOLOGISTS.map(radiologist => {
      const metrics = radiologistMetrics.find(m => m.id === radiologist.id);
      if (!metrics) return { radiologist, score: 0, reasoning: [] };

      let score = 0;
      const reasoning: string[] = [];

      // Specialization match (40% weight)
      const specializationMatch = radiologist.specializations?.some(spec => 
        exam.modality === spec || 
        exam.examType?.toLowerCase().includes(spec.toLowerCase()) ||
        exam.bodyPart?.toLowerCase().includes(spec.toLowerCase())
      ) || false;

      if (specializationMatch) {
        score += 0.4;
        reasoning.push('Spécialisation correspondante');
      } else {
        score += 0.1; // Partial score for general competence
      }

      // Availability (30% weight)
      const availabilityScore = metrics.availabilityScore;
      score += availabilityScore * 0.3;
      if (availabilityScore > 0.7) {
        reasoning.push('Bonne disponibilité');
      } else if (availabilityScore < 0.3) {
        reasoning.push('Charge de travail élevée');
      }

      // Performance metrics (20% weight)
      const performanceScore = (metrics.accuracy + (1 - metrics.averageReportTime / 24)) / 2;
      score += performanceScore * 0.2;
      if (metrics.accuracy > 0.9) {
        reasoning.push('Excellente précision');
      }
      if (metrics.averageReportTime < 4) {
        reasoning.push('Délais rapides');
      }

      // Priority handling (10% weight)
      if (exam.priority === 'EMERGENCY' || exam.priority === 'URGENT') {
        if (metrics.averageReportTime < 6) {
          score += 0.1;
          reasoning.push('Adapté aux urgences');
        }
      }

      return { radiologist, score, reasoning };
    });

    // Sort by score and get best match
    scores.sort((a, b) => b.score - a.score);
    const bestMatch = scores[0];

    if (bestMatch.score < 0.3) return null; // No good match found

    return {
      examId: exam.id,
      suggestedRadiologist: bestMatch.radiologist,
      confidence: bestMatch.score,
      reasoning: bestMatch.reasoning,
      alternativeOptions: scores.slice(1, 3).map(s => ({
        radiologist: s.radiologist,
        score: s.score
      }))
    };
  }, [enabled, radiologistMetrics]);

  // Calculate workload balance
  const calculateWorkloadBalance = useCallback((): WorkloadBalance => {
    const radiologistData = radiologistMetrics.map(metrics => ({
      id: metrics.id,
      name: metrics.name,
      currentLoad: metrics.currentWorkload,
      capacity: 10, // Assume capacity of 10 concurrent exams
      efficiency: metrics.accuracy * metrics.productivity,
      specializations: metrics.specializations
    }));

    // Calculate imbalance score
    const loads = radiologistData.map(r => r.currentLoad / r.capacity);
    const avgLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
    const variance = loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / loads.length;
    const imbalanceScore = Math.min(1, variance * 2); // Normalize to 0-1

    // Generate recommendations
    const recommendations: string[] = [];
    const overloaded = radiologistData.filter(r => r.currentLoad / r.capacity > 0.8);
    const underloaded = radiologistData.filter(r => r.currentLoad / r.capacity < 0.3);

    if (overloaded.length > 0) {
      recommendations.push(
        `Redistribuer la charge de ${overloaded.map(r => r.name).join(', ')}`
      );
    }

    if (underloaded.length > 0 && overloaded.length > 0) {
      recommendations.push(
        `Assigner plus d'examens à ${underloaded.map(r => r.name).join(', ')}`
      );
    }

    if (imbalanceScore > 0.5) {
      recommendations.push('Optimisation automatique recommandée');
    }

    return {
      radiologists: radiologistData,
      imbalanceScore,
      recommendations
    };
  }, [radiologistMetrics]);

  // Generate assignment suggestions for unassigned exams
  const generateAssignments = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    setIsAnalyzing(true);

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      const unassignedExams = examinations.filter(exam => 
        !exam.assignedTo && 
        ['SCHEDULED', 'ACQUIRED'].includes(exam.status)
      );

      const suggestions: AssignmentSuggestion[] = [];

      for (const exam of unassignedExams) {
        const suggestion = calculateOptimalAssignment(exam);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }

      setAssignmentSuggestions(suggestions);
      setWorkloadBalance(calculateWorkloadBalance());

    } catch (error) {
      console.error('Assignment generation failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [enabled, examinations, calculateOptimalAssignment, calculateWorkloadBalance]);

  // Auto-generate assignments when enabled
  useEffect(() => {
    if (enabled) {
      generateAssignments();
    }
  }, [enabled, generateAssignments]);

  // Recalculate workload balance when examinations change
  useEffect(() => {
    if (enabled && examinations.length > 0) {
      setWorkloadBalance(calculateWorkloadBalance());
    }
  }, [enabled, examinations, calculateWorkloadBalance]);

  return {
    assignmentSuggestions,
    workloadBalance,
    generateAssignments,
    radiologistMetrics
  };
}