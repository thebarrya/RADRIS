'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { type Examination } from '@/types';

interface PrioritizationResult {
  prioritizedExams: Examination[];
  urgencyScore: (examId: string) => number;
  isAnalyzing: boolean;
  refreshPrioritization: () => Promise<void>;
  insights: PrioritizationInsight[];
}

interface PrioritizationInsight {
  type: 'urgent' | 'delayed' | 'optimization';
  message: string;
  examIds: string[];
  confidence: number;
}

interface AIScoring {
  [examId: string]: {
    urgencyScore: number;
    factors: {
      patientAge: number;
      modalityComplexity: number;
      clinicalPriority: number;
      timeWaiting: number;
      radiologistWorkload: number;
    };
    confidence: number;
    reasoning: string[];
  };
}

export function useAIPrioritization(
  examinations: Examination[],
  enabled: boolean
): PrioritizationResult {
  const [aiScoring, setAiScoring] = useState<AIScoring>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  // Calculate urgency score using AI factors
  const calculateUrgencyScore = useCallback((exam: Examination): number => {
    if (!enabled) return 0.5; // Default neutral score

    const factors = {
      // Age factor (higher urgency for elderly patients)
      patientAge: calculateAgeFactor(new Date(exam.patient.birthDate)),
      
      // Modality complexity (CT/MR = higher urgency)
      modalityComplexity: calculateModalityFactor(exam.modality),
      
      // Clinical priority from examination
      clinicalPriority: calculateClinicalFactor(exam.priority, exam.clinicalInfo),
      
      // Time waiting (longer wait = higher urgency)
      timeWaiting: calculateTimeFactor(new Date(exam.scheduledDate)),
      
      // Current radiologist workload
      radiologistWorkload: calculateWorkloadFactor(exam.assignedTo?.id)
    };

    // Weighted scoring algorithm
    const weights = {
      patientAge: 0.15,
      modalityComplexity: 0.20,
      clinicalPriority: 0.35,
      timeWaiting: 0.20,
      radiologistWorkload: 0.10
    };

    const urgencyScore = Object.entries(factors).reduce((score, [key, value]) => {
      return score + (value * weights[key as keyof typeof weights]);
    }, 0);

    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, urgencyScore));
  }, [enabled]);

  // Age factor calculation
  const calculateAgeFactor = useCallback((birthDate: Date): number => {
    const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
    
    if (age >= 80) return 0.9;      // Very high priority for elderly
    if (age >= 65) return 0.7;      // High priority for seniors
    if (age >= 18) return 0.5;      // Normal priority for adults
    if (age >= 2) return 0.8;       // High priority for children
    return 1.0;                     // Highest priority for infants
  }, []);

  // Modality complexity factor
  const calculateModalityFactor = useCallback((modality: string): number => {
    const complexityMap: { [key: string]: number } = {
      'CT': 0.8,      // High complexity, potential for urgent findings
      'MR': 0.7,      // High complexity, longer interpretation time
      'PET': 0.9,     // Very high complexity, oncology cases
      'US': 0.6,      // Medium complexity, real-time evaluation
      'RX': 0.4,      // Lower complexity, faster interpretation
      'MG': 0.5,      // Medium complexity, screening importance
      'DX': 0.3       // Digital radiography, routine
    };
    
    return complexityMap[modality] || 0.5;
  }, []);

  // Clinical priority factor
  const calculateClinicalFactor = useCallback((
    priority: string, 
    clinicalInfo?: string
  ): number => {
    let score = 0.5;
    
    // Base priority score
    switch (priority) {
      case 'EMERGENCY':
        score = 1.0;
        break;
      case 'URGENT':
        score = 0.8;
        break;
      case 'HIGH':
        score = 0.7;
        break;
      case 'NORMAL':
        score = 0.5;
        break;
      case 'LOW':
        score = 0.3;
        break;
    }

    // Clinical keywords that increase urgency
    if (clinicalInfo) {
      const urgentKeywords = [
        'trauma', 'accident', 'fracture', 'emergency',
        'chest pain', 'stroke', 'hemorrhage', 'tumor',
        'cancer', 'oncology', 'metastasis', 'urgent'
      ];
      
      const lowerInfo = clinicalInfo.toLowerCase();
      const urgentMatches = urgentKeywords.filter(keyword => 
        lowerInfo.includes(keyword)
      ).length;
      
      // Boost score based on urgent keywords
      score = Math.min(1.0, score + (urgentMatches * 0.1));
    }

    return score;
  }, []);

  // Time waiting factor
  const calculateTimeFactor = useCallback((scheduledDate: Date): number => {
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const hoursWaiting = (now.getTime() - scheduled.getTime()) / (1000 * 60 * 60);
    
    if (hoursWaiting < 0) return 0.3;    // Future exam, lower priority
    if (hoursWaiting < 2) return 0.4;    // Very recent, normal priority
    if (hoursWaiting < 6) return 0.6;    // Few hours, increasing priority
    if (hoursWaiting < 24) return 0.8;   // Day old, high priority
    return 1.0;                          // Very old, highest priority
  }, []);

  // Radiologist workload factor
  const calculateWorkloadFactor = useCallback((radiologistId?: string): number => {
    if (!radiologistId) return 0.5;
    
    // Calculate current workload for this radiologist
    const radiologistExams = examinations.filter(exam => 
      exam.assignedTo?.id === radiologistId && 
      ['IN_PROGRESS', 'REPORTING'].includes(exam.status)
    );
    
    const workload = radiologistExams.length;
    
    // Higher workload = lower priority (they're busy)
    if (workload === 0) return 0.9;      // Available, high priority for assignment
    if (workload <= 2) return 0.7;       // Light load
    if (workload <= 5) return 0.5;       // Normal load
    if (workload <= 8) return 0.3;       // Heavy load
    return 0.1;                          // Overloaded, very low priority
  }, [examinations]);

  // Main AI analysis function
  const performAIAnalysis = useCallback(async (): Promise<void> => {
    if (!enabled || examinations.length === 0) return;

    setIsAnalyzing(true);
    
    try {
      // Simulate AI processing time (1-3 seconds)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const newScoring: AIScoring = {};
      
      examinations.forEach(exam => {
        const urgencyScore = calculateUrgencyScore(exam);
        const factors = {
          patientAge: calculateAgeFactor(new Date(exam.patient.birthDate)),
          modalityComplexity: calculateModalityFactor(exam.modality),
          clinicalPriority: calculateClinicalFactor(exam.priority, exam.clinicalInfo),
          timeWaiting: calculateTimeFactor(new Date(exam.scheduledDate)),
          radiologistWorkload: calculateWorkloadFactor(exam.assignedTo?.id)
        };

        // Generate reasoning based on factors
        const reasoning: string[] = [];
        if (factors.patientAge > 0.8) reasoning.push('Patient âgé - priorité élevée');
        if (factors.modalityComplexity > 0.7) reasoning.push('Modalité complexe nécessitant expertise');
        if (factors.clinicalPriority > 0.7) reasoning.push('Priorité clinique élevée');
        if (factors.timeWaiting > 0.8) reasoning.push('Attente prolongée');
        if (factors.radiologistWorkload > 0.8) reasoning.push('Radiologue disponible');

        newScoring[exam.id] = {
          urgencyScore,
          factors,
          confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
          reasoning
        };
      });

      setAiScoring(newScoring);
      setLastAnalysis(new Date());
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    enabled, 
    examinations, 
    calculateUrgencyScore,
    calculateAgeFactor,
    calculateModalityFactor,
    calculateClinicalFactor,
    calculateTimeFactor,
    calculateWorkloadFactor
  ]);

  // Auto-refresh when examinations change
  useEffect(() => {
    if (enabled && examinations.length > 0) {
      performAIAnalysis();
    }
  }, [enabled, examinations.length, performAIAnalysis]);

  // Get urgency score for specific exam
  const urgencyScore = useCallback((examId: string): number => {
    return aiScoring[examId]?.urgencyScore || 0.5;
  }, [aiScoring]);

  // Sort examinations by AI priority
  const prioritizedExams = useMemo(() => {
    if (!enabled || Object.keys(aiScoring).length === 0) {
      return examinations;
    }

    return [...examinations].sort((a, b) => {
      const scoreA = aiScoring[a.id]?.urgencyScore || 0.5;
      const scoreB = aiScoring[b.id]?.urgencyScore || 0.5;
      return scoreB - scoreA; // Highest score first
    });
  }, [examinations, aiScoring, enabled]);

  // Generate insights
  const insights = useMemo((): PrioritizationInsight[] => {
    if (!enabled || Object.keys(aiScoring).length === 0) return [];

    const insights: PrioritizationInsight[] = [];
    
    // Find urgent cases
    const urgentExams = Object.entries(aiScoring)
      .filter(([_, scoring]) => scoring.urgencyScore > 0.8)
      .map(([examId, _]) => examId);
    
    if (urgentExams.length > 0) {
      insights.push({
        type: 'urgent',
        message: `${urgentExams.length} examen(s) nécessitent une attention urgente`,
        examIds: urgentExams,
        confidence: 0.9
      });
    }

    // Find delayed cases
    const delayedExams = Object.entries(aiScoring)
      .filter(([examId, scoring]) => {
        const exam = examinations.find(e => e.id === examId);
        return exam && scoring.factors.timeWaiting > 0.8;
      })
      .map(([examId, _]) => examId);
    
    if (delayedExams.length > 0) {
      insights.push({
        type: 'delayed',
        message: `${delayedExams.length} examen(s) en attente depuis longtemps`,
        examIds: delayedExams,
        confidence: 0.85
      });
    }

    return insights;
  }, [enabled, aiScoring, examinations]);

  return {
    prioritizedExams,
    urgencyScore,
    isAnalyzing,
    refreshPrioritization: performAIAnalysis,
    insights
  };
}