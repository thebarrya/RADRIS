import { init as cornerstoneInit } from '@cornerstonejs/core';
import { init as cornerstoneToolsInit } from '@cornerstonejs/tools';

// Configuration Cornerstone.js pour Next.js 14
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Store the enums once they're loaded
export let ViewportType: any = null;
export let Enums: any = null;

export async function initializeCornerstone() {
  // Return existing promise if already initializing
  if (initializationPromise) {
    return initializationPromise;
  }

  if (isInitialized || typeof window === 'undefined') {
    return Promise.resolve();
  }

  initializationPromise = (async () => {
    try {
      console.log('Initializing Cornerstone.js...');
      
      // Initialize Cornerstone Core first
      await cornerstoneInit();
      console.log('Cornerstone core initialized');
      
      // Import all required modules
      const [cornerstoneCore] = await Promise.all([
        import('@cornerstonejs/core')
      ]);
      
      // Extract enums with multiple fallback methods
      try {
        // Method 1: Direct enum access
        if (cornerstoneCore.enums?.ViewportType) {
          ViewportType = cornerstoneCore.enums.ViewportType;
          Enums = cornerstoneCore.enums;
          console.log('ViewportType loaded via enums:', ViewportType);
        }
        // Method 2: Try VIEWPORT_TYPE constant (commented out due to TS errors)
        // else if (cornerstoneCore.VIEWPORT_TYPE) {
        //   ViewportType = cornerstoneCore.VIEWPORT_TYPE;
        //   console.log('ViewportType loaded via VIEWPORT_TYPE:', ViewportType);
        // }
        // Method 3: Manual enum definition as fallback
        else {
          console.warn('ViewportType not found in enums, creating fallback');
          ViewportType = {
            ORTHOGONAL: 'orthogonal',
            OBLIQUE: 'oblique',
            STACK: 'stack',
            VOLUME_3D: 'volume3d'
          };
          console.log('ViewportType created as fallback:', ViewportType);
        }
      } catch (enumError) {
        console.error('Failed to access ViewportType enum:', enumError);
        // Create manual fallback
        ViewportType = {
          ORTHOGONAL: 'orthogonal',
          OBLIQUE: 'oblique', 
          STACK: 'stack',
          VOLUME_3D: 'volume3d'
        };
        console.log('ViewportType created after enum error:', ViewportType);
      }
      
      // Verify ViewportType is properly set
      if (!ViewportType || !ViewportType.STACK) {
        throw new Error('ViewportType.STACK not available after initialization');
      }
      
      // Initialize Cornerstone Tools
      await cornerstoneToolsInit();
      console.log('Cornerstone tools initialized');

      // Initialize DICOM Image Loader (Cornerstone3D 2.x API)
      const { init: dicomImageLoaderInit } = await import('@cornerstonejs/dicom-image-loader');
      const loaderConfig = {
        maxWebWorkers: navigator.hardwareConcurrency || 1,
        strict: false,
      };
      
      // Initialize DICOM Image Loader with proper API
      await dicomImageLoaderInit(loaderConfig);
      console.log('DICOM image loader initialized');

      isInitialized = true;
      console.log('Cornerstone.js initialized successfully with ViewportType:', ViewportType);
    } catch (error) {
      console.error('Failed to initialize Cornerstone.js:', error);
      isInitialized = false;
      initializationPromise = null;
      ViewportType = null;
      Enums = null;
      throw error;
    }
  })();

  return initializationPromise;
}

// Helper function to get WADO-RS image URL
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

// Helper function to get WADO-URI image URL for Orthanc
export function getOrthancImageId(
  studyInstanceUID: string,
  seriesInstanceUID: string,
  sopInstanceUID: string
): string {
  const orthancRoot = process.env.NEXT_PUBLIC_ORTHANC_URL || 'http://localhost:8042';
  return `wadouri:${orthancRoot}/instances/${sopInstanceUID}/file`;
}

// Helper function to create viewport configuration
export function createViewportInput(
  element: HTMLElement,
  viewportId: string,
  type: 'stack' | 'volume' = 'stack'
) {
  if (!ViewportType) {
    throw new Error('ViewportType not initialized. Call initializeCornerstone first.');
  }
  
  // Use the appropriate viewport type
  const viewportType = type === 'stack' ? ViewportType.STACK : ViewportType.ORTHOGONAL;
  
  return {
    viewportId,
    element,
    type: viewportType,
  };
}

// Enhanced study loading with series information
export interface SeriesInfo {
  seriesInstanceUID: string;
  seriesNumber: string;
  seriesDescription: string;
  numberOfImages: number;
  modality: string;
  imageIds: string[];
}

export interface StudyInfo {
  studyInstanceUID: string;
  series: SeriesInfo[];
  totalImages: number;
}

// Function to load complete study with series information
export async function loadStudyWithSeries(studyInstanceUID: string): Promise<StudyInfo> {
  try {
    const corsProxyUrl = process.env.NEXT_PUBLIC_ORTHANC_CORS_PROXY_URL || 'http://localhost:8043';
    
    console.log(`Loading complete study: ${studyInstanceUID} with series information`);
    
    // Get series via DICOMweb QIDO-RS
    const seriesResponse = await fetch(`${corsProxyUrl}/dicom-web/studies/${studyInstanceUID}/series`);
    if (!seriesResponse.ok) {
      throw new Error(`Failed to fetch series: ${seriesResponse.status} ${seriesResponse.statusText}`);
    }
    
    const seriesData = await seriesResponse.json();
    console.log(`Found ${seriesData.length} series in study`);
    
    const series: SeriesInfo[] = [];
    let totalImages = 0;
    
    // Process each series
    for (const seriesMetadata of seriesData) {
      const seriesInstanceUID = seriesMetadata['0020000E']?.Value?.[0];
      const seriesNumber = seriesMetadata['00200011']?.Value?.[0] || '1';
      const seriesDescription = seriesMetadata['0008103E']?.Value?.[0] || 'No Description';
      const modality = seriesMetadata['00080060']?.Value?.[0] || 'Unknown';
      
      if (!seriesInstanceUID) continue;
      
      // Get instances for this series
      const instancesResponse = await fetch(`${corsProxyUrl}/dicom-web/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances`);
      if (!instancesResponse.ok) continue;
      
      const instancesData = await instancesResponse.json();
      const numberOfImages = instancesData.length;
      
      // Create image IDs for this series
      const imageIds: string[] = [];
      instancesData.forEach((instance: any) => {
        const instanceUID = instance['00080018']?.Value?.[0];
        if (instanceUID) {
          const imageId = `wadouri:${corsProxyUrl}/dicom-web/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances/${instanceUID}`;
          imageIds.push(imageId);
        }
      });
      
      series.push({
        seriesInstanceUID,
        seriesNumber,
        seriesDescription,
        numberOfImages,
        modality,
        imageIds
      });
      
      totalImages += numberOfImages;
      console.log(`Series ${seriesNumber}: ${seriesDescription} (${numberOfImages} images)`);
    }
    
    // Sort series by series number
    series.sort((a, b) => parseInt(a.seriesNumber) - parseInt(b.seriesNumber));
    
    return {
      studyInstanceUID,
      series,
      totalImages
    };
    
  } catch (error) {
    console.error('Failed to load study with series:', error);
    throw error;
  }
}

// Function to load study images directly from Orthanc (avoiding CORS issues)
export async function loadStudyImages(studyInstanceUID: string): Promise<string[]> {
  try {
    const corsProxyUrl = process.env.NEXT_PUBLIC_ORTHANC_CORS_PROXY_URL || 'http://localhost:8043';
    const orthancUrl = process.env.NEXT_PUBLIC_ORTHANC_URL || 'http://localhost:8042';
    
    console.log(`Loading images for study: ${studyInstanceUID} via CORS proxy: ${corsProxyUrl}`);
    
    // First, try to get study metadata via DICOMweb QIDO-RS
    let studyMetadata = null;
    try {
      const studyResponse = await fetch(`${corsProxyUrl}/dicom-web/studies/${studyInstanceUID}/metadata`);
      if (studyResponse.ok) {
        studyMetadata = await studyResponse.json();
        console.log(`Found study metadata via DICOMweb: ${studyMetadata.length} instances`);
      }
    } catch (err) {
      console.warn('DICOMweb metadata not available, falling back to Orthanc REST API');
    }

    let imageIds: string[] = [];

    // Method 1: Use DICOMweb metadata if available
    if (studyMetadata && studyMetadata.length > 0) {
      console.log('Using DICOMweb WADO-RS for image loading');
      
      // Extract unique series from metadata
      const seriesSet = new Set<string>();
      studyMetadata.forEach((instance: any) => {
        const seriesUID = instance['0020000E']?.Value?.[0];
        if (seriesUID) seriesSet.add(seriesUID);
      });

      // Create WADO-RS image IDs for each instance
      studyMetadata.forEach((instance: any) => {
        const seriesUID = instance['0020000E']?.Value?.[0]; // SeriesInstanceUID
        const instanceUID = instance['00080018']?.Value?.[0]; // SOPInstanceUID
        
        if (seriesUID && instanceUID) {
          // Use WADO-RS URL for better compatibility
          const imageId = `wadouri:${corsProxyUrl}/dicom-web/studies/${studyInstanceUID}/series/${seriesUID}/instances/${instanceUID}`;
          imageIds.push(imageId);
        }
      });

      console.log(`Created ${imageIds.length} WADO-RS image IDs`);
    }
    
    // Method 2: Fallback to Orthanc REST API if DICOMweb fails
    if (imageIds.length === 0) {
      console.log('Falling back to Orthanc REST API with CORS proxy');
      
      // Get all studies from Orthanc to find the matching one
      const studiesResponse = await fetch(`${orthancUrl}/studies`);
      if (!studiesResponse.ok) {
        throw new Error(`Failed to fetch studies: ${studiesResponse.status} ${studiesResponse.statusText}`);
      }
      
      const studyIds = await studiesResponse.json();
      let orthancStudyId = null;
      
      // Find the Orthanc study ID that matches our StudyInstanceUID
      for (const id of studyIds) {
        try {
          const studyResponse = await fetch(`${orthancUrl}/studies/${id}`);
          if (studyResponse.ok) {
            const studyData = await studyResponse.json();
            if (studyData.MainDicomTags?.StudyInstanceUID === studyInstanceUID) {
              orthancStudyId = id;
              console.log(`Found Orthanc study ID: ${orthancStudyId} for ${studyInstanceUID}`);
              break;
            }
          }
        } catch (err) {
          // Continue to next study if this one fails
          console.warn(`Failed to fetch study ${id}:`, err);
          continue;
        }
      }
      
      if (!orthancStudyId) {
        throw new Error(`Study ${studyInstanceUID} not found in Orthanc PACS`);
      }
      
      // Get all series in the study
      const seriesResponse = await fetch(`${orthancUrl}/studies/${orthancStudyId}/series`);
      if (!seriesResponse.ok) {
        throw new Error(`Failed to fetch series: ${seriesResponse.status} ${seriesResponse.statusText}`);
      }
      
      const seriesData = await seriesResponse.json();
      
      console.log(`Found ${seriesData.length} series in study`);
      
      // Get all instances from all series
      for (const seriesId of seriesData) {
        try {
          // Get instances for each series
          const instancesResponse = await fetch(`${orthancUrl}/series/${seriesId}/instances`);
          if (instancesResponse.ok) {
            const instances = await instancesResponse.json();
            
            // Create WADO-URI image IDs using CORS proxy for each instance
            for (const instanceId of instances) {
              const imageId = `wadouri:${corsProxyUrl}/instances/${instanceId}/file`;
              imageIds.push(imageId);
            }
            console.log(`Added ${instances.length} instances from series ${seriesId}`);
          }
        } catch (err) {
          console.warn(`Failed to fetch instances for series ${seriesId}:`, err);
          continue;
        }
      }
    }
    
    if (imageIds.length === 0) {
      throw new Error('No images found in study');
    }
    
    console.log(`Successfully loaded ${imageIds.length} images for study ${studyInstanceUID}`);
    return imageIds;
    
  } catch (error) {
    console.error('Failed to load study images:', error);
    throw error;
  }
}

// Default viewport settings
export const DEFAULT_VIEWPORT_SETTINGS = {
  voi: {
    windowWidth: 400,
    windowCenter: 40,
  },
  invert: false,
  pixelReplication: false,
  rotation: 0,
  hflip: false,
  vflip: false,
  interpolationType: 'LINEAR' as const,
  colormap: undefined,
};

// Tool names constants
export const TOOL_NAMES = {
  Pan: 'Pan',
  Zoom: 'Zoom',
  WindowLevel: 'WindowLevel',
  StackScrollMouseWheel: 'StackScrollMouseWheel',
  Length: 'Length',
  Angle: 'Angle',
  RectangleROI: 'RectangleROI',
  EllipticalROI: 'EllipticalROI',
} as const;

export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];

// Utility function to check if Cornerstone is initialized
export function isCornerstoneInitialized(): boolean {
  return isInitialized;
}

// Utility function to check if ViewportType is available
export function isViewportTypeAvailable(): boolean {
  return ViewportType !== null && ViewportType.STACK !== undefined;
}

// Get ViewportType with validation
export function getViewportType() {
  if (!ViewportType) {
    throw new Error('ViewportType not available. Ensure Cornerstone is fully initialized.');
  }
  return ViewportType;
}

// Wait for initialization to complete
export async function waitForInitialization(): Promise<void> {
  if (initializationPromise) {
    await initializationPromise;
  }
  if (!isInitialized) {
    throw new Error('Cornerstone initialization failed');
  }
}

// Reset initialization state (useful for testing)
export function resetCornerstoneInitialization(): void {
  isInitialized = false;
  initializationPromise = null;
  ViewportType = null;
  Enums = null;
}