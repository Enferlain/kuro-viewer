import {
	Activity,
	Info,
	Maximize,
	Microscope,
	Settings,
	Waves,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { FilterType } from "../types";
import { Button } from "./ui/Button";

interface ModeAction {
	mode: FilterType;
	label: string;
	hotkey: string;
}

interface ToolbarProps {
	currentFilter: FilterType;
	modeActions: ModeAction[];
	onFilterChange: (filter: FilterType) => void;
	score: number | null;
	showScore: boolean;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onReset: () => void;
	onInfo: () => void;
	onSettings: () => void;
	filename: string;
	zoomLevel: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({
	currentFilter,
	modeActions,
	onFilterChange,
	score,
	showScore,
	onZoomIn,
	onZoomOut,
	onReset,
	onInfo,
	onSettings,
	filename,
	zoomLevel,
}) => {
	return (
		<div className="h-[var(--spacing-toolbar)] bg-background-base/80 backdrop-blur-md border-b border-glass-border-base flex items-center justify-between px-4 z-[var(--ui-layer-chrome)] select-none">
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
				<div className="flex items-center bg-background-elevated rounded-lg p-1 border border-glass-border-base shadow-xl">
					{modeActions.map((modeAction, index) => (
						<div key={modeAction.mode} className="flex items-center">
							{index !== 0 && (
								<div className="w-px h-4 bg-glass-border-strong mx-1" />
							)}
							<Button
								variant="secondary"
								className="text-xs px-3 py-1 flex items-center gap-2"
								active={currentFilter === modeAction.mode}
								onClick={() => onFilterChange(modeAction.mode)}
								tooltip={`${modeAction.label} (${modeAction.hotkey})`}
							>
								{modeAction.mode === FilterType.NOISE && <Waves size={12} />}
								{modeAction.mode === FilterType.PCA && <Activity size={12} />}
								{modeAction.mode === FilterType.TEXTURE && (
									<Microscope size={12} />
								)}
								{modeAction.label}
							</Button>
						</div>
					))}
				</div>
				{showScore && currentFilter !== FilterType.NONE && (
					<div className="px-2 py-1 rounded-lg border border-glass-border-base bg-glass-bg-subtle text-[10px] text-foreground-muted font-mono">
						Score: {score === null ? "..." : score.toFixed(2)}
					</div>
				)}
			</div>

			{/* Right: View Controls */}
			<div className="flex items-center gap-2 w-1/3 justify-end">
				<Button variant="icon" onClick={onInfo} tooltip="Image Metadata (X)">
					<Info size={16} />
				</Button>
				<div className="w-px h-4 bg-glass-border-strong mx-1" />
				<Button variant="icon" onClick={onZoomOut} tooltip="Zoom Out (-)">
					<ZoomOut size={16} />
				</Button>
				<Button variant="icon" onClick={onZoomIn} tooltip="Zoom In (+)">
					<ZoomIn size={16} />
				</Button>
				<div className="w-px h-4 bg-glass-border-strong mx-1" />
				<Button variant="icon" onClick={onReset} tooltip="Fit to Screen (0)">
					<Maximize size={16} />
				</Button>
				<div className="w-px h-4 bg-glass-border-strong mx-1" />
				<Button variant="icon" onClick={onSettings} tooltip="Preferences (,)">
					<Settings size={16} />
				</Button>
			</div>
		</div>
	);
};
