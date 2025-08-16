window.config = {
  routerBasename: '/',
  
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'RADRIS PACS',
        name: 'orthanc',
        wadoUriRoot: 'http://localhost:8043/wado',
        qidoRoot: 'http://localhost:8043/dicom-web',
        wadoRoot: 'http://localhost:8043/dicom-web',
        qidoSupportsIncludeField: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: false,
        staticWado: true,
        singlepart: 'bulkdata,video,pdf',
        // Add timeout settings
        requestOptions: {
          requestCredentials: 'omit',
          timeout: 30000,
          headers: {
            'Accept': 'application/dicom+json',
            'Content-Type': 'application/dicom+json'
          }
        },
        // Add bulk data settings
        bulkDataURI: {
          enabled: true,
          relativeResolution: 'studies'
        }
      },
    },
  ],
  
  defaultDataSourceName: 'dicomweb',
  showStudyList: true,
  
  maxConcurrentMetadataRequests: 10,
  maxNumberOfWebWorkers: 3,
  omitQuotationForMultipartRequest: true,
  
  // Add debugging options
  debugMode: true,
  showLoadingIndicator: true,
  
  // Improve error handling
  allowErrorRecovery: true,
  strictMode: false,
  
  hotkeys: [
    {
      commandName: 'incrementActiveViewport',
      label: 'Next Viewport',
      keys: ['right'],
    },
    {
      commandName: 'decrementActiveViewport',
      label: 'Previous Viewport',
      keys: ['left'],
    },
    { commandName: 'rotateViewportCW', label: 'Rotate Right', keys: ['r'] },
    { commandName: 'rotateViewportCCW', label: 'Rotate Left', keys: ['l'] },
    { commandName: 'invertViewport', label: 'Invert', keys: ['i'] },
    { commandName: 'flipViewportVertical', label: 'Flip Horizontally', keys: ['h'] },
    { commandName: 'flipViewportHorizontal', label: 'Flip Vertically', keys: ['v'] },
    { commandName: 'scaleUpViewport', label: 'Zoom In', keys: ['+'] },
    { commandName: 'scaleDownViewport', label: 'Zoom Out', keys: ['-'] },
    { commandName: 'fitViewportToWindow', label: 'Zoom to Fit', keys: ['='] },
    { commandName: 'resetViewport', label: 'Reset', keys: ['space'] },
    { commandName: 'nextImage', label: 'Next Image', keys: ['down'] },
    { commandName: 'previousImage', label: 'Previous Image', keys: ['up'] },
  ],
};