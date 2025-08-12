'use client';

import { useState } from 'react';
import { Examination } from '@/types';
import { Button } from '@/components/ui/button';
import { ViewerService } from '@/services/viewerService';
import toast from 'react-hot-toast';

interface ActionButtonsProps {
  examination: Examination;
}

export function ActionButtons({ examination }: ActionButtonsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isOpeningViewer, setIsOpeningViewer] = useState(false);

  const openViewer = async () => {
    const viewerStatus = ViewerService.getViewerStatus(examination);
    
    if (!viewerStatus.available) {
      toast.error(viewerStatus.reason || 'Impossible d\'ouvrir le visualiseur');
      return;
    }

    setIsOpeningViewer(true);
    try {
      await ViewerService.openExaminationInViewer(examination);
    } catch (error) {
      // Error handling is done in ViewerService
      console.error('Viewer error:', error);
    } finally {
      setIsOpeningViewer(false);
    }
  };

  const openReport = () => {
    // Check if examination has existing reports
    const hasReports = examination.reports && examination.reports.length > 0;
    
    if (hasReports) {
      // Open existing report for viewing
      const latestReport = examination.reports[examination.reports.length - 1];
      // Use viewer for finalized reports, editor for drafts
      if (latestReport.status === 'FINAL' || latestReport.status === 'AMENDED') {
        window.open(`/reports/${latestReport.id}`, '_blank');
      } else {
        window.open(`/reports/editor?examinationId=${examination.id}&reportId=${latestReport.id}`, '_blank');
      }
    } else {
      // Create new report
      window.open(`/reports/editor?examinationId=${examination.id}`, '_blank');
    }
  };

  const editExamination = () => {
    // Navigate to examination edit page
    window.open(`/examinations/${examination.id}/edit`, '_blank');
  };

  return (
    <div className="flex items-center space-x-1">
      {/* View Images */}
      {(() => {
        const viewerStatus = ViewerService.getViewerStatus(examination);
        
        if (!viewerStatus.available) {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 cursor-not-allowed"
              disabled
              title={viewerStatus.reason || 'Visualiseur non disponible'}
            >
              🖼️
            </Button>
          );
        }
        
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            onClick={openViewer}
            disabled={isOpeningViewer}
            title="Ouvrir le visualiseur DICOM"
          >
            {isOpeningViewer ? (
              <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full" />
            ) : (
              '🖼️'
            )}
          </Button>
        );
      })()}

      {/* Create/View Report */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
        onClick={openReport}
        title={examination.reports?.length > 0 ? "Voir le rapport" : "Créer un rapport"}
      >
        📝
      </Button>

      {/* Edit Examination */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
        onClick={editExamination}
        title="Modifier l'examen"
      >
        ✏️
      </Button>

      {/* More actions dropdown */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-600 hover:text-gray-800"
          onClick={() => setShowMenu(!showMenu)}
          title="Plus d'actions"
        >
          ⋮
        </Button>

        {showMenu && (
          <div className="absolute right-0 mt-1 bg-white border rounded shadow-lg z-50 min-w-[150px]">
            <button
              className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100"
              onClick={() => {
                console.log('Duplicate exam:', examination.id);
                setShowMenu(false);
              }}
            >
              📋 Dupliquer
            </button>
            
            <button
              className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100"
              onClick={() => {
                console.log('Change priority:', examination.id);
                setShowMenu(false);
              }}
            >
              ⚡ Changer priorité
            </button>
            
            <button
              className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100"
              onClick={() => {
                console.log('Assign radiologist:', examination.id);
                setShowMenu(false);
              }}
            >
              👨‍⚕️ Assigner
            </button>
            
            <button
              className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100"
              onClick={() => {
                console.log('Add comment:', examination.id);
                setShowMenu(false);
              }}
            >
              💬 Commentaire
            </button>
            
            <hr className="my-1" />
            
            <button
              className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
              onClick={() => {
                if (confirm('Êtes-vous sûr de vouloir annuler cet examen ?')) {
                  console.log('Cancel exam:', examination.id);
                }
                setShowMenu(false);
              }}
            >
              🚫 Annuler
            </button>
          </div>
        )}

        {/* Overlay to close menu */}
        {showMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
        )}
      </div>
    </div>
  );
}