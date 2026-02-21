import {
	ArrowRight,
	Clock,
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
import { SettingGroup } from "../ui/SettingGroup";
import { SettingRow } from "../ui/SettingRow";
import { SettingToggle } from "../ui/SettingToggle";

interface PrivacyTabProps {
	saveHistory: boolean;
	setSaveHistory: (val: boolean) => void;
	telemetryEnabled: boolean;
	setTelemetryEnabled: (val: boolean) => void;
}

export const PrivacyTab: React.FC<PrivacyTabProps> = ({
	saveHistory,
	setSaveHistory,
	telemetryEnabled,
	setTelemetryEnabled,
}) => {
	const [confirmActivityOpen, setConfirmActivityOpen] = useState(false);
	const [confirmConfigOpen, setConfirmConfigOpen] = useState(false);

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
			<div>
				<h4 className="text-xl font-bold text-white mb-1">Privacy</h4>
				<p className="text-sm text-foreground-muted">
					History management and anonymous telemetry toggles.
				</p>
			</div>

			<SettingGroup title="Activity Log" icon={<Clock size={12} />}>
				<div className="px-4 py-3 space-y-4">
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium text-foreground">
								Record Usage Activity
							</span>
							<SettingToggle checked={saveHistory} onChange={setSaveHistory} />
						</div>
						<p className="text-[11px] text-foreground-muted leading-relaxed">
							Keep a detailed local timeline of folders opened, time spent
							navigating images, and features utilized. This metadata powers
							future AI workspace functionality.
						</p>
					</div>

					{/* Explicit Data Readout Card */}
					<div className="flex flex-col gap-1 pt-2 border-t border-glass-border-subtle">
						{[
							{
								id: "a1",
								time: "2026-02-21 04:32 PM",
								action: "Applied Filter",
								detail: "Noise Overlay (Strength: 0.8)",
								icon: <Zap size={12} className="text-accent" />,
							},
							{
								id: "a2",
								time: "2026-02-21 04:15 PM",
								action: "Analyzed Image",
								detail: "004_test_v5_upscaled.png (Dwell: 42s)",
								icon: <FileImage size={12} className="text-accent" />,
							},
							{
								id: "a3",
								time: "2026-02-21 04:12 PM",
								action: "Opened Folder",
								detail: "D:\\Projects\\kuro-viewer\\samples\\ai-renders",
								icon: <FolderOpen size={12} className="text-accent" />,
							},
						].map((log) => (
							<div key={log.id} className="flex items-start gap-3 py-1.5">
								<div className="mt-0.5 shrink-0 bg-glass-bg-base/50 p-1.5 rounded-md border border-glass-border-base">
									{log.icon}
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
						))}
					</div>

					<div className="pt-2 flex items-center justify-between">
						<Button
							variant="ghost"
							className="text-xs h-8 px-4 text-accent hover:text-accent-bright"
						>
							Show More Activity...
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
						{[
							{
								id: "1",
								time: "2026-02-21 03:20 PM",
								setting: "Scroll Wheel Behavior",
								oldVal: "Zoom In/Out",
								newVal: "Vertical Pan",
							},
							{
								id: "2",
								time: "2026-02-19 11:45 AM",
								setting: "Backdrop Style",
								oldVal: "None",
								newVal: "Mica",
							},
							{
								id: "3",
								time: "2026-02-14 09:30 PM",
								setting: "Thumbnail Cache Limit",
								oldVal: "512 MB",
								newVal: "2.0 GB",
							},
						].map((log) => (
							<div
								key={log.id}
								className="flex items-center justify-between py-1.5 border-b border-glass-border-subtle last:border-0"
							>
								<div className="flex flex-col gap-0.5 min-w-[140px]">
									<span className="text-xs font-medium text-foreground">
										{log.setting}
									</span>
									<span className="text-[10px] text-foreground-muted">
										{log.time}
									</span>
								</div>
								<div className="flex items-center gap-2 bg-glass-bg-base px-2 py-1 rounded-md border border-glass-border-base">
									<span className="text-[11px] text-foreground-muted line-through opacity-70">
										{log.oldVal}
									</span>
									<ArrowRight size={10} className="text-accent" />
									<span className="text-[11px] text-foreground font-medium">
										{log.newVal}
									</span>
								</div>
							</div>
						))}
					</div>

					<div className="pt-2 flex items-center justify-between">
						<Button
							variant="ghost"
							className="text-xs h-8 px-4 text-accent hover:text-accent-bright"
						>
							Show More Results...
						</Button>
						<Button
							variant="destructive"
							onClick={() => setConfirmConfigOpen(true)}
							className="text-xs h-8 px-4"
						>
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
		</div>
	);
};
