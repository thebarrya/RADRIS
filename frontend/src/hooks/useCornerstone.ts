'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  initializeCornerstone, 
  getWADORSImageId,
  getOrthancImageId,
  DEFAULT_VIEWPORT_SETTINGS, 
  ToolName, 
  TOOL_NAMES,
  isCornerstoneInitialized,
  ViewportType,
  loadStudyImages,
  loadStudyWithSeries,
  SeriesInfo,
  StudyInfo,
  isViewportTypeAvailable,
  getViewportType,
  waitForInitialization
} from '@/lib/cornerstone';

interface UseCornerstone {
  isInitialized: boolean;
  error: string | null;
  isLoading: boolean;
  activeTool: ToolName | null;
  viewportSettings: ViewportSettings;
  studyInfo: StudyInfo | null;
  currentSeries: SeriesInfo | null;
  currentSeriesIndex: number;
  setActiveTool: (tool: ToolName) => void;
  updateViewportSettings: (settings: Partial<ViewportSettings>) => void;
  resetViewport: () => void;
  loadStudy: (studyInstanceUID: string) => Promise<void>;
  loadStudyWithSeriesInfo: (studyInstanceUID: string) => Promise<void>;
  switchToSeries: (seriesIndex: number) => Promise<void>;
  enableElement: (element: HTMLElement, viewportId: string) => Promise<void>;
  disableElement: (viewportId: string) => void;
  loadImagesIntoViewport: (viewportId: string, studyInstanceUID: string) => Promise<void>;
  loadSeriesIntoViewport: (viewportId: string, seriesIndex: number) => Promise<void>;
  cleanup: () => void;
}

interface ViewportSettings {
  windowWidth: number;
  windowCenter: number;
  zoom: number;
  rotation: number;
  invert: boolean;
  hflip: boolean;
  vflip: boolean;
  colormap?: string;
}

export function useCornerstone(): UseCornerstone {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolName | null>(TOOL_NAMES.Pan);
  const [studyInfo, setStudyInfo] = useState<StudyInfo | null>(null);
  const [currentSeriesIndex, setCurrentSeriesIndex] = useState(0);
  const [viewportSettings, setViewportSettings] = useState<ViewportSettings>({
    windowWidth: DEFAULT_VIEWPORT_SETTINGS.voi.windowWidth,
    windowCenter: DEFAULT_VIEWPORT_SETTINGS.voi.windowCenter,
    zoom: 1,
    rotation: 0,
    invert: false,
    hflip: false,
    vflip: false,
  });

  // Computed current series
  const currentSeries = studyInfo?.series[currentSeriesIndex] || null;

  // Use refs for Cornerstone objects to avoid re-renders
  const renderingEngineRef = useRef<any>(null);
  const toolGroupRef = useRef<any>(null);
  const viewportsRef = useRef<Map<string, any>>(new Map());
  const initializationPromiseRef = useRef<Promise<void> | null>(null);

  // Initialize Cornerstone
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Avoid multiple initialization attempts
    if (initializationPromiseRef.current) return;

    const initialize = async () => {
      if (isCornerstoneInitialized() && isViewportTypeAvailable()) {
        setIsInitialized(true);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Initialize Cornerstone and wait for completion
        await initializeCornerstone();
        
        // Wait for full initialization including ViewportType
        await waitForInitialization();
        
        // Verify ViewportType is available
        if (!isViewportTypeAvailable()) {
          throw new Error('ViewportType not available after initialization');
        }
        
        console.log('ViewportType confirmed available:', getViewportType());
        
        // Import modules dynamically to avoid SSR issues
        const [cornerstoneCore, cornerstoneTools] = await Promise.all([
          import('@cornerstonejs/core'),
          import('@cornerstonejs/tools')
        ]);

        const { RenderingEngine, enums } = cornerstoneCore;
        const { 
          ToolGroupManager,
          PanTool,
          ZoomTool,
          WindowLevelTool,
          StackScrollMouseWheelTool,
          LengthTool,
          AngleTool,
          RectangleROITool,
          EllipticalROITool,
          addTool,
        } = cornerstoneTools;

        // Verify tools are properly loaded
        if (!ToolGroupManager || !addTool) {
          throw new Error('Failed to load essential Cornerstone tools');
        }

        // Add tools to Cornerstone with proper validation
        const toolsToAdd = [
          { tool: PanTool, name: 'PanTool' },
          { tool: ZoomTool, name: 'ZoomTool' },
          { tool: WindowLevelTool, name: 'WindowLevelTool' },
          { tool: StackScrollMouseWheelTool, name: 'StackScrollMouseWheelTool' },
          { tool: LengthTool, name: 'LengthTool' },
          { tool: AngleTool, name: 'AngleTool' },
          { tool: RectangleROITool, name: 'RectangleROITool' },
          { tool: EllipticalROITool, name: 'EllipticalROITool' },
        ].filter(({ tool }) => tool !== undefined && tool !== null);

        console.log(`Adding ${toolsToAdd.length} tools to Cornerstone`);

        toolsToAdd.forEach(({ tool, name }) => {
          try {
            if (tool && typeof tool === 'function') {
              // Verify the tool class has proper structure before adding
              if (tool.toolName || tool.prototype?.toolName || name) {
                addTool(tool);
                console.log(`Successfully added tool: ${tool.toolName || name}`);
              } else {
                console.warn(`Tool ${name} lacks required toolName property`);
                // Try to add anyway as some tools might work without explicit toolName
                try {
                  addTool(tool);
                  console.log(`Successfully added tool without toolName: ${name}`);
                } catch (fallbackErr) {
                  console.debug(`Failed to add tool ${name}:`, fallbackErr);
                }
              }
            } else {
              console.warn(`Invalid tool encountered: ${name}`, tool);
            }
          } catch (err) {
            // Tool might already be added, continue with other tools
            console.debug(`Tool ${name} already added or failed to add:`, err);
          }
        });

        // Create rendering engine
        const renderingEngineId = `radiologyViewer_${Date.now()}`;
        renderingEngineRef.current = new RenderingEngine(renderingEngineId);

        // Create tool group
        const toolGroupId = `defaultTools_${Date.now()}`;
        
        // Remove existing tool group if exists
        try {
          const existingToolGroup = ToolGroupManager.getToolGroup(toolGroupId);
          if (existingToolGroup) {
            ToolGroupManager.destroyToolGroup(toolGroupId);
          }
        } catch {
          // Tool group doesn't exist, ignore
        }

        toolGroupRef.current = ToolGroupManager.createToolGroup(toolGroupId);

        if (toolGroupRef.current) {
          // Add tools to tool group with better error handling
          const toolNames = Object.values(TOOL_NAMES);
          console.log('Adding tools to tool group:', toolNames);
          
          toolNames.forEach(toolName => {
            try {
              if (toolName && typeof toolName === 'string' && toolName.trim() !== '') {
                toolGroupRef.current.addTool(toolName);
                console.log(`Successfully added tool to group: ${toolName}`);
              } else {
                console.warn('Invalid tool name:', toolName);
              }
            } catch (err) {
              console.debug('Failed to add tool to group:', toolName, err);
              // Continue with other tools even if one fails
            }
          });

          // Set initial tool states with individual error handling
          try {
            // Check if tool group exists before setting tools
            if (!toolGroupRef.current) {
              throw new Error('Tool group not initialized');
            }

            // Set basic navigation tools as active with individual error handling
            const activeTools = [
              { name: TOOL_NAMES.Pan, config: { bindings: [{ mouseButton: 1 }] } },
              { name: TOOL_NAMES.Zoom, config: { bindings: [{ mouseButton: 2 }] } },
              { name: TOOL_NAMES.WindowLevel, config: { bindings: [{ mouseButton: 3 }] } },
              { name: TOOL_NAMES.StackScrollMouseWheel, config: undefined }
            ];

            activeTools.forEach(({ name, config }) => {
              try {
                if (name && typeof name === 'string') {
                  toolGroupRef.current.setToolActive(name, config);
                  console.log(`Successfully activated tool: ${name}`);
                }
              } catch (err) {
                console.debug(`Failed to activate tool ${name}:`, err);
              }
            });
            
            // Set measurement tools as passive
            const passiveTools = [TOOL_NAMES.Length, TOOL_NAMES.Angle, TOOL_NAMES.RectangleROI, TOOL_NAMES.EllipticalROI];
            passiveTools.forEach(tool => {
              try {
                if (tool && typeof tool === 'string') {
                  toolGroupRef.current.setToolPassive(tool);
                  console.log(`Successfully set tool passive: ${tool}`);
                } else {
                  console.warn('Invalid tool name for passive setting:', tool);
                }
              } catch (err) {
                console.debug('Failed to set tool passive:', tool, err);
              }
            });
          } catch (err) {
            console.debug('Failed to configure tools:', err);
          }
        }

        // Final verification that everything is properly initialized
        if (!isViewportTypeAvailable()) {
          throw new Error('Initialization completed but ViewportType is not available');
        }
        
        setIsInitialized(true);
        setError(null);
        console.log('Cornerstone hook initialization completed successfully');
      } catch (err) {
        console.error('Failed to initialize Cornerstone:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize viewer';
        console.error('Detailed error info:', {
          error: err,
          viewportTypeAvailable: isViewportTypeAvailable(),
          cornerstoneInitialized: isCornerstoneInitialized()
        });
        setError(errorMessage);
        setIsInitialized(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializationPromiseRef.current = initialize();

    return () => {
      // Cleanup on unmount
      cleanup();
    };
  }, []);

  const enableElement = useCallback(async (element: HTMLElement, viewportId: string) => {
    if (!isInitialized || !renderingEngineRef.current) {
      throw new Error('Cornerstone not initialized');
    }

    try {
      // Double-check ViewportType availability
      if (!isViewportTypeAvailable()) {
        throw new Error('ViewportType not available. Cornerstone initialization may not be complete.');
      }
      
      const viewportTypeEnum = getViewportType();
      console.log('Enabling viewport with ViewportType.STACK:', viewportTypeEnum.STACK);
      
      const viewportInput = {
        viewportId,
        element,
        type: viewportTypeEnum.STACK, // Use the validated ViewportType
      };

      renderingEngineRef.current.enableElement(viewportInput);
      
      const viewport = renderingEngineRef.current.getViewport(viewportId);
      viewportsRef.current.set(viewportId, viewport);

      // Add viewport to tool group
      if (toolGroupRef.current) {
        const renderingEngineId = renderingEngineRef.current.id;
        toolGroupRef.current.addViewport(viewportId, renderingEngineId);
      }

      console.log('Viewport enabled successfully:', viewportId);

    } catch (err) {
      console.error('Failed to enable element:', err);
      throw err;
    }
  }, [isInitialized]);

  const disableElement = useCallback((viewportId: string) => {
    if (renderingEngineRef.current) {
      try {
        renderingEngineRef.current.disableElement(viewportId);
        viewportsRef.current.delete(viewportId);

        // Remove from tool group
        if (toolGroupRef.current) {
          const renderingEngineId = renderingEngineRef.current.id;
          toolGroupRef.current.removeViewports(renderingEngineId, [viewportId]);
        }
      } catch (err) {
        console.debug('Failed to disable element:', err);
      }
    }
  }, []);

  const changeActiveTool = useCallback((tool: ToolName) => {
    if (!toolGroupRef.current || !tool) {
      console.warn('Tool group not available or invalid tool:', tool);
      return;
    }

    try {
      // Deactivate current active measurement tools
      const measurementTools = [TOOL_NAMES.Length, TOOL_NAMES.Angle, TOOL_NAMES.RectangleROI, TOOL_NAMES.EllipticalROI];
      measurementTools.forEach(t => {
        if (activeTool === t && t && typeof t === 'string') {
          try {
            toolGroupRef.current.setToolPassive(t);
          } catch (err) {
            console.debug(`Failed to deactivate tool ${t}:`, err);
          }
        }
      });

      // Activate new tool
      if (measurementTools.includes(tool as any) && typeof tool === 'string') {
        try {
          toolGroupRef.current.setToolActive(tool, { 
            bindings: [{ mouseButton: 1 }] 
          });
          console.log(`Successfully activated measurement tool: ${tool}`);
        } catch (err) {
          console.debug(`Failed to activate measurement tool ${tool}:`, err);
        }
      }

      setActiveTool(tool);
    } catch (err) {
      console.error('Failed to change tool:', err);
    }
  }, [activeTool]);

  const updateViewportSettings = useCallback((settings: Partial<ViewportSettings>) => {
    setViewportSettings(prev => ({ ...prev, ...settings }));

    // Apply settings to all active viewports
    viewportsRef.current.forEach((viewport) => {
      try {
        const updatedSettings = { ...viewportSettings, ...settings };

        if (settings.windowWidth !== undefined || settings.windowCenter !== undefined) {
          const voi = {
            windowWidth: updatedSettings.windowWidth,
            windowCenter: updatedSettings.windowCenter,
          };
          viewport.setProperties({ voiRange: voi });
        }

        if (settings.zoom !== undefined) {
          viewport.setZoom(settings.zoom);
        }

        if (settings.rotation !== undefined) {
          viewport.setProperties({ rotation: settings.rotation });
        }

        if (settings.invert !== undefined) {
          viewport.setProperties({ invert: settings.invert });
        }

        if (settings.hflip !== undefined || settings.vflip !== undefined) {
          viewport.setProperties({
            flipHorizontal: settings.hflip ?? updatedSettings.hflip,
            flipVertical: settings.vflip ?? updatedSettings.vflip,
          });
        }

        viewport.render();
      } catch (err) {
        console.error('Failed to update viewport settings:', err);
      }
    });
  }, [viewportSettings]);

  const resetViewport = useCallback(() => {
    const defaultSettings = {
      windowWidth: DEFAULT_VIEWPORT_SETTINGS.voi.windowWidth,
      windowCenter: DEFAULT_VIEWPORT_SETTINGS.voi.windowCenter,
      zoom: 1,
      rotation: 0,
      invert: false,
      hflip: false,
      vflip: false,
    };

    updateViewportSettings(defaultSettings);
  }, [updateViewportSettings]);

  // New function to load study with series information
  const loadStudyWithSeriesInfo = useCallback(async (studyInstanceUID: string) => {
    if (!isInitialized) {
      throw new Error('Cornerstone not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(`Loading study with series info: ${studyInstanceUID}`);

      // Load complete study with series information
      const study = await loadStudyWithSeries(studyInstanceUID);
      
      if (study.series.length === 0) {
        throw new Error('No series found in study');
      }

      setStudyInfo(study);
      setCurrentSeriesIndex(0);

      console.log(`Successfully loaded study with ${study.series.length} series and ${study.totalImages} total images`);
      
    } catch (err) {
      console.error('Failed to load study with series info:', err);
      setError(err instanceof Error ? err.message : 'Failed to load study');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // New function to switch to a different series
  const switchToSeries = useCallback(async (seriesIndex: number) => {
    if (!studyInfo || !studyInfo.series[seriesIndex]) {
      throw new Error('Invalid series index');
    }

    try {
      setIsLoading(true);
      setCurrentSeriesIndex(seriesIndex);
      
      const series = studyInfo.series[seriesIndex];
      console.log(`Switching to series ${seriesIndex}: ${series.seriesDescription} (${series.numberOfImages} images)`);
      
    } catch (err) {
      console.error('Failed to switch series:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [studyInfo]);

  // New function to load a specific series into viewport
  const loadSeriesIntoViewport = useCallback(async (viewportId: string, seriesIndex: number) => {
    if (!isInitialized || !renderingEngineRef.current || !studyInfo) {
      throw new Error('Cornerstone not initialized or no study loaded');
    }

    if (!studyInfo.series[seriesIndex]) {
      throw new Error('Invalid series index');
    }

    try {
      setIsLoading(true);
      setError(null);

      const series = studyInfo.series[seriesIndex];
      console.log(`Loading series ${seriesIndex} (${series.seriesDescription}) into viewport ${viewportId}`);

      // Get the viewport
      const viewport = viewportsRef.current.get(viewportId);
      if (!viewport) {
        throw new Error(`Viewport ${viewportId} not found`);
      }

      if (series.imageIds.length === 0) {
        throw new Error('No images found in series');
      }

      console.log(`Loading ${series.imageIds.length} images from series ${series.seriesDescription}`);

      // Set the stack in the viewport
      await viewport.setStack(series.imageIds, 0); // Start with first image

      // Apply default viewport settings
      viewport.setProperties({
        voiRange: {
          windowWidth: DEFAULT_VIEWPORT_SETTINGS.voi.windowWidth,
          windowCenter: DEFAULT_VIEWPORT_SETTINGS.voi.windowCenter,
        },
        invert: DEFAULT_VIEWPORT_SETTINGS.invert,
      });

      // Render the viewport
      viewport.render();

      // Update current series index
      setCurrentSeriesIndex(seriesIndex);

      console.log(`Successfully loaded series ${series.seriesDescription} with ${series.imageIds.length} images into viewport ${viewportId}`);
      
    } catch (err) {
      console.error('Failed to load series into viewport:', err);
      setError(err instanceof Error ? err.message : 'Failed to load series');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, studyInfo]);

  const loadImagesIntoViewport = useCallback(async (viewportId: string, studyInstanceUID: string) => {
    if (!isInitialized || !renderingEngineRef.current) {
      throw new Error('Cornerstone not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(`Loading images for study ${studyInstanceUID} into viewport ${viewportId}`);

      // Get the viewport
      const viewport = viewportsRef.current.get(viewportId);
      if (!viewport) {
        throw new Error(`Viewport ${viewportId} not found`);
      }

      // Load image IDs from Orthanc
      const imageIds = await loadStudyImages(studyInstanceUID);
      
      if (imageIds.length === 0) {
        throw new Error('No images found for study');
      }

      console.log(`Loading ${imageIds.length} images into viewport`);

      // Set the stack in the viewport
      await viewport.setStack(imageIds, 0); // Start with first image

      // Apply default viewport settings
      viewport.setProperties({
        voiRange: {
          windowWidth: DEFAULT_VIEWPORT_SETTINGS.voi.windowWidth,
          windowCenter: DEFAULT_VIEWPORT_SETTINGS.voi.windowCenter,
        },
        invert: DEFAULT_VIEWPORT_SETTINGS.invert,
      });

      // Render the viewport
      viewport.render();

      console.log(`Successfully loaded ${imageIds.length} images into viewport ${viewportId}`);
      
    } catch (err) {
      console.error('Failed to load images into viewport:', err);
      setError(err instanceof Error ? err.message : 'Failed to load images');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const loadStudy = useCallback(async (studyInstanceUID: string) => {
    if (!isInitialized) {
      throw new Error('Cornerstone not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch study metadata from Orthanc
      const orthancUrl = process.env.NEXT_PUBLIC_ORTHANC_URL || 'http://localhost:8042';
      const studyResponse = await fetch(`${orthancUrl}/studies/${studyInstanceUID}`);
      
      if (!studyResponse.ok) {
        throw new Error('Failed to fetch study');
      }

      const studyData = await studyResponse.json();
      console.log('Study loaded:', studyData);

      // TODO: Implement full study loading with series and instances
      // This is a placeholder for now
      
    } catch (err) {
      console.error('Failed to load study:', err);
      setError(err instanceof Error ? err.message : 'Failed to load study');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const cleanup = useCallback(() => {
    try {
      // Clear viewports
      viewportsRef.current.clear();

      // Destroy rendering engine
      if (renderingEngineRef.current) {
        renderingEngineRef.current.destroy();
        renderingEngineRef.current = null;
      }

      // Destroy tool group
      if (toolGroupRef.current) {
        const toolGroupId = toolGroupRef.current.id;
        try {
          import('@cornerstonejs/tools').then(({ ToolGroupManager }) => {
            ToolGroupManager.destroyToolGroup(toolGroupId);
          }).catch(() => {
            // Ignore cleanup errors
          });
        } catch {
          // Ignore cleanup errors
        }
        toolGroupRef.current = null;
      }
    } catch (err) {
      console.debug('Cleanup error:', err);
    }
  }, []);

  return {
    isInitialized,
    error,
    isLoading,
    activeTool,
    viewportSettings,
    studyInfo,
    currentSeries,
    currentSeriesIndex,
    setActiveTool: changeActiveTool,
    updateViewportSettings,
    resetViewport,
    loadStudy,
    loadStudyWithSeriesInfo,
    switchToSeries,
    enableElement,
    disableElement,
    loadImagesIntoViewport,
    loadSeriesIntoViewport,
    cleanup,
  };
}