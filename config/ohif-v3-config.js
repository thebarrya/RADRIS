window.config = {
  routerBasename: '/',
  showStudyList: true,
  
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'RADRIS PACS',
        name: 'orthanc',
        
        // URLs DICOMweb optimisées pour Orthanc
        qidoRoot: 'http://localhost:8042/dicom-web',
        wadoRoot: 'http://localhost:8042/dicom-web',
        wadoUriRoot: 'http://localhost:8042/wado',
        
        // Optimisations performance OHIF v3
        qidoSupportsIncludeField: true,
        supportsInstanceMetadata: true,
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: true,
        supportsWildcard: true,
        
        // Configuration rendu optimisée
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        omitQuotationForMultipartRequest: true,
        enableStudyProgressiveLoading: true,
        
        // Headers de requête optimisés
        requestOptions: {
          requestCredentials: 'omit',
          headers: {
            'Accept': 'application/dicom+json',
            'Content-Type': 'application/dicom+json',
            'Cache-Control': 'no-cache'
          }
        }
      }
    }
  ],

  defaultDataSourceName: 'dicomweb',
  
  // Configuration performance OHIF v3
  maxConcurrentMetadataRequests: 15,
  maxNumberOfWebWorkers: 4,
  experimentalStudyBrowserSort: true,
  showLoadingIndicator: true,
  
  // Extensions OHIF v3.11.0
  extensions: [
    '@ohif/extension-default',
    '@ohif/extension-cornerstone',
    '@ohif/extension-measurement-tracking',
    '@ohif/extension-cornerstone-dicom-sr',
    '@ohif/extension-dicom-pdf',
    '@ohif/extension-dicom-video'
  ],
  
  modes: [
    '@ohif/mode-longitudinal',
    '@ohif/mode-basic-viewer'
  ],
  
  // Configuration des raccourcis clavier améliorés
  hotkeys: [
    {
      commandName: 'incrementActiveViewport',
      label: 'Next Viewport',
      keys: ['right', 'ArrowRight'],
    },
    {
      commandName: 'decrementActiveViewport', 
      label: 'Previous Viewport',
      keys: ['left', 'ArrowLeft'],
    },
    { commandName: 'rotateViewportCW', label: 'Rotate Right', keys: ['r', 'R'] },
    { commandName: 'rotateViewportCCW', label: 'Rotate Left', keys: ['l', 'L'] },
    { commandName: 'invertViewport', label: 'Invert', keys: ['i', 'I'] },
    { commandName: 'flipViewportVertical', label: 'Flip Horizontally', keys: ['h', 'H'] },
    { commandName: 'flipViewportHorizontal', label: 'Flip Vertically', keys: ['v', 'V'] },
    { commandName: 'scaleUpViewport', label: 'Zoom In', keys: ['+', '='] },
    { commandName: 'scaleDownViewport', label: 'Zoom Out', keys: ['-', '_'] },
    { commandName: 'fitViewportToWindow', label: 'Zoom to Fit', keys: ['0'] },
    { commandName: 'resetViewport', label: 'Reset', keys: ['space'] },
    { commandName: 'nextImage', label: 'Next Image', keys: ['down', 'ArrowDown'] },
    { commandName: 'previousImage', label: 'Previous Image', keys: ['up', 'ArrowUp'] },
    // Nouveaux raccourcis OHIF v3
    { commandName: 'windowLevelPreset1', label: 'W/L Preset 1', keys: ['1'] },
    { commandName: 'windowLevelPreset2', label: 'W/L Preset 2', keys: ['2'] },
    { commandName: 'windowLevelPreset3', label: 'W/L Preset 3', keys: ['3'] },
    { commandName: 'toggleCine', label: 'Toggle Cine', keys: ['c', 'C'] },
    { commandName: 'toggleOverlay', label: 'Toggle Overlay', keys: ['o', 'O'] }
  ],

  // Configuration UI OHIF v3
  whiteLabeling: {
    createLogoComponentFn: function(React) {
      return React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#0944b8'
        }
      }, '🏥 RADRIS');
    }
  },

  // Paramètres d'affichage
  defaultViewport: {
    voi: {
      windowWidth: 400,
      windowCenter: 40
    }
  },

  // Configuration des mesures et annotations
  measurementTools: [
    'Length',
    'Bidirectional',
    'EllipticalRoi',
    'CircularRoi',
    'RectangleRoi',
    'Angle',
    'FreehandRoi'
  ]
};