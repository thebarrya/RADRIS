// Configuration Cornerstone.js simplifiée pour Next.js
let isInitialized = false;

export async function initializeCornerstoneSimple() {
  if (isInitialized || typeof window === 'undefined') return;

  try {
    // Dynamic imports pour éviter les erreurs SSR
    const [
      { init: cornerstoneInit },
      { init: cornerstoneToolsInit },
      dicomImageLoaderModule
    ] = await Promise.all([
      import('@cornerstonejs/core'),
      import('@cornerstonejs/tools'),
      import('@cornerstonejs/dicom-image-loader')
    ]);

    // Initialize Cornerstone Core
    await cornerstoneInit();
    
    // Initialize Cornerstone Tools
    cornerstoneToolsInit();

    // DICOM Image Loader is automatically configured in v3.x
    // No manual configuration needed

    isInitialized = true;
    console.log('✅ Cornerstone.js initialized successfully (simple mode)');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Cornerstone.js:', error);
    throw new Error(`Cornerstone initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function pour créer des IDs d'image WADO-RS
export function getWADORSImageId(
  studyInstanceUID: string,
  seriesInstanceUID: string,
  sopInstanceUID: string,
  frame = 0
): string {
  const wadoRsRoot = process.env.NEXT_PUBLIC_ORTHANC_URL || 'http://localhost:8042';
  const baseUrl = `${wadoRsRoot}/dicom-web`;
  
  return `wadors:${baseUrl}/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances/${sopInstanceUID}/frames/${frame + 1}`;
}

// Configuration par défaut du viewport
export const DEFAULT_VIEWPORT_CONFIG = {
  voi: {
    windowWidth: 400,
    windowCenter: 40,
  },
  invert: false,
  pixelReplication: false,
  rotation: 0,
  hflip: false,
  vflip: false,
  interpolationType: 'LINEAR',
  colormap: '',
};

// Outils disponibles
export const AVAILABLE_TOOLS = {
  Pan: 'Pan',
  Zoom: 'Zoom',
  WindowLevel: 'WindowLevel',
  StackScrollMouseWheel: 'StackScrollMouseWheel',
  Length: 'Length',
  Angle: 'Angle',
  RectangleROI: 'RectangleROI',
  EllipticalROI: 'EllipticalROI',
} as const;

export type ToolName = typeof AVAILABLE_TOOLS[keyof typeof AVAILABLE_TOOLS];