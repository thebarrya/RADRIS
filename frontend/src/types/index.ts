// Types pour l'application RADRIS

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 
  | 'ADMIN'
  | 'RADIOLOGIST_SENIOR' 
  | 'RADIOLOGIST_JUNIOR'
  | 'TECHNICIAN'
  | 'SECRETARY';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'M' | 'F' | 'OTHER';
  phoneNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  socialSecurity?: string;
  insuranceNumber?: string;
  emergencyContact?: string;
  allergies: string[];
  medicalHistory: string[];
  warnings: string[];
  active: boolean;
  age?: number;
  examinationCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Examination {
  id: string;
  accessionNumber: string;
  scheduledDate: string;
  accessionTime?: string;
  acquisitionTime?: string;
  completedAt?: string;
  status: ExaminationStatus;
  priority: Priority;
  modality: Modality;
  examType: string;
  bodyPart: string;
  procedure: string;
  contrast: boolean;
  clinicalInfo?: string;
  preparation?: string;
  comments: string[];
  studyInstanceUID?: string;
  imagesAvailable: boolean;
  locked: boolean;
  lockReason?: string;
  patient: Patient;
  assignedTo?: User;
  referrer?: User;
  createdBy: User;
  reports: Report[];
  createdAt: string;
  updatedAt: string;
}

export type ExaminationStatus = 
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'ACQUIRED'
  | 'REPORTING'
  | 'VALIDATED'
  | 'CANCELLED'
  | 'EMERGENCY';

export type Priority = 
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'URGENT'
  | 'EMERGENCY';

export type Modality = 
  | 'CR'    // Computed Radiography
  | 'CT'    // Computed Tomography
  | 'MR'    // Magnetic Resonance
  | 'US'    // Ultrasound
  | 'MG'    // Mammography
  | 'RF'    // Radiofluoroscopy
  | 'DX'    // Digital Radiography
  | 'NM'    // Nuclear Medicine
  | 'PT'    // Positron Emission Tomography
  | 'XA';   // X-Ray Angiography

export interface Report {
  id: string;
  status: ReportStatus;
  templateId?: string;
  indication?: string;
  technique?: string;
  findings?: string;
  impression?: string;
  recommendation?: string;
  ccamCodes: string[];
  cim10Codes: string[];
  adicapCodes: string[];
  draftedAt?: string;
  validatedAt?: string;
  examination: Examination;
  createdBy: User;
  validatedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export type ReportStatus = 
  | 'DRAFT'
  | 'PRELIMINARY'
  | 'FINAL'
  | 'AMENDED';

export interface ReportTemplate {
  id: string;
  name: string;
  modality: Modality;
  examType: string;
  indication?: string;
  technique?: string;
  findings?: string;
  impression?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Specific response format for worklist API
export interface WorklistResponse {
  examinations: Examination[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Worklist types
export interface WorklistParams {
  page?: number;
  limit?: number;
  status?: string;
  modality?: string;
  priority?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  query?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WorklistColumn {
  id: string;
  label: string;
  width: number;
  resizable: boolean;
  sortable: boolean;
  filterable: boolean;
  sticky?: 'left' | 'right';
  visible: boolean;
}

// Dashboard types
export interface DashboardStats {
  todayExams: number;
  pendingReports: number;
  avgReportingTime: number;
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
  modalityStats: Array<{
    modality: string;
    count: number;
  }>;
}

// DICOM types
export interface DicomStudy {
  studyInstanceUID: string;
  patientName: string;
  patientID: string;
  studyDate: string;
  studyTime: string;
  modality: string;
  studyDescription: string;
  accessionNumber: string;
  seriesCount?: number;
  instanceCount?: number;
}

export interface DicomSeries {
  seriesInstanceUID: string;
  modality: string;
  seriesDescription: string;
  seriesNumber: string;
  instanceCount: number;
}

export interface DicomInstance {
  sopInstanceUID: string;
  instanceNumber: string;
  sopClassUID: string;
}