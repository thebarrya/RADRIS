'use client';

import { useState } from 'react';
import { Examination } from '@/types';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  examination: Examination;
}

export function ActionButtons({ examination }: ActionButtonsProps) {
  const [showMenu, setShowMenu] = useState(false);

  const openViewer = () => {
    if (examination.studyInstanceUID) {
      // Open OHIF viewer in new tab
      window.open(`http://localhost:3005/viewer/${examination.studyInstanceUID}`, '_blank');
    } else {
      alert('Aucune image disponible pour cet examen');
    }
  };

  const openReport = () => {
    // Navigate to report page
    window.open(`/reports/${examination.id}`, '_blank');
  };

  const editExamination = () => {
    // Navigate to examination edit page
    window.open(`/examinations/${examination.id}/edit`, '_blank');
  };

  return (
    <div className="flex items-center space-x-1">
      {/* View Images */}
      {examination.imagesAvailable && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
          onClick={openViewer}
          title="Ouvrir le visualiseur"
        >
          🖼️
        </Button>
      )}

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