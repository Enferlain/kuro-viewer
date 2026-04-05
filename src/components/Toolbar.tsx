import { Info, Maximize, Settings, ZoomIn, ZoomOut } from "lucide-react";
import type React from "react";
import { createInspectTargetAttrs } from "./devtools/inspectTargets";
import { Button } from "./ui/Button";

interface ToolbarProps {
	onZoomIn: () => void;
	onZoomOut: () => void;
	onReset: () => void;
	onInfo: () => void;
	onSettings: () => void;
	filename: string;
	zoomLevel: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({
	onZoomIn,
	onZoomOut,
	onReset,
	onInfo,
	onSettings,
	filename,
	zoomLevel,
}) => {
	return (
		<div
			{...createInspectTargetAttrs({
				label: "Toolbar",
				sourcePath: "src/components/Toolbar.tsx",
				sourceLine: 26,
				kind: "host-component",
				area: "chrome",
			})}
			className="h-[var(--spacing-toolbar)] bg-background-base/80 backdrop-blur-md border-b border-glass-border-base flex items-center justify-between px-4 z-[var(--ui-layer-chrome)] select-none"
		>
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

			<div className="w-1/3" />

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
