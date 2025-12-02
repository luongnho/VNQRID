export interface QRDataField {
  label: string;
  value: string;
}

export interface ScannedResult {
  rawText: string;
  fields: QRDataField[];
}

export enum ParsingStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface ParsedResponse {
  fields: {
    key: string;
    value: string;
  }[];
}