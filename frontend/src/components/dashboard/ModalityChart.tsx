'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';

interface ModalityChartProps {
  data: Array<{
    modality: string;
    count: number;
  }>;
  isLoading: boolean;
  title: string;
}

const modalityColors: Record<string, string> = {
  'CR': '#3B82F6',    // Blue - Computed Radiography
  'CT': '#EF4444',    // Red - Computed Tomography
  'MR': '#10B981',    // Green - Magnetic Resonance
  'US': '#F59E0B',    // Yellow - Ultrasound
  'MG': '#8B5CF6',    // Purple - Mammography
  'RF': '#F97316',    // Orange - Radiofluoroscopy
  'DX': '#06B6D4',    // Cyan - Digital Radiography
  'NM': '#84CC16',    // Lime - Nuclear Medicine
  'PT': '#EC4899',    // Pink - PET
  'XA': '#6366F1',    // Indigo - X-Ray Angiography
};

const modalityLabels: Record<string, string> = {
  'CR': 'Radiographie numérisée',
  'CT': 'Scanner',
  'MR': 'IRM',
  'US': 'Échographie',
  'MG': 'Mammographie',
  'RF': 'Radioscopie',
  'DX': 'Radiographie',
  'NM': 'Médecine nucléaire',
  'PT': 'TEP',
  'XA': 'Angiographie',
};

export function ModalityChart({ data, isLoading, title }: ModalityChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Chargement...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Aucune donnée disponible</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for chart
  const chartData = data.map(item => ({
    ...item,
    label: modalityLabels[item.modality] || item.modality,
    color: modalityColors[item.modality] || '#6B7280'
  })).sort((a, b) => b.count - a.count);

  const total = data.reduce((sum, item) => sum + item.count, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.count / total) * 100).toFixed(1);
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.label}</p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{data.count}</span> examens ({percentage}%)
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Modalité: {data.modality}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="grid grid-cols-2 gap-1 text-xs mt-4">
        {payload?.slice(0, 8).map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 truncate">
              {entry.payload.modality}: {entry.payload.count}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <div className="text-sm text-gray-500">
          Total: {total} examens
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                stroke="#fff"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom Legend */}
        <CustomLegend payload={chartData} />
        
        {/* Summary stats */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="font-semibold text-gray-900">{chartData.length}</p>
              <p className="text-gray-600">Modalités</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {chartData[0]?.modality || '-'}
              </p>
              <p className="text-gray-600">Plus fréquente</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {chartData[0] ? Math.round((chartData[0].count / total) * 100) : 0}%
              </p>
              <p className="text-gray-600">Part dominante</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}