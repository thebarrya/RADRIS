// Types pour Cornerstone.js
declare module '@cornerstonejs/core' {
  export interface IImage {
    imageId: string;
    minPixelValue: number;
    maxPixelValue: number;
    slope: number;
    intercept: number;
    windowCenter: number;
    windowWidth: number;
    getPixelData: () => ArrayBuffer;
    rows: number;
    columns: number;
    color: boolean;
    columnPixelSpacing: number;
    rowPixelSpacing: number;
    sizeInBytes: number;
    preScale?: {
      enabled: boolean;
      scalingParameters?: {
        rescaleSlope: number;
        rescaleIntercept: number;
      };
    };
  }

  export interface IViewport {
    id: string;
    element: HTMLElement;
    renderingEngineId: string;
    type: string;
  }

  export interface Point2 {
    x: number;
    y: number;
  }

  export interface Point3 {
    x: number;
    y: number;
    z: number;
  }

  export class RenderingEngine {
    constructor(id?: string);
    enableElement(viewportInput: {
      viewportId: string;
      element: HTMLElement;
      type: string;
    }): void;
    disableElement(viewportId: string): void;
    getViewport(viewportId: string): IViewport;
    render(): void;
    destroy(): void;
  }

  export const enums: {
    ViewportType: {
      STACK: string;
      ORTHOGRAPHIC: string;
      PERSPECTIVE: string;
    };
    Events: {
      IMAGE_RENDERED: string;
      ELEMENT_ENABLED: string;
      ELEMENT_DISABLED: string;
    };
  };

  export function init(): Promise<void>;
  export function imageLoader(imageId: string): Promise<IImage>;
  export const cache: {
    addImageLoadObject: (imageLoadObject: any) => void;
    removeImageLoadObject: (imageId: string) => void;
  };
}

declare module '@cornerstonejs/tools' {
  export interface Tool {
    configuration: any;
  }

  export class ToolGroupManager {
    static createToolGroup(toolGroupId: string): ToolGroup;
    static getToolGroup(toolGroupId: string): ToolGroup | undefined;
    static destroyToolGroup(toolGroupId: string): void;
  }

  export class ToolGroup {
    addTool(toolName: string, configuration?: any): void;
    setToolActive(toolName: string, options?: any): void;
    setToolPassive(toolName: string): void;
    setToolEnabled(toolName: string): void;
    setToolDisabled(toolName: string): void;
    addViewport(viewportId: string, renderingEngineId: string): void;
  }

  export const PanTool: any;
  export const ZoomTool: any;
  export const WindowLevelTool: any;
  export const StackScrollMouseWheelTool: any;
  export const LengthTool: any;
  export const AngleTool: any;
  export const RectangleROITool: any;
  export const EllipticalROITool: any;

  export function addTool(tool: any): void;
  export function init(): void;

  export const enums: {
    ToolModes: {
      Active: string;
      Passive: string;
      Enabled: string;
      Disabled: string;
    };
  };
}

declare module '@cornerstonejs/dicom-image-loader' {
  export interface InitOptions {
    maxWebWorkers?: number;
    strict?: boolean;
    beforeSend?: (xhr: XMLHttpRequest) => void;
    onloadend?: (event: any, params: any) => void;
    onreadystatechange?: (event: any, params: any) => void;
    onprogress?: (event: any, params: any) => void;
    errorInterceptor?: (error: Error) => void;
    imageCreated?: (imageObject: any) => void;
    decodeConfig?: any;
  }

  export function init(options?: InitOptions): Promise<void>;
  
  export const wadouri: {
    loadImage: (imageId: string, options?: any) => Promise<any>;
  };

  export const wadors: {
    loadImage: (imageId: string, options?: any) => Promise<any>;
  };
}

declare module 'dicom-parser' {
  export function parseDicom(byteArray: Uint8Array): any;
}