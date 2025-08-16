'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PerformanceMetrics {
  renderCount: number;
  lastRender: number;
  avgRenderTime: number;
  refreshCount: number;
  lastRefresh: number;
  refreshFrequency: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  onRefresh?: () => void;
  enabled?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  componentName,
  onRefresh,
  enabled = process.env.NODE_ENV === 'development'
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRender: Date.now(),
    avgRenderTime: 0,
    refreshCount: 0,
    lastRefresh: 0,
    refreshFrequency: 0
  });

  const [renderTimes, setRenderTimes] = useState<number[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const renderStart = performance.now();
    
    setMetrics(prev => {
      const now = Date.now();
      const renderTime = performance.now() - renderStart;
      
      setRenderTimes(times => {
        const newTimes = [...times, renderTime].slice(-10); // Keep last 10 renders
        return newTimes;
      });

      return {
        ...prev,
        renderCount: prev.renderCount + 1,
        lastRender: now,
        avgRenderTime: renderTimes.length > 0 
          ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length 
          : renderTime
      };
    });
  });

  // Track refresh events
  useEffect(() => {
    if (!enabled || !onRefresh) return;

    const originalRefresh = onRefresh;
    const trackedRefresh = () => {
      setMetrics(prev => {
        const now = Date.now();
        const timeSinceLastRefresh = now - prev.lastRefresh;
        
        return {
          ...prev,
          refreshCount: prev.refreshCount + 1,
          lastRefresh: now,
          refreshFrequency: timeSinceLastRefresh > 0 ? timeSinceLastRefresh : prev.refreshFrequency
        };
      });
      
      return originalRefresh();
    };

    // Replace the original refresh function (this is a simple approach for monitoring)
    // In a real implementation, you might want to use a more sophisticated tracking method
  }, [onRefresh, enabled]);

  // Calculate refresh frequency warning
  const isRefreshingTooFrequently = metrics.refreshFrequency > 0 && metrics.refreshFrequency < 5000; // Less than 5 seconds
  const hasExcessiveRenders = metrics.renderCount > 50; // More than 50 renders

  if (!enabled) return null;

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-yellow-800">
          Performance Monitor: {componentName}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="space-y-1">
            <div className="text-gray-600">Renders</div>
            <div className="font-mono">
              {metrics.renderCount}
              {hasExcessiveRenders && (
                <Badge variant="destructive" className="ml-1 text-xs">High</Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-gray-600">Avg Render Time</div>
            <div className="font-mono">
              {metrics.avgRenderTime.toFixed(2)}ms
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-gray-600">Refreshes</div>
            <div className="font-mono">
              {metrics.refreshCount}
              {isRefreshingTooFrequently && (
                <Badge variant="destructive" className="ml-1 text-xs">Fast</Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-gray-600">Refresh Freq</div>
            <div className="font-mono">
              {metrics.refreshFrequency > 0 
                ? `${(metrics.refreshFrequency / 1000).toFixed(1)}s`
                : 'N/A'
              }
            </div>
          </div>
        </div>
        
        {(isRefreshingTooFrequently || hasExcessiveRenders) && (
          <div className="mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
            ⚠️ Performance Issue Detected:
            {isRefreshingTooFrequently && <div>• Refreshing too frequently (&lt; 5s intervals)</div>}
            {hasExcessiveRenders && <div>• Excessive re-renders detected</div>}
          </div>
        )}
        
        <div className="mt-2 text-xs text-gray-500">
          Last Render: {new Date(metrics.lastRender).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};