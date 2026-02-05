
export interface QuestionItem {
  number: string;
  question: string;
  answer?: string;
  diagramPrompt?: string;
  diagramDataUrl?: string;
  referenceDocUrl?: string;
  referenceVideoUrl?: string;
}

export enum ProcessStatus {
  IDLE = 'IDLE',
  CONFIGURING = 'CONFIGURING',
  UPLOADING = 'UPLOADING',
  EXTRACTING = 'EXTRACTING',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  GENERATING_DIAGRAMS = 'GENERATING_DIAGRAMS',
  CREATING_PDF = 'CREATING_PDF',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface ProcessingState {
  status: ProcessStatus;
  progress: number;
  message: string;
}

export interface AcademicContext {
  field: string;
  subField: string;
  subject: string;
}
