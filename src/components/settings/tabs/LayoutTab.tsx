import { Eye } from "lucide-react";
import type React from "react";
import { SettingToggle } from "../ui/SettingToggle";

interface LayoutTabProps {
	toolbarPos: "Top" | "Bottom" | "Hidden";
	setToolbarPos: (val: "Top" | "Bottom" | "Hidden") => void;
	toolbarOrder: number;
	galleryPos: "Top" | "Bottom" | "Hidden";
	setGalleryPos: (val: "Top" | "Bottom" | "Hidden") => void;
	galleryOrder: number;
	sidebarPos: "Left" | "Right";
	setSidebarPos: (val: "Left" | "Right") => void;
	autoHideToolbar: boolean;
	setAutoHideToolbar: (val: boolean) => void;
	gridOpacity: number;
	setGridOpacity: (val: number) => void;
	draggingItem: string | null;
	setDraggingItem: (val: string | null) => void;
}

export const LayoutTab: React.FC<LayoutTabProps> = ({
	toolbarPos,
	setToolbarPos,
	toolbarOrder,
	galleryPos,
	setGalleryPos,
	galleryOrder,
	sidebarPos,
	setSidebarPos,
	autoHideToolbar,
	setAutoHideToolbar,
	gridOpacity,
	setGridOpacity,
	draggingItem,
	setDraggingItem,
}) => {
	const handleDragStart = (id: string) => setDraggingItem(id);
	const handleDrop = (newPos: "Top" | "Bottom") => {
		if (!draggingItem) return;
		if (draggingItem === "toolbar") setToolbarPos(newPos);
		if (draggingItem === "gallery") setGalleryPos(newPos);
		setDraggingItem(null);
	};

	const renderDraggableItem = (item: { id: string; label: string }) => (
		<button
			type="button"
			draggable
			onDragStart={() => handleDragStart(item.id)}
			className={`
        h-8 px-3 bg-accent border border-accent/20 rounded flex items-center justify-center 
        text-[9px] font-bold text-white uppercase tracking-widest shadow-lg cursor-grab active:cursor-grabbing
        transition-all duration-300 hover:scale-[1.02] active:scale-95
        ${draggingItem === item.id ? "opacity-40 scale-95 grayscale" : "opacity-100"}
      `}
		>
			{item.label}
		</button>
	);

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
			<div>
				<h4 className="text-xl font-bold text-white mb-1">Layout</h4>
				<p className="text-sm text-foreground-muted">
					Directly drag components to position them in your interface.
				</p>
			</div>

			<div className="space-y-10">
				{/* Visual Preview / Drag Interface - Full Width Row */}
				<div className="flex justify-center">
					<div className="w-full max-w-[500px] h-[380px] bg-black/40 border border-white/[0.06] rounded-3xl flex flex-col overflow-hidden shadow-2xl relative group">
						<div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

						{/* Top Drop Zone */}
						<section
							aria-label="Top drop zone"
							onDragOver={(e) => e.preventDefault()}
							onDrop={() => handleDrop("Top")}
							className={`
                flex flex-col gap-1.5 p-4 min-h-[70px] transition-colors duration-300
                ${draggingItem ? "bg-accent/[0.02] border-b border-dashed border-accent/20" : ""}
              `}
						>
							{[
								{
									id: "toolbar",
									pos: toolbarPos,
									order: toolbarOrder,
									label: "Toolbar",
								},
								{
									id: "gallery",
									pos: galleryPos,
									order: galleryOrder,
									label: "Gallery",
								},
							]
								.filter((item) => item.pos === "Top")
								.sort((a, b) => a.order - b.order)
								.map((item) => renderDraggableItem(item))}
						</section>

						{/* Center / Viewer Area */}
						<div className="flex-1 flex gap-3 px-4 py-2">
							{sidebarPos === "Left" && (
								<button
									type="button"
									onClick={() => setSidebarPos("Right")}
									className="w-16 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center text-[8px] text-foreground-muted font-bold rotate-180 [writing-mode:vertical-lr] tracking-[0.3em] cursor-pointer hover:bg-white/[0.08] hover:text-white transition-all active:scale-95"
								>
									SIDEBAR
								</button>
							)}
							<div className="flex-1 bg-white/[0.01] border border-dashed border-white/[0.05] rounded-2xl flex items-center justify-center relative overflow-hidden group/viewer">
								<div className="absolute inset-0 bg-[#0a0a0c] checkered-bg opacity-5" />
								<Eye
									size={40}
									className="text-white/[0.02] group-hover/viewer:text-accent/10 transition-colors duration-700"
								/>
							</div>
							{sidebarPos === "Right" && (
								<button
									type="button"
									onClick={() => setSidebarPos("Left")}
									className="w-16 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center text-[8px] text-foreground-muted font-bold rotate-180 [writing-mode:vertical-lr] tracking-[0.3em] cursor-pointer hover:bg-white/[0.08] hover:text-white transition-all active:scale-95"
								>
									SIDEBAR
								</button>
							)}
						</div>

						{/* Bottom Drop Zone */}
						<section
							aria-label="Bottom drop zone"
							onDragOver={(e) => e.preventDefault()}
							onDrop={() => handleDrop("Bottom")}
							className={`
                flex flex-col gap-1.5 p-4 min-h-[70px] transition-colors duration-300
                ${draggingItem ? "bg-accent/[0.02] border-t border-dashed border-accent/20" : ""}
              `}
						>
							{[
								{
									id: "toolbar",
									pos: toolbarPos,
									order: toolbarOrder,
									label: "Toolbar",
								},
								{
									id: "gallery",
									pos: galleryPos,
									order: galleryOrder,
									label: "Gallery",
								},
							]
								.filter((item) => item.pos === "Bottom")
								.sort((a, b) => a.order - b.order)
								.map((item) => renderDraggableItem(item))}
						</section>

						<div className="absolute -top-7 right-0 flex items-center gap-2 pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity">
							<div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
							<span className="text-[8px] font-bold text-white/40 uppercase tracking-[0.4em]">
								Interactive Layout Builder
							</span>
						</div>
					</div>
				</div>

				{/* Controls Row - Full Width Stack */}
				<div className="space-y-6 pt-2">
					<div className="space-y-4">
						<h5 className="text-[10px] font-bold text-foreground-muted uppercase tracking-[0.2em] px-1">
							Navigation Panels
						</h5>
						<div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6">
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<span className="text-xs font-semibold text-white">
										Auto-hide Toolbar
									</span>
									<p className="text-[10px] text-foreground-muted leading-relaxed">
										Automatically hide the main controls when inactive.
									</p>
								</div>
								<SettingToggle
									checked={autoHideToolbar}
									onChange={setAutoHideToolbar}
								/>
							</div>
						</div>
					</div>

					<div className="space-y-4">
						<h5 className="text-[10px] font-bold text-foreground-muted uppercase tracking-[0.2em] px-1">
							Viewer Experience
						</h5>
						<div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-3xl">
							<div className="flex items-center justify-between gap-10">
								<div className="space-y-1">
									<span className="text-xs font-semibold text-white">
										Grid Opacity
									</span>
									<p className="text-[10px] text-foreground-muted leading-relaxed">
										Transparency of the checkered pattern background.
									</p>
								</div>
								<div className="flex items-center gap-5 flex-1 max-w-sm">
									<input
										type="range"
										min="0"
										max="100"
										value={gridOpacity}
										onChange={(e) => setGridOpacity(Number(e.target.value))}
										className="flex-1 h-1 bg-white/[0.1] rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
									/>
									<span className="text-xs font-mono text-foreground-muted w-10 text-right">
										{gridOpacity}%
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
