export interface Document {
  id: number;
  content: string;
  client_id: number;
  category: string;
  embedding?: number[];
}

export interface SearchResult extends Document {
  similarity: number; // 0 to 1
  passedSqlFilter: boolean;
}

export interface LogEntry {
  id: string;
  step: 'VECTOR' | 'SQL' | 'MERGE' | 'GENERATE';
  message: string;
  details?: string;
  timestamp: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  EMBEDDING = 'EMBEDDING',
  SEARCHING = 'SEARCHING',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}