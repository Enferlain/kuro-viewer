import {
	Box,
	Database,
	GripHorizontal,
	Minus,
	Search,
	Terminal,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
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
	const {
		badgeRef,
		panelRef,
		position,
		handlePointerDown,
		handlePointerDownOrClick,
		resetPosition,
	} = useDrag();
	const inspectAutoRestoreRef = useRef(false);
	const [isInspecting, setIsInspecting] = useState(false);
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
	const stopDragPropagation = () => {
		return {
			onPointerDown: (event: React.PointerEvent) => {
				event.stopPropagation();
			},
		};
	};
	const handleInspectingChange = useCallback((nextIsInspecting: boolean) => {
		setIsInspecting(nextIsInspecting);

		if (nextIsInspecting) {
			inspectAutoRestoreRef.current = true;
			setIsMinimized(true);
			return;
		}

		if (inspectAutoRestoreRef.current) {
			inspectAutoRestoreRef.current = false;
			setIsMinimized(false);
		}
	}, []);

	return (
		<>
			<div
				ref={badgeRef}
				data-devtools-root="true"
				aria-hidden={!isMinimized}
				className={`fixed z-(--ui-layer-modal) pointer-events-none touch-none transition-opacity duration-[var(--ui-motion-duration-standard)] ${
					isMinimized ? "opacity-100" : "opacity-0"
				}`}
				style={{
					top: 16,
					right: 16,
					transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
					width: "min(600px, calc(100vw - 32px))",
					height: "min(500px, calc(100vh - 32px))",
				}}
			>
				<div
					data-devtools-root="true"
					onPointerDown={(event) =>
						isInspecting
							? handlePointerDown(event)
							: handlePointerDownOrClick(event, () => setIsMinimized(false))
					}
					className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-accent bg-background-deep px-3 py-2 cursor-grab active:cursor-grabbing select-none transition-[opacity,transform,border-color] duration-[var(--ui-motion-duration-standard)] ${
						isMinimized
							? "pointer-events-auto scale-100 opacity-100"
							: "pointer-events-none scale-90 opacity-0"
					} hover:border-accent`}
					title={
						isInspecting
							? "Inspecting... drag to move"
							: "Click to open, drag to move"
					}
				>
					<Terminal size={14} className="shrink-0 text-accent" />
					<span className="text-xs font-semibold tracking-tight text-foreground whitespace-nowrap">
						{isInspecting ? "Inspecting..." : "DevTools"}
					</span>
				</div>
			</div>

			<div
				ref={panelRef}
				data-devtools-root="true"
				aria-hidden={isMinimized}
				className={`fixed z-(--ui-layer-modal) touch-none transition-opacity duration-[var(--ui-motion-duration-standard)] ${
					isMinimized
						? "pointer-events-none opacity-0"
						: "pointer-events-auto opacity-100"
				}`}
				style={{
					top: 16,
					right: 16,
					transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
					width: "min(600px, calc(100vw - 32px))",
					height: "min(500px, calc(100vh - 32px))",
				}}
			>
				<div
					className={`flex h-full flex-col rounded-2xl border border-glass-border-strong bg-background-deep backdrop-blur-xl shadow-xl overflow-hidden transition-[opacity,transform] duration-[var(--ui-motion-duration-standard)] ${
						isMinimized ? "scale-96 opacity-0" : "scale-100 opacity-100"
					}`}
				>
					{/* Header / Drag Handle */}
					<div
						onPointerDown={handlePointerDown}
						className="flex items-center justify-between border-b border-glass-border-base bg-glass-bg-base px-4 py-3 cursor-grab active:cursor-grabbing select-none touch-none"
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
						<div className="flex items-center gap-2" {...stopDragPropagation()}>
							<Button
								variant="secondary"
								onClick={resetPosition}
								className="h-7 px-2.5 text-xs"
								title="Reset panel position"
							>
								Reset
							</Button>
							<button
								type="button"
								onClick={() => setIsMinimized(true)}
								className="text-foreground-muted hover:text-foreground transition-colors p-1 cursor-pointer"
								title="Minimize to badge"
							>
								<Minus size={16} />
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
									onInspectingChange={handleInspectingChange}
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
				</div>
			</div>
		</>
	);
}
