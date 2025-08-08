'use client';

import { Button } from '@/components/ui/button';

interface PatientFiltersProps {
  onFilter: (filters: any) => void;
}

export function PatientFilters({ onFilter }: PatientFiltersProps) {
  const handleQuickFilter = (filterType: string, value?: any) => {
    switch (filterType) {
      case 'all':
        onFilter({});
        break;
      case 'recent':
        // Patients créés dans les 30 derniers jours
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        onFilter({ createdAfter: thirtyDaysAgo.toISOString() });
        break;
      case 'with-warnings':
        onFilter({ hasWarnings: true });
        break;
      case 'male':
        onFilter({ gender: 'M' });
        break;
      case 'female':
        onFilter({ gender: 'F' });
        break;
      case 'recent-exams':
        // Patients avec examens récents
        onFilter({ hasRecentExams: true });
        break;
    }
  };

  return (
    <div className="flex items-center space-x-2 flex-wrap gap-2">
      <span className="text-sm font-medium text-gray-700">Filtres rapides:</span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleQuickFilter('all')}
        className="h-8"
      >
        Tous
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleQuickFilter('recent')}
        className="h-8"
      >
        📅 Récents
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleQuickFilter('with-warnings')}
        className="h-8"
      >
        ⚠️ Avec alertes
      </Button>
      
      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter('male')}
          className="h-8"
        >
          👨 Hommes
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter('female')}
          className="h-8"
        >
          👩 Femmes
        </Button>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleQuickFilter('recent-exams')}
        className="h-8"
      >
        🔬 Examens récents
      </Button>
    </div>
  );
}