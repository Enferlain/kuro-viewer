import { Box, Code2, Layers, MousePointer2 } from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../ui/Button";
import {
	type ResolvedInspectTarget,
	resolveInspectTarget,
} from "../inspectTargets";
import type { DevLogEntry } from "../types";

const IS_TAURI = "__TAURI_INTERNALS__" in window;

export type SelectedElementInfo = {
	tagName: string;
	id: string | null;
	className: string | null;
	role: string | null;
	ariaLabel: string | null;
	textPreview: string | null;
	path: string;
	rect: { left: number; top: number; width: number; height: number };
	owner: ResolvedInspectTarget | null;
};

type HoverInfo = {
	rect: SelectedElementInfo["rect"];
	tagName: string;
	ownerLabel: string | null;
};

function buildElementPath(element: HTMLElement): string {
	const parts: string[] = [];
	let current: HTMLElement | null = element;
	while (current && parts.length < 5) {
		let part = current.tagName.toLowerCase();
		if (current.id) {
			part += `#${current.id}`;
			parts.unshift(part);
			break;
		}
		if (current.classList.length > 0) {
			part += `.${Array.from(current.classList).slice(0, 2).join(".")}`;
		}
		parts.unshift(part);
		current = current.parentElement;
	}
	return parts.join(" > ");
}

function describeElement(element: HTMLElement): SelectedElementInfo {
	const rect = element.getBoundingClientRect();
	return {
		tagName: element.tagName.toLowerCase(),
		id: element.id || null,
		className:
			typeof element.className === "string" && element.className.length > 0
				? element.className
				: null,
		role: element.getAttribute("role"),
		ariaLabel: element.getAttribute("aria-label"),
		textPreview: element.textContent?.trim().slice(0, 120) || null,
		path: buildElementPath(element),
		rect: {
			left: Math.round(rect.left),
			top: Math.round(rect.top),
			width: Math.round(rect.width),
			height: Math.round(rect.height),
		},
		owner: resolveInspectTarget(element),
	};
}

type OpenWorkspacePathResult = {
	openedPath: string;
	method: string;
};

async function tauriInvoke<T>(
	command: string,
	args?: Record<string, unknown>,
): Promise<T> {
	const { invoke } = await import("@tauri-apps/api/core");
	return invoke<T>(command, args);
}

/* ------------------------------------------------------------------ */
/*  Inspect overlay — rendered into document.body via portal          */
/* ------------------------------------------------------------------ */

function InspectOverlay({
	hoverInfo,
	isInspecting,
}: {
	hoverInfo: HoverInfo | null;
	isInspecting: boolean;
}) {
	if (!isInspecting || !hoverInfo) {
		return null;
	}

	const { rect, tagName, ownerLabel } = hoverInfo;
	const tooltipLabel = ownerLabel ? `${ownerLabel} › ${tagName}` : tagName;

	/* Place the tooltip above the element; flip below if no room */
	const tooltipAbove = rect.top > 28;
	const tooltipStyle: CSSProperties = {
		position: "fixed",
		left: rect.left,
		top: tooltipAbove ? rect.top - 24 : rect.top + rect.height + 4,
		pointerEvents: "none",
		zIndex: 2147483647,
	};

	return createPortal(
		<>
			{/* Highlight rectangle */}
			<div
				style={{
					position: "fixed",
					left: rect.left,
					top: rect.top,
					width: rect.width,
					height: rect.height,
					border: "1.5px solid oklch(0.72 0.19 262)",
					background: "oklch(0.72 0.19 262 / 0.06)",
					borderRadius: 6,
					pointerEvents: "none",
					zIndex: 2147483646,
					transition: "all 60ms ease-out",
				}}
			/>
			{/* Tooltip badge */}
			<div style={tooltipStyle}>
				<span
					style={{
						display: "inline-block",
						padding: "2px 6px",
						fontSize: 10,
						lineHeight: "16px",
						fontFamily: "ui-monospace, monospace",
						color: "#fff",
						background: "oklch(0.72 0.19 262)",
						borderRadius: 4,
						whiteSpace: "nowrap",
						maxWidth: 280,
						overflow: "hidden",
						textOverflow: "ellipsis",
					}}
				>
					{tooltipLabel}
				</span>
			</div>
		</>,
		document.body,
	);
}

/* ------------------------------------------------------------------ */
/*  Main InspectTab component                                        */
/* ------------------------------------------------------------------ */

export function InspectTab({
	onLog,
	selectedElement,
	onSelectedElementChange,
}: {
	onLog: (entry: Omit<DevLogEntry, "id" | "time">) => void;
	selectedElement: SelectedElementInfo | null;
	onSelectedElementChange: (el: SelectedElementInfo | null) => void;
}) {
	const [isInspecting, setIsInspecting] = useState(false);
	const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

	/* ---- Global cursor + body attribute for inspect mode ---- */
	useEffect(() => {
		if (isInspecting) {
			document.documentElement.setAttribute("data-kuro-inspecting", "");
		} else {
			document.documentElement.removeAttribute("data-kuro-inspecting");
		}
		return () => {
			document.documentElement.removeAttribute("data-kuro-inspecting");
		};
	}, [isInspecting]);

	/* ---- Inject global cursor style once ---- */
	useEffect(() => {
		const STYLE_ID = "kuro-inspect-cursor-style";
		if (document.getElementById(STYLE_ID)) {
			return;
		}
		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent =
			"[data-kuro-inspecting] * { cursor: crosshair !important; }";
		document.head.appendChild(style);
	}, []);

	/* ---- Event listeners for inspect mode ---- */
	useEffect(() => {
		if (!isInspecting) {
			setHoverInfo(null);
			return;
		}

		const handlePointerMove = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) {
				return;
			}
			if (target.closest("[data-devtools-root='true']")) {
				setHoverInfo(null);
				return;
			}
			const rect = target.getBoundingClientRect();
			const owner = resolveInspectTarget(target);
			setHoverInfo({
				rect: {
					left: Math.round(rect.left),
					top: Math.round(rect.top),
					width: Math.round(rect.width),
					height: Math.round(rect.height),
				},
				tagName: target.tagName.toLowerCase(),
				ownerLabel: owner?.label ?? null,
			});
		};

		const handleClick = (event: MouseEvent) => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) {
				return;
			}
			if (target.closest("[data-devtools-root='true']")) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			const next = describeElement(target);
			onSelectedElementChange(next);
			setHoverInfo(null);
			setIsInspecting(false);
			onLog({
				type: "info",
				message: `Inspected ${next.owner?.label ?? next.path}`,
			});
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				setHoverInfo(null);
				setIsInspecting(false);
				onLog({ type: "info", message: "Inspect mode cancelled" });
			}
		};

		document.addEventListener("pointermove", handlePointerMove, true);
		document.addEventListener("click", handleClick, true);
		document.addEventListener("keydown", handleKeyDown, true);
		return () => {
			document.removeEventListener("pointermove", handlePointerMove, true);
			document.removeEventListener("click", handleClick, true);
			document.removeEventListener("keydown", handleKeyDown, true);
		};
	}, [isInspecting, onLog, onSelectedElementChange]);

	const selectedDetails = useMemo(
		() => [
			["Tag", selectedElement?.tagName ?? "Nothing selected"],
			["Owner", selectedElement?.owner?.label ?? "No tagged owner found"],
			["Source", selectedElement?.owner?.sourcePath ?? "No source mapping yet"],
			[
				"Line",
				selectedElement?.owner?.sourceLine
					? String(selectedElement.owner.sourceLine)
					: "Unknown",
			],
			["Kind", selectedElement?.owner?.kind ?? "Unknown"],
			["Role", selectedElement?.role ?? "None"],
			["Aria Label", selectedElement?.ariaLabel ?? "None"],
			["Path", selectedElement?.path ?? "Select an element to inspect"],
		],
		[selectedElement],
	);

	const handleOpenInEditor = async () => {
		if (!selectedElement?.owner?.sourcePath) {
			onLog({
				type: "info",
				message:
					"No source mapping is available for the current selection yet.",
			});
			return;
		}

		if (!IS_TAURI) {
			onLog({
				type: "info",
				message: `Inspect source path: ${selectedElement.owner.sourcePath}`,
			});
			return;
		}

		try {
			const result = await tauriInvoke<OpenWorkspacePathResult>(
				"open_repo_source_path",
				{
					repoPath: selectedElement.owner.sourcePath,
				},
			);
			onLog({
				type: "success",
				message: `Opened inspect source via ${result.method}: ${result.openedPath}`,
			});
		} catch (error) {
			onLog({
				type: "error",
				message: `Failed to open inspect source: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	};

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b border-glass-border-base bg-glass-bg-base/30 p-4">
				<h2 className="text-sm font-semibold">UI Inspector</h2>
				<Button
					variant="secondary"
					active={isInspecting}
					onClick={() => setIsInspecting(!isInspecting)}
					className="h-8 gap-1.5 px-3 text-xs"
				>
					<MousePointer2
						size={14}
						className={isInspecting ? "animate-pulse" : ""}
					/>
					{isInspecting ? "Inspecting..." : "Select Element"}
				</Button>
			</div>

			<div className="relative flex flex-1 flex-col gap-4 p-4">
				{/* Overlay is portaled to document.body */}
				<InspectOverlay hoverInfo={hoverInfo} isInspecting={isInspecting} />

				{isInspecting ? (
					<div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-accent/30 bg-accent/5 text-center">
						<div className="max-w-[200px]">
							<MousePointer2 size={24} className="mx-auto mb-3 text-accent" />
							<p className="text-sm text-foreground">
								Click anywhere outside this panel to inspect the element.
							</p>
							<p className="mt-2 text-[10px] text-foreground-muted">
								Press Escape to cancel
							</p>
						</div>
					</div>
				) : (
					<>
						<div className="overflow-hidden rounded-2xl border border-glass-border-base bg-glass-bg-base/30">
							<div className="flex items-center gap-2 border-b border-glass-border-base bg-background-deep/50 px-3 py-2">
								<Layers size={14} className="text-foreground-muted" />
								<span className="text-xs font-medium">Selected Component</span>
							</div>
							<div className="p-3">
								<div className="mb-2 flex items-center justify-between">
									<span className="font-mono text-sm text-foreground">
										{selectedElement?.tagName ?? "No selection"}
									</span>
									<span className="rounded-lg border border-glass-border-base bg-glass-bg-hover px-1.5 py-0.5 text-[10px] text-foreground-muted">
										DOM
									</span>
								</div>
								<div className="mb-3 space-y-2">
									{selectedDetails.map(([label, value]) => (
										<div
											key={label}
											className="grid grid-cols-[88px_1fr] gap-2"
										>
											<span className="text-[10px] uppercase tracking-wider text-foreground-subtle">
												{label}
											</span>
											<span className="break-words text-xs text-foreground">
												{value}
											</span>
										</div>
									))}
								</div>
								{selectedElement?.textPreview && (
									<p className="mb-3 line-clamp-3 text-xs text-foreground-muted">
										{selectedElement.textPreview}
									</p>
								)}
								{selectedElement?.owner && (
									<div className="mb-3 rounded-xl border border-glass-border-base bg-background-deep px-3 py-2">
										<p className="text-[10px] uppercase tracking-wider text-foreground-subtle">
											Selection Context
										</p>
										<p className="mt-1 text-sm text-foreground">
											{selectedElement.owner.label}
										</p>
										<p className="mt-1 break-all font-mono text-xs text-foreground-muted">
											{selectedElement.owner.sourceLine
												? `${selectedElement.owner.sourcePath}:${selectedElement.owner.sourceLine}`
												: selectedElement.owner.sourcePath}
										</p>
									</div>
								)}
								<Button
									variant="secondary"
									onClick={() => void handleOpenInEditor()}
									disabled={!selectedElement?.owner?.sourcePath}
									className="h-8 w-full gap-1.5 text-xs"
								>
									<Code2 size={12} />
									Open in Editor
								</Button>
							</div>
						</div>

						<div className="overflow-hidden rounded-2xl border border-glass-border-base bg-glass-bg-base/30">
							<div className="flex items-center gap-2 border-b border-glass-border-base bg-background-deep/50 px-3 py-2">
								<Box size={14} className="text-foreground-muted" />
								<span className="text-xs font-medium">Selection Geometry</span>
							</div>
							<div className="grid grid-cols-2 gap-2 p-3 text-xs">
								<GeometryPill label="Left" value={selectedElement?.rect.left} />
								<GeometryPill label="Top" value={selectedElement?.rect.top} />
								<GeometryPill
									label="Width"
									value={selectedElement?.rect.width}
								/>
								<GeometryPill
									label="Height"
									value={selectedElement?.rect.height}
								/>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function GeometryPill({
	label,
	value,
}: {
	label: string;
	value: number | undefined;
}) {
	return (
		<div className="rounded-xl border border-glass-border-base bg-background-deep px-3 py-2">
			<p className="text-[10px] uppercase tracking-wider text-foreground-subtle">
				{label}
			</p>
			<p className="mt-1 font-mono text-sm text-foreground">
				{typeof value === "number" ? `${value}px` : "—"}
			</p>
		</div>
	);
}
