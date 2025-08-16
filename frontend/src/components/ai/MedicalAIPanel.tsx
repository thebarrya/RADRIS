'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Brain,
  Eye,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Download,
  Share2
} from 'lucide-react';
import { type Examination } from '@/types';

interface MedicalAIPanelProps {
  examination: Examination;
  studyInstanceUID?: string;
  onAnalysisComplete?: (results: AIAnalysisResult[]) => void;
  enabled?: boolean;
}

interface MedicalAIModel {
  id: string;
  name: string;
  type: 'detection' | 'segmentation' | 'classification' | 'prediction';
  modality: string[];
  bodyPart: string[];
  accuracy: number;
  sensitivity: number;
  specificity: number;
  version: string;
  description: string;
  clinicalUse: string;
  processingTime: number; // seconds
  gpuRequired: boolean;
  enabled: boolean;
}

interface AIAnalysisResult {
  id: string;
  modelId: string;
  modelName: string;
  studyInstanceUID: string;
  analysisId: string;
  findings: AIFinding[];
  confidence: number;
  processingTime: number;
  qualityScore: number;
  recommendations: string[];
  visualizations: AIVisualization[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

interface AIFinding {
  id: string;
  type: 'lesion' | 'abnormality' | 'measurement' | 'annotation';
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    x: number;
    y: number;
    z?: number;
    slice?: number;
  };
  measurements?: {
    volume?: number;
    diameter?: number;
    area?: number;
    density?: number;
  };
  probability: number;
  clinicalSignificance: string;
}

interface AIVisualization {
  id: string;
  type: 'heatmap' | 'segmentation' | 'annotation' | '3d_model';
  imageData: string; // base64 or URL
  overlayData?: string;
  coordinates: number[];
  description: string;
}

export function MedicalAIPanel({
  examination,
  studyInstanceUID,
  onAnalysisComplete,
  enabled = true
}: MedicalAIPanelProps) {
  const [aiModels, setAiModels] = useState<MedicalAIModel[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AIAnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [autoAnalysis, setAutoAnalysis] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load available AI models based on examination
  useEffect(() => {
    if (enabled && examination) {
      loadAvailableModels();
    }
  }, [enabled, examination]);

  const loadAvailableModels = useCallback(async () => {
    // Simulate loading AI models based on modality and body part
    await new Promise(resolve => setTimeout(resolve, 1000));

    const models = getModelsForExamination(examination);
    setAiModels(models);
    
    // Auto-select recommended models
    const recommended = models.filter(model => 
      model.modality.includes(examination.modality) && 
      model.accuracy > 0.9
    );
    setSelectedModels(recommended.map(m => m.id));
  }, [examination]);

  const getModelsForExamination = (exam: Examination): MedicalAIModel[] => {
    const models: MedicalAIModel[] = [];

    // Chest X-ray models
    if (exam.modality === 'CR' || exam.modality === 'DX') {
      if (exam.bodyPart.toLowerCase().includes('chest') || exam.bodyPart.toLowerCase().includes('thorax')) {
        models.push({
          id: 'pneumonia-detector',
          name: 'Pneumonia Detection AI',
          type: 'detection',
          modality: ['CR', 'DX'],
          bodyPart: ['chest', 'thorax'],
          accuracy: 0.94,
          sensitivity: 0.92,
          specificity: 0.96,
          version: '2.1.0',
          description: 'Deep learning model for pneumonia detection in chest X-rays',
          clinicalUse: 'Emergency screening and primary care support',
          processingTime: 3,
          gpuRequired: false,
          enabled: true
        });

        models.push({
          id: 'lung-nodule-detector',
          name: 'Lung Nodule Detection',
          type: 'detection',
          modality: ['CR', 'DX'],
          bodyPart: ['chest', 'thorax'],
          accuracy: 0.91,
          sensitivity: 0.89,
          specificity: 0.93,
          version: '1.8.2',
          description: 'AI model for detecting pulmonary nodules and masses',
          clinicalUse: 'Lung cancer screening and follow-up',
          processingTime: 5,
          gpuRequired: true,
          enabled: true
        });
      }
    }

    // CT scan models
    if (exam.modality === 'CT') {
      if (exam.bodyPart.toLowerCase().includes('head') || exam.bodyPart.toLowerCase().includes('brain')) {
        models.push({
          id: 'brain-hemorrhage-detector',
          name: 'Intracranial Hemorrhage Detection',
          type: 'detection',
          modality: ['CT'],
          bodyPart: ['head', 'brain'],
          accuracy: 0.96,
          sensitivity: 0.94,
          specificity: 0.98,
          version: '3.0.1',
          description: 'Emergency AI for detecting brain hemorrhage in CT scans',
          clinicalUse: 'Emergency department triage and acute care',
          processingTime: 8,
          gpuRequired: true,
          enabled: true
        });

        models.push({
          id: 'stroke-assessment',
          name: 'Acute Stroke Assessment',
          type: 'prediction',
          modality: ['CT'],
          bodyPart: ['head', 'brain'],
          accuracy: 0.89,
          sensitivity: 0.87,
          specificity: 0.91,
          version: '2.3.0',
          description: 'AI for stroke risk assessment and vessel occlusion detection',
          clinicalUse: 'Stroke team activation and treatment planning',
          processingTime: 12,
          gpuRequired: true,
          enabled: true
        });
      }

      if (exam.bodyPart.toLowerCase().includes('chest') || exam.bodyPart.toLowerCase().includes('thorax')) {
        models.push({
          id: 'pulmonary-embolism-detector',
          name: 'Pulmonary Embolism Detection',
          type: 'detection',
          modality: ['CT'],
          bodyPart: ['chest', 'thorax'],
          accuracy: 0.93,
          sensitivity: 0.91,
          specificity: 0.95,
          version: '2.5.0',
          description: 'AI for detecting pulmonary embolism in CT pulmonary angiograms',
          clinicalUse: 'Emergency assessment of suspected PE',
          processingTime: 10,
          gpuRequired: true,
          enabled: true
        });
      }
    }

    // Fracture detection for bone X-rays
    if ((exam.modality === 'CR' || exam.modality === 'DX') && 
        (exam.bodyPart.toLowerCase().includes('bone') || 
         exam.bodyPart.toLowerCase().includes('extremity') ||
         exam.bodyPart.toLowerCase().includes('wrist') ||
         exam.bodyPart.toLowerCase().includes('ankle'))) {
      models.push({
        id: 'fracture-detector',
        name: 'Bone Fracture Detection',
        type: 'detection',
        modality: ['CR', 'DX'],
        bodyPart: ['bone', 'extremity', 'wrist', 'ankle'],
        accuracy: 0.92,
        sensitivity: 0.90,
        specificity: 0.94,
        version: '1.9.1',
        description: 'AI for detecting bone fractures in X-ray images',
        clinicalUse: 'Emergency and trauma imaging support',
        processingTime: 4,
        gpuRequired: false,
        enabled: true
      });
    }

    return models;
  };

  const runAIAnalysis = useCallback(async () => {
    if (!selectedModels.length || !studyInstanceUID) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      const results: AIAnalysisResult[] = [];

      for (let i = 0; i < selectedModels.length; i++) {
        const modelId = selectedModels[i];
        const model = aiModels.find(m => m.id === modelId);
        
        if (!model) continue;

        // Simulate AI processing
        const processingSteps = 5;
        for (let step = 0; step < processingSteps; step++) {
          await new Promise(resolve => setTimeout(resolve, model.processingTime * 200));
          setAnalysisProgress(((i * processingSteps + step + 1) / (selectedModels.length * processingSteps)) * 100);
        }

        // Generate mock AI results
        const result = await generateMockAIResult(model, studyInstanceUID);
        results.push(result);
        
        setAnalysisResults(prev => [...prev, result]);
      }

      if (onAnalysisComplete) {
        onAnalysisComplete(results);
      }

    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  }, [selectedModels, studyInstanceUID, aiModels, onAnalysisComplete]);

  const generateMockAIResult = async (model: MedicalAIModel, studyUID: string): Promise<AIAnalysisResult> => {
    // Generate realistic mock findings based on model type
    const findings: AIFinding[] = [];
    
    if (model.id === 'pneumonia-detector') {
      const hasPneumonia = Math.random() > 0.7; // 30% chance of positive finding
      if (hasPneumonia) {
        findings.push({
          id: 'finding-1',
          type: 'abnormality',
          description: 'Consolidation in right lower lobe consistent with pneumonia',
          confidence: 0.87 + Math.random() * 0.1,
          severity: 'medium',
          location: { x: 320, y: 240, slice: 1 },
          probability: 0.85,
          clinicalSignificance: 'Likely pneumonia - recommend clinical correlation and treatment'
        });
      }
    } else if (model.id === 'brain-hemorrhage-detector') {
      const hasHemorrhage = Math.random() > 0.9; // 10% chance of positive finding
      if (hasHemorrhage) {
        findings.push({
          id: 'finding-1',
          type: 'abnormality',
          description: 'Acute intracranial hemorrhage in left parietal region',
          confidence: 0.94 + Math.random() * 0.05,
          severity: 'critical',
          location: { x: 180, y: 160, slice: 15 },
          measurements: { volume: 12.5, diameter: 2.8 },
          probability: 0.96,
          clinicalSignificance: 'CRITICAL: Acute hemorrhage detected - immediate intervention required'
        });
      }
    } else if (model.id === 'fracture-detector') {
      const hasFracture = Math.random() > 0.6; // 40% chance of positive finding
      if (hasFracture) {
        findings.push({
          id: 'finding-1',
          type: 'abnormality',
          description: 'Linear fracture of distal radius',
          confidence: 0.91 + Math.random() * 0.08,
          severity: 'medium',
          location: { x: 200, y: 300, slice: 1 },
          probability: 0.89,
          clinicalSignificance: 'Fracture detected - orthopedic consultation recommended'
        });
      }
    }

    return {
      id: `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      modelId: model.id,
      modelName: model.name,
      studyInstanceUID: studyUID,
      analysisId: `ai-${Date.now()}`,
      findings,
      confidence: findings.length > 0 ? Math.max(...findings.map(f => f.confidence)) : 0.95,
      processingTime: model.processingTime,
      qualityScore: 0.85 + Math.random() * 0.1,
      recommendations: generateRecommendations(findings, model),
      visualizations: [],
      status: 'completed',
      createdAt: new Date()
    };
  };

  const generateRecommendations = (findings: AIFinding[], model: MedicalAIModel): string[] => {
    const recommendations: string[] = [];
    
    if (findings.length === 0) {
      recommendations.push('No significant abnormalities detected by AI analysis');
      recommendations.push('Continue with standard radiological interpretation');
    } else {
      findings.forEach(finding => {
        if (finding.severity === 'critical') {
          recommendations.push('🚨 URGENT: Critical finding detected - immediate clinical attention required');
          recommendations.push('Contact attending physician or emergency team immediately');
        } else if (finding.severity === 'high') {
          recommendations.push('⚠️ High priority finding - expedite radiologist review');
        } else {
          recommendations.push('📋 Document finding in final report');
          recommendations.push('Consider clinical correlation');
        }
      });
    }
    
    recommendations.push(`AI analysis completed with ${model.name} v${model.version}`);
    return recommendations;
  };

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  if (!enabled) return null;

  return (
    <div className="space-y-6">
      {/* AI Panel Header */}
      <Card className="border-gradient-to-r from-green-200 to-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-6 h-6 text-green-600" />
              <div>
                <CardTitle className="text-xl">Medical AI Analysis</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  AI-powered clinical decision support
                </p>
              </div>
              {isAnalyzing && (
                <Badge variant="secondary" className="animate-pulse">
                  <Zap className="w-3 h-3 mr-1 animate-spin" />
                  Analyzing...
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="auto-analysis" className="text-sm font-medium">
                  Auto-Analysis
                </label>
                <Switch
                  id="auto-analysis"
                  checked={autoAnalysis}
                  onCheckedChange={setAutoAnalysis}
                />
              </div>
              
              <Button
                onClick={runAIAnalysis}
                disabled={isAnalyzing || selectedModels.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isAnalyzing ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Processing Progress */}
        {isAnalyzing && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing with {selectedModels.length} AI model(s)</span>
                <span>{Math.round(analysisProgress)}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* AI Models and Results Tabs */}
      <Tabs defaultValue="models" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="models" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>AI Models</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Results ({analysisResults.length})</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Clinical Insights</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Available AI Models for {examination.modality}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiModels.length > 0 ? (
                <div className="space-y-4">
                  {aiModels.map(model => (
                    <div
                      key={model.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        selectedModels.includes(model.id)
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold">{model.name}</h3>
                            <Badge variant="outline">v{model.version}</Badge>
                            <Badge 
                              variant={model.accuracy > 0.9 ? 'default' : 'secondary'}
                            >
                              {Math.round(model.accuracy * 100)}% accuracy
                            </Badge>
                            {model.gpuRequired && (
                              <Badge variant="outline" className="text-xs">
                                GPU Required
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {model.description}
                          </p>
                          
                          <div className="text-xs text-gray-500 space-y-1">
                            <p><strong>Clinical Use:</strong> {model.clinicalUse}</p>
                            <p><strong>Processing Time:</strong> ~{model.processingTime}s</p>
                            <div className="flex space-x-4">
                              <span>Sensitivity: {Math.round(model.sensitivity * 100)}%</span>
                              <span>Specificity: {Math.round(model.specificity * 100)}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={selectedModels.includes(model.id)}
                            onCheckedChange={() => toggleModel(model.id)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    No AI models available for {examination.modality} - {examination.bodyPart}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Additional models may be available for other imaging types
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {analysisResults.length > 0 ? (
            analysisResults.map(result => (
              <Card key={result.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Target className="w-5 h-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg">{result.modelName}</CardTitle>
                        <p className="text-sm text-gray-600">
                          Analysis completed in {result.processingTime}s
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {Math.round(result.confidence * 100)}% confidence
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {result.findings.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                        AI Findings ({result.findings.length})
                      </h4>
                      
                      {result.findings.map((finding, index) => (
                        <div
                          key={finding.id}
                          className={`p-3 rounded-lg border-l-4 ${
                            finding.severity === 'critical' ? 'border-red-500 bg-red-50' :
                            finding.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                            finding.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                            'border-blue-500 bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {finding.description}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {finding.clinicalSignificance}
                              </p>
                              {finding.measurements && (
                                <div className="text-xs text-gray-500 mt-2 space-x-3">
                                  {finding.measurements.volume && (
                                    <span>Volume: {finding.measurements.volume}cm³</span>
                                  )}
                                  {finding.measurements.diameter && (
                                    <span>Diameter: {finding.measurements.diameter}cm</span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <Badge 
                                variant={
                                  finding.severity === 'critical' ? 'destructive' :
                                  finding.severity === 'high' ? 'destructive' :
                                  'secondary'
                                }
                                className="mb-1"
                              >
                                {finding.severity}
                              </Badge>
                              <p className="text-xs text-gray-500">
                                {Math.round(finding.confidence * 100)}% confident
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-green-700 font-medium">No significant abnormalities detected</p>
                      <p className="text-sm text-gray-600 mt-1">
                        AI analysis suggests normal findings
                      </p>
                    </div>
                  )}
                  
                  {result.recommendations.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">AI Recommendations:</h4>
                      <ul className="text-sm space-y-1">
                        {result.recommendations.map((rec, index) => (
                          <li key={index} className="text-blue-700">
                            • {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-600">
                  No AI analysis results yet
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Select AI models and run analysis to see results
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Clinical Insights & Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {aiModels.length}
                  </div>
                  <div className="text-sm text-gray-600">AI Models Available</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisResults.length}
                  </div>
                  <div className="text-sm text-gray-600">Analyses Completed</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisResults.reduce((sum, result) => sum + result.findings.length, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Findings</div>
                </div>
              </div>
              
              {analysisResults.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Analysis Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Average Confidence:</span>
                      <span className="font-medium">
                        {Math.round(analysisResults.reduce((sum, r) => sum + r.confidence, 0) / analysisResults.length * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Processing Time:</span>
                      <span className="font-medium">
                        {analysisResults.reduce((sum, r) => sum + r.processingTime, 0)}s
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Critical Findings:</span>
                      <span className="font-medium text-red-600">
                        {analysisResults.reduce((sum, r) => 
                          sum + r.findings.filter(f => f.severity === 'critical').length, 0
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}