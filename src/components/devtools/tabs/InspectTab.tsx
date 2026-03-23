import { Box, Code2, Layers, MousePointer2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/Button";
import type { DevLogEntry } from "../types";

type SelectedElementInfo = {
	tagName: string;
	id: string | null;
	className: string | null;
	role: string | null;
	ariaLabel: string | null;
	textPreview: string | null;
	path: string;
	rect: { left: number; top: number; width: number; height: number };
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
	};
}

export function InspectTab({
	onLog,
}: {
	onLog: (entry: Omit<DevLogEntry, "id" | "time">) => void;
}) {
	const [isInspecting, setIsInspecting] = useState(false);
	const [hoveredRect, setHoveredRect] = useState<
		SelectedElementInfo["rect"] | null
	>(null);
	const [selectedElement, setSelectedElement] =
		useState<SelectedElementInfo | null>(null);

	useEffect(() => {
		if (!isInspecting) {
			setHoveredRect(null);
			return;
		}

		const handlePointerMove = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) {
				return;
			}
			if (target.closest("[data-devtools-root='true']")) {
				return;
			}
			setHoveredRect(describeElement(target).rect);
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
			setSelectedElement(next);
			setHoveredRect(next.rect);
			setIsInspecting(false);
			onLog({
				type: "info",
				message: `Inspected ${next.path}`,
			});
		};

		document.addEventListener("pointermove", handlePointerMove, true);
		document.addEventListener("click", handleClick, true);
		return () => {
			document.removeEventListener("pointermove", handlePointerMove, true);
			document.removeEventListener("click", handleClick, true);
		};
	}, [isInspecting, onLog]);

	const selectedDetails = useMemo(
		() => [
			["Tag", selectedElement?.tagName ?? "Nothing selected"],
			["Role", selectedElement?.role ?? "None"],
			["Aria Label", selectedElement?.ariaLabel ?? "None"],
			["Path", selectedElement?.path ?? "Select an element to inspect"],
		],
		[selectedElement],
	);

	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b border-glass-border-base flex items-center justify-between bg-glass-bg-base/30">
				<h2 className="text-sm font-semibold">UI Inspector</h2>
				<Button
					variant={isInspecting ? "secondary" : "secondary"}
					active={isInspecting}
					onClick={() => setIsInspecting(!isInspecting)}
					className="h-8 px-3 text-xs gap-1.5"
				>
					<MousePointer2
						size={14}
						className={isInspecting ? "animate-pulse" : ""}
					/>
					{isInspecting ? "Inspecting..." : "Select Element"}
				</Button>
			</div>

			<div className="flex-1 p-4 flex flex-col gap-4 relative">
				{hoveredRect && (
					<div
						className="fixed pointer-events-none border border-accent/60 rounded-xl shadow-glow"
						style={{
							left: hoveredRect.left,
							top: hoveredRect.top,
							width: hoveredRect.width,
							height: hoveredRect.height,
						}}
					/>
				)}
				{isInspecting ? (
					<div className="flex-1 flex items-center justify-center text-center border-2 border-dashed border-accent/30 rounded-2xl bg-accent/5">
						<div className="max-w-[200px]">
							<MousePointer2 size={24} className="mx-auto mb-3 text-accent" />
							<p className="text-sm text-foreground">
								Click anywhere outside this panel to inspect the real DOM
								element.
							</p>
						</div>
					</div>
				) : (
					<>
						<div className="rounded-2xl border border-glass-border-base bg-glass-bg-base/30 overflow-hidden">
							<div className="px-3 py-2 border-b border-glass-border-base bg-background-deep/50 flex items-center gap-2">
								<Layers size={14} className="text-foreground-muted" />
								<span className="text-xs font-medium">Selected Component</span>
							</div>
							<div className="p-3">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-mono text-foreground">
										{selectedElement?.tagName ?? "No selection"}
									</span>
									<span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-glass-bg-hover border border-glass-border-base text-foreground-muted">
										DOM
									</span>
								</div>
								<div className="space-y-2 mb-3">
									{selectedDetails.map(([label, value]) => (
										<div
											key={label}
											className="grid grid-cols-[88px_1fr] gap-2"
										>
											<span className="text-[10px] uppercase tracking-wider text-foreground-subtle">
												{label}
											</span>
											<span className="text-xs text-foreground break-words">
												{value}
											</span>
										</div>
									))}
								</div>
								{selectedElement?.textPreview && (
									<p className="text-xs text-foreground-muted mb-3 line-clamp-3">
										{selectedElement.textPreview}
									</p>
								)}
								<Button
									variant="secondary"
									onClick={() =>
										onLog({
											type: "info",
											message:
												"Open in editor is not wired yet. Source mapping will come later.",
										})
									}
									className="w-full h-8 text-xs gap-1.5"
								>
									<Code2 size={12} />
									Open in Editor
								</Button>
							</div>
						</div>

						<div className="rounded-2xl border border-glass-border-base bg-glass-bg-base/30 overflow-hidden">
							<div className="px-3 py-2 border-b border-glass-border-base bg-background-deep/50 flex items-center gap-2">
								<Box size={14} className="text-foreground-muted" />
								<span className="text-xs font-medium">Selection Geometry</span>
							</div>
							<div className="p-3 grid grid-cols-2 gap-2 text-xs">
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
			<p className="text-sm font-mono text-foreground mt-1">
				{typeof value === "number" ? `${value}px` : "—"}
			</p>
		</div>
	);
}
