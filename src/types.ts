export interface ImageFile {
	id: string;
	url: string;
	name: string;
	dimensions?: { width: number; height: number };
}

export enum FilterType {
	NONE = "NONE",
	NOISE = "NOISE",
	PCA = "PCA",
	TEXTURE = "TEXTURE",
}

export interface ViewerState {
	scale: number;
	translation: { x: number; y: number };
	isFit: boolean;
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

export type MouseAction =
	| "Zoom"
	| "Next/Prev Image"
	| "Vertical Pan"
	| "Horizontal Pan"
	| "Reset Zoom"
	| "Fit to Screen"
	| "Toggle Fullscreen"
	| "Toggle Metadata"
	| "Toggle Toolbar"
	| "Toggle Gallery"
	| "Play/Pause Slideshow"
	| "Drag/Pan Mode";

export interface Keybind {
	action: string;
	key: string;
	label: string;
}
