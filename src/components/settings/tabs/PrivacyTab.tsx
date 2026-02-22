import {
	ArrowRight,
	Clock,
	Database,
	Download,
	FileImage,
	FolderOpen,
	History,
	ShieldAlert,
	Trash2,
	Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "../../ui/Button";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { VirtualizedList } from "../../ui/VirtualizedList";
import { SettingGroup } from "../ui/SettingGroup";
import { SettingRow } from "../ui/SettingRow";
import { SettingToggle } from "../ui/SettingToggle";

const MOCK_ACTIVITY_LOGS = Array.from({ length: 50 }).map((_, i) => ({
	id: `a${i + 1}`,
	time: `2026-02-21 0${Math.max(1, 4 - Math.floor(i / 10))}:${(59 - (i % 60)).toString().padStart(2, "0")} PM`,
	action:
		i % 3 === 0
			? "Applied Filter"
			: i % 3 === 1
				? "Analyzed Image"
				: "Opened Folder",
	detail:
		i % 3 === 0
			? "Noise Overlay (Strength: 0.8)"
			: i % 3 === 1
				? "004_test_v5_upscaled.png (Dwell: 42s)"
				: "D:\\Projects\\kuro-viewer\\samples\\ai-renders",
	iconType: i % 3 === 0 ? "zap" : i % 3 === 1 ? "image" : "folder",
}));

const ActivityIcon = ({ type }: { type: string }) => {
	switch (type) {
		case "zap":
			return <Zap size={12} className="text-accent" />;
		case "image":
			return <FileImage size={12} className="text-accent" />;
		default:
			return <FolderOpen size={12} className="text-accent" />;
	}
};

const MOCK_CONFIG_LOGS = Array.from({ length: 50 }).map((_, i) => ({
	id: `c${i + 1}`,
	time: `2026-02-${(21 - Math.floor(i / 10)).toString().padStart(2, "0")} 0${Math.max(1, 9 - (i % 5))}:00 PM`,
	setting:
		i % 3 === 0
			? "Scroll Wheel Behavior"
			: i % 3 === 1
				? "Backdrop Style"
				: "Thumbnail Cache Limit",
	oldVal: i % 3 === 0 ? "Zoom In/Out" : i % 3 === 1 ? "None" : "512 MB",
	newVal: i % 3 === 0 ? "Vertical Pan" : i % 3 === 1 ? "Mica" : "2.0 GB",
}));

interface PrivacyTabProps {
	telemetryEnabled: boolean;
	setTelemetryEnabled: (val: boolean) => void;
}
export const PrivacyTab: React.FC<PrivacyTabProps> = ({
	telemetryEnabled,
	setTelemetryEnabled,
}) => {
	const [confirmActivityOpen, setConfirmActivityOpen] = useState(false);
	const [confirmConfigOpen, setConfirmConfigOpen] = useState(false);
	const [confirmAllPrivacyOpen, setConfirmAllPrivacyOpen] = useState(false);
	const [autoClearOnExit, setAutoClearOnExit] = useState(false);
	const [storeFullPaths, setStoreFullPaths] = useState(true);
	const [crashReportsEnabled, setCrashReportsEnabled] = useState(true);

	const [showMoreActivity, setShowMoreActivity] = useState(false);
	const [showMoreConfig, setShowMoreConfig] = useState(false);

	const renderActivityLog = (log: (typeof MOCK_ACTIVITY_LOGS)[0]) => (
		<div key={log.id} className="flex items-start gap-3 py-1.5 pr-2">
			<div className="mt-0.5 shrink-0 bg-glass-bg-subtle p-1.5 rounded-md border border-glass-border-base">
				<ActivityIcon type={log.iconType} />
			</div>
			<div className="flex flex-col py-0.5 overflow-hidden w-full">
				<div className="flex items-center justify-between gap-4">
					<span className="text-xs font-medium text-foreground">
						{log.action}
					</span>
					<span className="text-[10px] text-foreground-muted shrink-0">
						{log.time}
					</span>
				</div>
				<span className="text-[11px] text-foreground-muted truncate mt-0.5">
					{log.detail}
				</span>
			</div>
		</div>
	);

	const renderConfigLog = (log: (typeof MOCK_CONFIG_LOGS)[0]) => (
		<div
			key={log.id}
			className="flex items-center justify-between py-1.5 pr-2 border-b border-glass-border-subtle"
		>
			<div className="flex flex-col gap-0.5 min-w-[140px] truncate">
				<span className="text-xs font-medium text-foreground truncate">
					{log.setting}
				</span>
				<span className="text-[10px] text-foreground-muted">{log.time}</span>
			</div>
			<div className="flex items-center gap-2 bg-glass-bg-base px-2 py-1 rounded-md border border-glass-border-base shrink-0">
				<span className="text-[11px] text-foreground-subtle line-through">
					{log.oldVal}
				</span>
				<ArrowRight size={10} className="text-accent" />
				<span className="text-[11px] text-foreground font-medium">
					{log.newVal}
				</span>
			</div>
		</div>
	);

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-[var(--ui-motion-duration-slow)]">
			<div>
				<h4 className="text-xl font-bold text-foreground mb-1">Privacy</h4>
				<p className="text-sm text-foreground-muted">
					History management and anonymous telemetry toggles.
				</p>
			</div>
			<SettingGroup title="Activity Log" icon={<Clock size={12} />}>
				<div className="px-4 py-3 space-y-4">
					<div className="flex flex-col gap-1">
						{showMoreActivity ? (
							<VirtualizedList
								items={MOCK_ACTIVITY_LOGS}
								itemHeight={48}
								visibleCount={10}
								renderItem={renderActivityLog}
							/>
						) : (
							MOCK_ACTIVITY_LOGS.slice(0, 3).map(renderActivityLog)
						)}
					</div>
					<div className="pt-2 flex items-center justify-between">
						<Button
							variant="ghost"
							onClick={() => setShowMoreActivity(!showMoreActivity)}
							className="text-xs h-8 px-4 text-accent hover:text-accent-bright"
						>
							{showMoreActivity ? "Show Less" : "Show More..."}
						</Button>
						<Button
							variant="destructive"
							onClick={() => setConfirmActivityOpen(true)}
							className="text-xs h-8 px-4"
						>
							<Trash2 size={12} className="mr-2" />
							Clear Activity Log
						</Button>
					</div>
				</div>
			</SettingGroup>
			<SettingGroup title="Configuration History" icon={<History size={12} />}>
				<div className="px-4 py-3 space-y-3">
					<div className="flex flex-col gap-2">
						{showMoreConfig ? (
							<VirtualizedList
								items={MOCK_CONFIG_LOGS}
								itemHeight={46}
								visibleCount={10}
								renderItem={renderConfigLog}
								className="-mr-2 pr-2"
							/>
						) : (
							MOCK_CONFIG_LOGS.slice(0, 3).map(renderConfigLog)
						)}
					</div>
					<div className="pt-2 flex items-center justify-between">
						<Button
							variant="ghost"
							onClick={() => setShowMoreConfig(!showMoreConfig)}
							className="text-xs h-8 px-4 text-accent hover:text-accent-bright"
						>
							{showMoreConfig ? "Show Less" : "Show More..."}
						</Button>
						<Button
							variant="destructive"
							onClick={() => setConfirmConfigOpen(true)}
							className="text-xs h-8 px-4"
						>
							<Trash2 size={12} className="mr-2" />
							Clear Configuration History
						</Button>
					</div>
				</div>
			</SettingGroup>
			<SettingGroup title="Telemetry" icon={<ShieldAlert size={12} />}>
				<SettingRow
					label="Anonymous Usage Statistics"
					description="Help improve Kuro Viewer by sending anonymous crash reports and basic usage metrics."
				>
					<SettingToggle
						checked={telemetryEnabled}
						onChange={setTelemetryEnabled}
					/>
				</SettingRow>
				<SettingRow
					label="Crash Diagnostics"
					description="Include stack traces and runtime environment metadata in crash events."
					disabled={!telemetryEnabled}
				>
					<SettingToggle
						checked={crashReportsEnabled}
						onChange={setCrashReportsEnabled}
					/>
				</SettingRow>
			</SettingGroup>
			<SettingGroup title="Data Controls" icon={<Database size={12} />}>
				<SettingRow
					label="Export Privacy Data"
					description="Download your local activity and configuration history as a JSON file."
				>
					<Button variant="secondary" className="text-xs h-8 px-4">
						<Download size={12} className="mr-2" />
						Export JSON
					</Button>
				</SettingRow>
				<SettingRow
					label="Auto-Clear Activity on Exit"
					description="Delete session activity entries when the app closes."
				>
					<SettingToggle
						checked={autoClearOnExit}
						onChange={setAutoClearOnExit}
					/>
				</SettingRow>
				<SettingRow
					label="Store Full File Paths"
					description="Keep complete absolute paths in logs for easier tracing."
				>
					<SettingToggle
						checked={storeFullPaths}
						onChange={setStoreFullPaths}
					/>
				</SettingRow>
				<SettingRow
					label="Delete Local Privacy Data"
					description="Remove activity log, configuration history, and cached privacy snapshots."
				>
					<Button
						variant="destructive"
						onClick={() => setConfirmAllPrivacyOpen(true)}
						className="text-xs h-8 px-4"
					>
						<Trash2 size={12} className="mr-2" />
						Delete All
					</Button>
				</SettingRow>
			</SettingGroup>
			<ConfirmDialog
				isOpen={confirmActivityOpen}
				onClose={() => setConfirmActivityOpen(false)}
				onConfirm={() => {
					// Backend logic to clear activity log
				}}
				title="Clear Activity Log"
				description="Are you sure you want to delete all recorded interactions, folder history, and forensic event tracking? This cannot be undone."
				confirmText="Clear Activity"
				isDestructive={true}
			/>
			<ConfirmDialog
				isOpen={confirmConfigOpen}
				onClose={() => setConfirmConfigOpen(false)}
				onConfirm={() => {
					// Backend logic to clear config history
				}}
				title="Clear Configuration History"
				description="Are you sure you want to delete the chronological record of all changes made to your settings? This does not reset your settings, only the history log."
				confirmText="Clear History"
				isDestructive={true}
			/>
			<ConfirmDialog
				isOpen={confirmAllPrivacyOpen}
				onClose={() => setConfirmAllPrivacyOpen(false)}
				onConfirm={() => {
					// Backend logic to clear all privacy-related data
				}}
				title="Delete Local Privacy Data"
				description="This removes activity history, configuration history, and local privacy snapshots. This action cannot be undone."
				confirmText="Delete All Data"
				isDestructive={true}
			/>
		</div>
	);
};
