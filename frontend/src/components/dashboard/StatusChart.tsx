'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';

interface StatusChartProps {
  data: Array<{
    status: string;
    count: number;
  }>;
  isLoading: boolean;
  title: string;
}

const statusColors: Record<string, string> = {
  'SCHEDULED': '#3B82F6',    // Blue
  'IN_PROGRESS': '#F59E0B',  // Yellow
  'ACQUIRED': '#10B981',     // Green
  'REPORTING': '#EF4444',    // Red
  'VALIDATED': '#8B5CF6',    // Purple
  'CANCELLED': '#6B7280',    // Gray
  'EMERGENCY': '#DC2626',    // Dark Red
};

const statusLabels: Record<string, string> = {
  'SCHEDULED': 'Programmé',
  'IN_PROGRESS': 'En cours',
  'ACQUIRED': 'Acquis',
  'REPORTING': 'À reporter',
  'VALIDATED': 'Validé',
  'CANCELLED': 'Annulé',
  'EMERGENCY': 'Urgence',
};

export function StatusChart({ data, isLoading, title }: StatusChartProps) {
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
    label: statusLabels[item.status] || item.status,
    color: statusColors[item.status] || '#6B7280'
  })).sort((a, b) => b.count - a.count);

  const total = data.reduce((sum, item) => sum + item.count, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.count / total) * 100).toFixed(1);
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.label}</p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{data.count}</span> examens ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
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
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                radius={[4, 4, 0, 0]}
                stroke="#fff"
                strokeWidth={1}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {chartData.slice(0, 6).map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600">
                {item.label}: {item.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}