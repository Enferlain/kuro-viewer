import { Database, Download, Eye, Monitor, Upload, Zap } from "lucide-react";
import type React from "react";
import { Button } from "../../ui/Button";
import { Dropdown } from "../../ui/Dropdown";
import { SettingGroup } from "../ui/SettingGroup";
import { SettingRow } from "../ui/SettingRow";
import { SettingToggle } from "../ui/SettingToggle";

interface GeneralTabProps {
	startupRun: boolean;
	setStartupRun: (val: boolean) => void;
	checkUpdates: boolean;
	setCheckUpdates: (val: boolean) => void;
	allowInstances: boolean;
	setAllowInstances: (val: boolean) => void;
	watchChanges: boolean;
	setWatchChanges: (val: boolean) => void;
	autoOpenNew: boolean;
	setAutoOpenNew: (val: boolean) => void;
	gpuEnabled: boolean;
	setGpuEnabled: (val: boolean) => void;
	lowPower: boolean;
	setLowPower: (val: boolean) => void;
	cacheSize: number;
	setCacheSize: (val: number) => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({
	startupRun,
	setStartupRun,
	checkUpdates,
	setCheckUpdates,
	allowInstances,
	setAllowInstances,
	watchChanges,
	setWatchChanges,
	autoOpenNew,
	setAutoOpenNew,
	gpuEnabled,
	setGpuEnabled,
	lowPower,
	setLowPower,
	cacheSize,
	setCacheSize,
}) => (
	<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-[var(--ui-motion-duration-slow)]">
		<div>
			<h4 className="text-xl font-bold text-foreground mb-1">General</h4>
			<p className="text-sm text-foreground-muted">
				System behavior and core performance settings.
			</p>
		</div>

		<SettingGroup title="System" icon={<Monitor size={12} />}>
			<SettingRow
				label="Launch on Startup"
				description="Automatically run Kuro Viewer when you log into Windows."
			>
				<SettingToggle checked={startupRun} onChange={setStartupRun} />
			</SettingRow>
			<SettingRow
				label="Auto-Update"
				description="Keep the viewer up to date with the latest features and security fixes."
			>
				<SettingToggle checked={checkUpdates} onChange={setCheckUpdates} />
			</SettingRow>
			<SettingRow
				label="Allow Multiple Instances"
				description="Open images in new windows instead of replacing the current one."
			>
				<SettingToggle checked={allowInstances} onChange={setAllowInstances} />
			</SettingRow>
		</SettingGroup>

		<SettingGroup title="Files & Monitoring" icon={<Eye size={12} />}>
			<SettingRow
				label="Watch for Changes"
				description="Real-time monitoring of the current folder. Refreshes list when files are added or removed."
			>
				<SettingToggle checked={watchChanges} onChange={setWatchChanges} />
			</SettingRow>
			<SettingRow
				label="Auto-Open New Images"
				description="Automatically switch to the newest image when it's added to the folder (useful for AI generation)."
			>
				<SettingToggle checked={autoOpenNew} onChange={setAutoOpenNew} />
			</SettingRow>
		</SettingGroup>

		<SettingGroup title="Performance" icon={<Zap size={12} />}>
			<SettingRow
				label="Hardware Acceleration"
				description="Use the GPU for image decoding and filter processing. Improves pan/zoom smoothness."
			>
				<SettingToggle checked={gpuEnabled} onChange={setGpuEnabled} />
			</SettingRow>
			<SettingRow
				label="Low Power Mode"
				description="Reduce animation frame rates and background indexing priority to save battery."
			>
				<SettingToggle checked={lowPower} onChange={setLowPower} />
			</SettingRow>
			<SettingRow
				label="Thumbnail Cache Limit"
				description="Maximum disk space allocated for image previews."
			>
				<div className="flex items-center gap-3">
					<Dropdown
						value={cacheSize}
						onChange={(val) => setCacheSize(val as number)}
						className="min-w-[100px]"
						options={[
							{ label: "256 MB", value: 256 },
							{ label: "512 MB", value: 512 },
							{ label: "1024 MB", value: 1024 },
							{ label: "2.0 GB", value: 2048 },
						]}
					/>
					<Button
						variant="secondary"
						className="text-[10px] h-8 px-3 py-0 border-glass-border-subtle"
					>
						Clear
					</Button>
				</div>
			</SettingRow>
		</SettingGroup>

		<SettingGroup title="Data Management" icon={<Database size={12} />}>
			<SettingRow
				label="Export Settings"
				description="Save your current configuration to a file."
			>
				<Button variant="secondary" className="text-xs h-8 px-4">
					<Download size={14} className="mr-2" /> Export
				</Button>
			</SettingRow>
			<SettingRow
				label="Import Settings"
				description="Load a previously saved configuration file."
			>
				<Button variant="secondary" className="text-xs h-8 px-4">
					<Upload size={14} className="mr-2" /> Import
				</Button>
			</SettingRow>
		</SettingGroup>

		<div className="pt-4 flex justify-between items-center px-1">
			<span className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold">
				Reset Settings
			</span>
			<Button
				type="button"
				variant="secondary"
				className="text-destructive hover:text-destructive-hover hover:bg-destructive/10 border-destructive/20 text-xs"
			>
				Reset to Factory Defaults
			</Button>
		</div>
	</div>
);
