export interface ImageFile {
  id: string;
  url: string;
  name: string;
  dimensions?: { width: number; height: number };
}

export enum FilterType {
  NONE = 'NONE',
  NOISE = 'NOISE',
  PCA = 'PCA'
}

export interface ViewerState {
  scale: number;
  translation: { x: number; y: number };
}

export interface MetadataEntry {
  key: string;
  value: string;
  isLong?: boolean; // Hint for UI to render as multi-line block
}

export interface MetadataGroup {
  id: string;
  label: string;
  entries: MetadataEntry[];
}

export type ImageMetadata = MetadataGroup[];