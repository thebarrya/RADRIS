'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { examinationsApi } from '@/lib/api';

interface Stats {
  todayExams: number;
  pendingReports: number;
  avgReportingTime: number;
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
}

export function WorklistStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await examinationsApi.getStats();
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white border-b px-6 py-2">
        <div className="flex space-x-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="w-12 h-8 bg-gray-200 rounded"></div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white border-b px-6 py-2">
      <div className="flex items-center space-x-6 text-sm">
        {/* Today's exams */}
        <div className="flex items-center space-x-2">
          <div className="bg-blue-100 px-3 py-1 rounded font-mono text-blue-800">
            {stats.todayExams}
          </div>
          <span className="text-gray-600">Examens du jour</span>
        </div>

        {/* Pending reports */}
        <div className="flex items-center space-x-2">
          <div className="bg-orange-100 px-3 py-1 rounded font-mono text-orange-800">
            {stats.pendingReports}
          </div>
          <span className="text-gray-600">CR en attente</span>
        </div>

        {/* Average reporting time */}
        <div className="flex items-center space-x-2">
          <div className="bg-green-100 px-3 py-1 rounded font-mono text-green-800">
            {Math.round(stats.avgReportingTime)}h
          </div>
          <span className="text-gray-600">Délai moyen CR</span>
        </div>

        {/* Status breakdown */}
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">Répartition:</span>
          <div className="flex space-x-1">
            {stats.statusDistribution.map(item => (
              <div key={item.status} className="flex items-center space-x-1">
                <div className={`w-3 h-3 rounded ${getStatusColor(item.status)}`}></div>
                <span className="text-xs text-gray-500">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="ml-auto text-xs text-gray-400">
          ⟳ Auto-refresh 30s
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors = {
    'SCHEDULED': 'bg-blue-400',
    'IN_PROGRESS': 'bg-orange-400',
    'ACQUIRED': 'bg-green-400',
    'REPORTING': 'bg-purple-400',
    'VALIDATED': 'bg-emerald-500',
    'EMERGENCY': 'bg-red-500',
    'CANCELLED': 'bg-gray-400',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-400';
}