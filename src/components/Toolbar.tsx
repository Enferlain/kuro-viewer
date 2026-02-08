import React from "react";
import { Button } from "./Button";
import { FilterType } from "../types";
import {
	ZoomIn,
	ZoomOut,
	Maximize,
	Activity,
	Waves,
	Info,
	Settings,
} from "lucide-react";

interface ToolbarProps {
	currentFilter: FilterType;
	onFilterChange: (filter: FilterType) => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onReset: () => void;
	onNext: () => void;
	onPrev: () => void;
	onInfo: () => void;
	onSettings: () => void;
	filename: string;
	zoomLevel: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({
	currentFilter,
	onFilterChange,
	onZoomIn,
	onZoomOut,
	onReset,
	onNext,
	onPrev,
	onInfo,
	onSettings,
	filename,
	zoomLevel,
}) => {
	return (
		<div className="h-14 bg-background-base/80 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-4 z-50 select-none">
			{/* Left: File Info */}
			<div className="flex items-center gap-3 w-1/3">
				<div className="flex flex-col">
					<span className="text-sm font-medium text-foreground truncate max-w-[300px]">
						{filename}
					</span>
					<span className="text-[10px] uppercase tracking-wider text-foreground-muted font-mono">
						{zoomLevel === 0 ? "FIT" : `${Math.round(zoomLevel * 100)}%`}
					</span>
				</div>
			</div>

			{/* Center: Filter Controls */}
			<div className="flex items-center gap-2 w-1/3 justify-center">
				<div className="flex items-center bg-background-elevated rounded-lg p-1 border border-white/[0.06] shadow-xl">
					<Button
						variant="secondary"
						className="text-xs px-3 py-1"
						active={currentFilter === FilterType.NONE}
						onClick={() => onFilterChange(FilterType.NONE)}
					>
						Original
					</Button>
					<div className="w-px h-4 bg-white/[0.1] mx-1" />
					<Button
						variant="secondary"
						className="text-xs px-3 py-1 flex items-center gap-2"
						active={currentFilter === FilterType.NOISE}
						onClick={() => onFilterChange(FilterType.NOISE)}
						tooltip="Apply Noise Filter (N)"
					>
						<Waves size={12} />
						Noise
					</Button>
					<Button
						variant="secondary"
						className="text-xs px-3 py-1 flex items-center gap-2"
						active={currentFilter === FilterType.PCA}
						onClick={() => onFilterChange(FilterType.PCA)}
						tooltip="Apply PCA Analysis (P)"
					>
						<Activity size={12} />
						PCA
					</Button>
				</div>
			</div>

			{/* Right: View Controls */}
			<div className="flex items-center gap-2 w-1/3 justify-end">
				<Button variant="icon" onClick={onInfo} tooltip="Image Metadata (X)">
					<Info size={16} />
				</Button>
				<div className="w-px h-4 bg-white/[0.1] mx-1" />
				<Button variant="icon" onClick={onZoomOut} tooltip="Zoom Out (-)">
					<ZoomOut size={16} />
				</Button>
				<Button variant="icon" onClick={onZoomIn} tooltip="Zoom In (+)">
					<ZoomIn size={16} />
				</Button>
				<div className="w-px h-4 bg-white/[0.1] mx-1" />
				<Button variant="icon" onClick={onReset} tooltip="Fit to Screen (0)">
					<Maximize size={16} />
				</Button>
				<div className="w-px h-4 bg-white/[0.1] mx-1" />
				<Button variant="icon" onClick={onSettings} tooltip="Preferences (,)">
					<Settings size={16} />
				</Button>
			</div>
		</div>
	);
};
