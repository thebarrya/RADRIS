'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Lightbulb, 
  MessageSquare, 
  Wand2, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  Target,
  Sparkles
} from 'lucide-react';
import { type Examination, type Report } from '@/types';

interface ReportAssistantProps {
  examination: Examination;
  report: Partial<Report>;
  onReportUpdate: (updates: Partial<Report>) => void;
  enabled?: boolean;
}

interface AISuggestion {
  id: string;
  type: 'template' | 'completion' | 'finding' | 'impression' | 'recommendation';
  title: string;
  content: string;
  confidence: number;
  reasoning: string[];
  context: string;
}

interface QualityMetrics {
  completeness: number;
  clarity: number;
  consistency: number;
  clinicalRelevance: number;
  overallScore: number;
  suggestions: string[];
}

interface TemplateRecommendation {
  id: string;
  name: string;
  description: string;
  matchScore: number;
  template: {
    indication: string;
    technique: string;
    findings: string;
    impression: string;
    recommendation: string;
  };
}

export function ReportAssistant({
  examination,
  report,
  onReportUpdate,
  enabled = true
}: ReportAssistantProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [templateRecommendations, setTemplateRecommendations] = useState<TemplateRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generate context-aware suggestions
  const generateSuggestions = useCallback(async () => {
    if (!enabled || !examination) return;

    setIsAnalyzing(true);

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newSuggestions: AISuggestion[] = [];

      // Template suggestions based on modality and exam type
      if (!report.templateId) {
        newSuggestions.push({
          id: 'template-suggestion',
          type: 'template',
          title: `Template ${examination.modality} - ${examination.examType}`,
          content: getTemplateForExam(examination),
          confidence: 0.92,
          reasoning: [
            'Modalité et type d\'examen correspondants',
            'Template couramment utilisé',
            'Optimisé pour ce type de cas'
          ],
          context: 'Suggestion de template'
        });
      }

      // Auto-completion for current section
      if (report.findings && report.findings.length > 10) {
        const completionSuggestion = generateCompletionSuggestion(report.findings, examination);
        if (completionSuggestion) {
          newSuggestions.push(completionSuggestion);
        }
      }

      // Clinical finding suggestions based on modality
      const findingSuggestions = generateFindingSuggestions(examination);
      newSuggestions.push(...findingSuggestions);

      // Impression suggestions
      if (report.findings && !report.impression) {
        newSuggestions.push({
          id: 'impression-suggestion',
          type: 'impression',
          title: 'Suggestion de conclusion',
          content: generateImpressionFromFindings(report.findings, examination),
          confidence: 0.85,
          reasoning: [
            'Basé sur les constatations décrites',
            'Adapté au contexte clinique',
            'Formulation standard'
          ],
          context: 'Aide à la conclusion'
        });
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [enabled, examination, report]);

  // Calculate quality metrics
  const calculateQualityMetrics = useCallback(() => {
    if (!report || !enabled) return;

    const metrics: QualityMetrics = {
      completeness: calculateCompleteness(report),
      clarity: calculateClarity(report),
      consistency: calculateConsistency(report, examination),
      clinicalRelevance: calculateClinicalRelevance(report, examination),
      overallScore: 0,
      suggestions: []
    };

    // Calculate overall score
    metrics.overallScore = (
      metrics.completeness * 0.3 +
      metrics.clarity * 0.25 +
      metrics.consistency * 0.25 +
      metrics.clinicalRelevance * 0.2
    );

    // Generate improvement suggestions
    if (metrics.completeness < 0.8) {
      metrics.suggestions.push('Compléter les sections manquantes');
    }
    if (metrics.clarity < 0.7) {
      metrics.suggestions.push('Améliorer la clarté du vocabulaire médical');
    }
    if (metrics.consistency < 0.8) {
      metrics.suggestions.push('Vérifier la cohérence entre constatations et conclusion');
    }

    setQualityMetrics(metrics);
  }, [report, examination, enabled]);

  // Get template recommendations
  const getTemplateRecommendations = useCallback(() => {
    if (!enabled || !examination) return;

    const recommendations: TemplateRecommendation[] = [
      {
        id: 'standard-template',
        name: `${examination.modality} Standard`,
        description: 'Template standard pour ce type d\'examen',
        matchScore: 0.95,
        template: getStandardTemplate(examination)
      },
      {
        id: 'detailed-template',
        name: `${examination.modality} Détaillé`,
        description: 'Template détaillé avec sections étendues',
        matchScore: 0.88,
        template: getDetailedTemplate(examination)
      }
    ];

    // Add specialized templates based on clinical context
    if (examination.clinicalInfo?.toLowerCase().includes('oncolog')) {
      recommendations.push({
        id: 'onco-template',
        name: 'Template Oncologique',
        description: 'Optimisé pour le suivi oncologique',
        matchScore: 0.92,
        template: getOncologyTemplate(examination)
      });
    }

    setTemplateRecommendations(recommendations.sort((a, b) => b.matchScore - a.matchScore));
  }, [enabled, examination]);

  // Apply suggestion to report
  const applySuggestion = useCallback((suggestion: AISuggestion) => {
    const updates: Partial<Report> = {};

    switch (suggestion.type) {
      case 'template':
        const template = JSON.parse(suggestion.content);
        Object.assign(updates, template);
        break;
      
      case 'completion':
        if (report.findings) {
          updates.findings = report.findings + ' ' + suggestion.content;
        }
        break;
      
      case 'finding':
        updates.findings = (report.findings || '') + '\n' + suggestion.content;
        break;
      
      case 'impression':
        updates.impression = suggestion.content;
        break;
      
      case 'recommendation':
        updates.recommendation = (report.recommendation || '') + '\n' + suggestion.content;
        break;
    }

    onReportUpdate(updates);
    
    // Remove applied suggestion
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  }, [report, onReportUpdate]);

  // Auto-generate suggestions when report changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      generateSuggestions();
      calculateQualityMetrics();
    }, 1000); // Debounce

    return () => clearTimeout(timeoutId);
  }, [report, generateSuggestions, calculateQualityMetrics]);

  // Load templates on mount
  useEffect(() => {
    getTemplateRecommendations();
  }, [getTemplateRecommendations]);

  if (!enabled) return null;

  return (
    <div className="space-y-4">
      {/* AI Assistant Header */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-lg">Assistant IA Reporting</CardTitle>
              {isAnalyzing && (
                <Badge variant="secondary" className="animate-pulse">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Analyse en cours...
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Simple' : 'Avancé'}
            </Button>
          </div>
        </CardHeader>

        {/* Quality Metrics */}
        {qualityMetrics && (
          <CardContent className="pt-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Qualité globale:</span>
                <Badge 
                  variant={qualityMetrics.overallScore > 0.8 ? 'default' : 'secondary'}
                  className={qualityMetrics.overallScore > 0.8 ? 'bg-green-100 text-green-800' : ''}
                >
                  {Math.round(qualityMetrics.overallScore * 100)}%
                </Badge>
              </div>
              
              {showAdvanced && (
                <div className="flex space-x-3 text-xs">
                  <span>Complétude: {Math.round(qualityMetrics.completeness * 100)}%</span>
                  <span>Clarté: {Math.round(qualityMetrics.clarity * 100)}%</span>
                  <span>Cohérence: {Math.round(qualityMetrics.consistency * 100)}%</span>
                </div>
              )}
            </div>

            {qualityMetrics.suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {qualityMetrics.suggestions.map((suggestion, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {suggestion}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Template Recommendations */}
      {templateRecommendations.length > 0 && !report.templateId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Templates recommandés
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {templateRecommendations.slice(0, 2).map(template => (
              <div
                key={template.id}
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => applySuggestion({
                  id: `template-${template.id}`,
                  type: 'template',
                  title: template.name,
                  content: JSON.stringify(template.template),
                  confidence: template.matchScore,
                  reasoning: ['Template optimisé'],
                  context: 'Template'
                })}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-gray-600">{template.description}</p>
                  </div>
                  <Badge variant="outline">
                    {Math.round(template.matchScore * 100)}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Lightbulb className="w-4 h-4 mr-2" />
              Suggestions IA ({suggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.slice(0, showAdvanced ? 10 : 3).map(suggestion => (
              <div key={suggestion.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-sm">{suggestion.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{suggestion.context}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => applySuggestion(suggestion)}
                    className="ml-2"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Appliquer
                  </Button>
                </div>
                
                <div className="bg-gray-50 p-2 rounded text-sm font-mono">
                  {suggestion.content.length > 150 && !showAdvanced 
                    ? suggestion.content.substring(0, 150) + '...'
                    : suggestion.content
                  }
                </div>

                {showAdvanced && suggestion.reasoning.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 mb-1">Justification:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {suggestion.reasoning.map((reason, index) => (
                        <li key={index} className="flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={generateSuggestions}
              disabled={isAnalyzing}
            >
              <Brain className="w-3 h-3 mr-1" />
              Analyser
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={calculateQualityMetrics}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Qualité
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions for AI logic
function getTemplateForExam(exam: Examination): string {
  const template = getStandardTemplate(exam);
  return JSON.stringify(template);
}

function getStandardTemplate(exam: Examination) {
  return {
    indication: `${exam.clinicalInfo || 'Examen demandé'}`,
    technique: `${exam.modality} ${exam.bodyPart || exam.examType}`,
    findings: `Examen ${exam.modality} du ${exam.bodyPart || exam.examType}.\n\nParenchyme d'aspect normal.\nPas d'anomalie visible.`,
    impression: 'Examen normal.',
    recommendation: 'Pas de suivi particulier nécessaire.'
  };
}

function getDetailedTemplate(exam: Examination) {
  const base = getStandardTemplate(exam);
  return {
    ...base,
    technique: `${base.technique}\nProtocole standard.\nCoupes axiales.\nEpaisseur de coupe: 5mm.`,
    findings: `${base.findings}\n\nAnalyse systématique:\n- Structure normale\n- Pas de lésion focale\n- Pas d'épanchement`
  };
}

function getOncologyTemplate(exam: Examination) {
  return {
    indication: `${exam.clinicalInfo} - Suivi oncologique`,
    technique: `${exam.modality} ${exam.bodyPart} avec injection de produit de contraste`,
    findings: `Examen dans le cadre du suivi oncologique.\n\nPas de nouvelle lésion visible.\nStabilité des lésions connues.`,
    impression: 'Stabilité de la maladie.',
    recommendation: 'Poursuite du suivi selon protocole oncologique.'
  };
}

// Quality calculation functions
function calculateCompleteness(report: Partial<Report>): number {
  const sections = ['indication', 'technique', 'findings', 'impression'];
  const completed = sections.filter(section => 
    report[section as keyof Report] && 
    (report[section as keyof Report] as string).trim().length > 10
  ).length;
  return completed / sections.length;
}

function calculateClarity(report: Partial<Report>): number {
  const text = [report.findings, report.impression, report.recommendation]
    .filter(Boolean)
    .join(' ');
  
  if (!text) return 0;
  
  // Simple clarity metrics
  const words = text.split(' ').length;
  const sentences = text.split(/[.!?]+/).length;
  const avgWordsPerSentence = words / Math.max(1, sentences);
  
  // Prefer moderate sentence length (10-20 words)
  return avgWordsPerSentence > 5 && avgWordsPerSentence < 25 ? 0.9 : 0.7;
}

function calculateConsistency(report: Partial<Report>, exam: Examination): number {
  if (!report.findings || !report.impression) return 0.5;
  
  const findings = report.findings.toLowerCase();
  const impression = report.impression.toLowerCase();
  
  // Check if impression matches findings
  if (findings.includes('normal') && impression.includes('normal')) return 0.95;
  if (findings.includes('anomalie') && !impression.includes('normal')) return 0.9;
  
  return 0.8; // Default reasonable consistency
}

function calculateClinicalRelevance(report: Partial<Report>, exam: Examination): number {
  if (!report.findings) return 0;
  
  const findings = report.findings.toLowerCase();
  const modality = exam.modality.toLowerCase();
  
  // Check if findings mention relevant anatomy for modality
  const relevantTerms = {
    'ct': ['parenchyme', 'contraste', 'lésion', 'structure'],
    'mr': ['signal', 'séquence', 'gadolinium', 't1', 't2'],
    'us': ['échogénicité', 'doppler', 'flux', 'échostructure'],
    'rx': ['opacité', 'densité', 'projection', 'incidence']
  };
  
  const terms = relevantTerms[modality as keyof typeof relevantTerms] || [];
  const matches = terms.filter(term => findings.includes(term)).length;
  
  return Math.min(1, matches / Math.max(1, terms.length / 2));
}

function generateCompletionSuggestion(
  currentText: string, 
  exam: Examination
): AISuggestion | null {
  const lastSentence = currentText.split('.').pop()?.trim();
  if (!lastSentence || lastSentence.length < 5) return null;
  
  // Simple completion logic based on context
  const completions = [
    'Pas d\'anomalie significative associée.',
    'L\'aspect est dans les limites de la normale.',
    'Aucune lésion focale identifiée.',
    'Structure et signal habituels.'
  ];
  
  return {
    id: 'completion-suggestion',
    type: 'completion',
    title: 'Complétion suggérée',
    content: completions[Math.floor(Math.random() * completions.length)],
    confidence: 0.78,
    reasoning: ['Basé sur le contexte actuel', 'Formulation standard'],
    context: 'Auto-complétion'
  };
}

function generateFindingSuggestions(exam: Examination): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  
  // Modality-specific findings
  if (exam.modality === 'CT') {
    suggestions.push({
      id: 'ct-finding',
      type: 'finding',
      title: 'Constatations CT typiques',
      content: 'Structures vasculaires normalement rehaussées après injection.\nPas de lésion hypodense ou hyperdense.',
      confidence: 0.85,
      reasoning: ['Adapté au CT', 'Formulation standard'],
      context: 'Aide à la rédaction'
    });
  }
  
  return suggestions;
}

function generateImpressionFromFindings(
  findings: string, 
  exam: Examination
): string {
  const findingsLower = findings.toLowerCase();
  
  if (findingsLower.includes('normal') || findingsLower.includes('pas d\'anomalie')) {
    return 'Examen normal.';
  }
  
  if (findingsLower.includes('lésion') || findingsLower.includes('anomalie')) {
    return 'Anomalie détectée. Corrélation clinique recommandée.';
  }
  
  return 'Examen interprété. Voir constatations détaillées.';
}