import {
	Box,
	Database,
	GripHorizontal,
	Maximize2,
	Minus,
	Search,
	Terminal,
	X,
} from "lucide-react";
import { useState } from "react";
import { useSettings } from "../../stores/settings";
import { Button } from "../ui/Button";
import type {
	EditorLaunchPreference,
	SelectedElementInfo,
} from "./tabs/InspectTab";
import { InspectTab } from "./tabs/InspectTab";
import { LogsTab } from "./tabs/LogsTab";
import { PluginsTab } from "./tabs/PluginsTab";
import { StateTab } from "./tabs/StateTab";
import type { DevToolsHostSnapshot } from "./types";
import { useDrag } from "./useDrag";
import { useWorkspacePlugins } from "./useWorkspacePlugins";

type Tab = "plugins" | "inspect" | "state" | "logs";

const TABS = [
	{ id: "plugins", label: "Plugins", icon: Box },
	{ id: "inspect", label: "Inspect", icon: Search },
	{ id: "state", label: "State", icon: Database },
	{ id: "logs", label: "Logs", icon: Terminal },
] as const;

export function DevTools({
	onClose,
	host,
}: {
	onClose: () => void;
	host: DevToolsHostSnapshot;
}) {
	const { settings } = useSettings();
	const [activeTab, setActiveTab] = useState<Tab>("plugins");
	const [isMinimized, setIsMinimized] = useState(false);
	const [isTranslucent, setIsTranslucent] = useState(false);
	const { position, handlePointerDown, resetPosition } = useDrag();
	const { plugins, logs, summary, appendLog, reloadWorkspacePlugins } =
		useWorkspacePlugins();
	const [selectedElement, setSelectedElement] =
		useState<SelectedElementInfo | null>(null);
	const preferredEditors: EditorLaunchPreference[] = [
		{
			path: settings.edit.primaryEditorPath,
			argsTemplate: settings.edit.primaryEditorArgsTemplate,
		},
		{
			path: settings.edit.secondaryEditorPath,
			argsTemplate: settings.edit.secondaryEditorArgsTemplate,
		},
	];

	return (
		<div
			data-devtools-root="true"
			className={`fixed z-[var(--ui-layer-modal)] flex flex-col rounded-2xl border border-glass-border-strong bg-background-deep backdrop-blur-xl shadow-xl overflow-hidden transition-opacity duration-[var(--ui-motion-duration-standard)] ${isTranslucent ? "opacity-45 hover:opacity-100" : "opacity-100"}`}
			style={{
				top: 16,
				right: 16,
				transform: `translate(${position.x}px, ${position.y}px)`,
				width: isMinimized ? 280 : "min(600px, calc(100vw - 32px))",
				height: isMinimized ? "auto" : "min(500px, calc(100vh - 32px))",
			}}
		>
			{/* Header / Drag Handle */}
			<div
				onPointerDown={handlePointerDown}
				className={`flex items-center justify-between border-b border-glass-border-base bg-glass-bg-base cursor-grab active:cursor-grabbing select-none transition-[padding] ${isMinimized ? "px-3 py-2" : "px-4 py-3"}`}
			>
				<div className="flex items-center gap-3">
					<GripHorizontal size={14} className="text-foreground-muted" />
					<div className="flex flex-col">
						<span className="text-sm font-semibold tracking-tight">
							Plugin Devtools
						</span>
						<span className="text-[10px] uppercase tracking-[0.24em] text-foreground-subtle">
							Dev Mode
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="secondary"
						onClick={resetPosition}
						className="h-7 px-2.5 text-xs"
						title="Reset panel position"
					>
						Reset
					</Button>
					<Button
						variant="secondary"
						active={isTranslucent}
						onClick={() => setIsTranslucent(!isTranslucent)}
						className="h-7 px-2.5 text-xs"
						title="Toggle translucent mode"
					>
						Ghost
					</Button>
					<button
						type="button"
						onClick={() => setIsMinimized(!isMinimized)}
						className="text-foreground-muted hover:text-foreground transition-colors p-1 cursor-pointer"
						title={isMinimized ? "Expand" : "Minimize"}
					>
						{isMinimized ? <Maximize2 size={14} /> : <Minus size={16} />}
					</button>
					<button
						type="button"
						onClick={onClose}
						className="text-foreground-muted hover:text-foreground transition-colors p-1 cursor-pointer"
						title="Close"
					>
						<X size={16} />
					</button>
				</div>
			</div>

			{!isMinimized && (
				<div className="flex min-h-0 flex-1 overflow-hidden">
					<div className="w-36 flex flex-col border-r border-glass-border-base bg-glass-bg-base p-2 gap-1">
						<div className="px-2 py-2 rounded-xl border border-glass-border-base bg-background-deep/60 text-[10px] uppercase tracking-wider text-foreground-subtle">
							{summary.ready} ready / {summary.total} total
						</div>
						{TABS.map((tab) => {
							const Icon = tab.icon;
							const isActive = activeTab === tab.id;
							return (
								<button
									type="button"
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
										isActive
											? "border border-accent/20 bg-accent/10 text-accent"
											: "border border-transparent text-foreground-muted hover:bg-glass-bg-hover hover:text-foreground"
									}`}
								>
									<Icon size={14} />
									{tab.label}
								</button>
							);
						})}
					</div>

					<div className="flex-1 flex min-h-0 flex-col overflow-y-auto bg-background-deep">
						{activeTab === "plugins" ? (
							<PluginsTab
								plugins={plugins}
								summary={summary}
								onReload={reloadWorkspacePlugins}
								onLog={appendLog}
							/>
						) : activeTab === "inspect" ? (
							<InspectTab
								onLog={appendLog}
								selectedElement={selectedElement}
								onSelectedElementChange={setSelectedElement}
								preferredEditors={preferredEditors}
							/>
						) : activeTab === "state" ? (
							<StateTab
								host={host}
								settings={settings}
								workspacePlugins={plugins}
							/>
						) : (
							<LogsTab logs={logs} />
						)}
					</div>
				</div>
			)}
		</div>
	);
}
