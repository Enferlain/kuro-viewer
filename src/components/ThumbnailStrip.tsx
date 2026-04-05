import type React from "react";
import { useEffect, useRef } from "react";
import type { ImageFile } from "../types";
import { createInspectTargetAttrs } from "./devtools/inspectTargets";

interface ThumbnailStripProps {
	images: ImageFile[];
	selectedIndex: number;
	onSelect: (index: number) => void;
}

export const ThumbnailStrip: React.FC<ThumbnailStripProps> = ({
	images,
	selectedIndex,
	onSelect,
}) => {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to selected thumbnail
	useEffect(() => {
		if (scrollContainerRef.current) {
			const selectedElement = scrollContainerRef.current.children[
				selectedIndex
			] as HTMLElement;
			if (selectedElement) {
				selectedElement.scrollIntoView({
					behavior: "smooth",
					block: "nearest",
					inline: "center",
				});
			}
		}
	}, [selectedIndex]);

	return (
		<div
			{...createInspectTargetAttrs({
				label: "Thumbnail Strip",
				sourcePath: "src/components/ThumbnailStrip.tsx",
				sourceLine: 36,
				kind: "host-component",
				area: "gallery",
			})}
			className="h-[var(--spacing-thumbnail-strip)] bg-background-base border-t border-glass-border-base flex items-center px-4 relative z-[var(--ui-layer-chrome)]"
		>
			<div
				ref={scrollContainerRef}
				className="flex gap-3 overflow-x-auto w-full h-full items-center no-scrollbar pb-1"
				style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
			>
				{images.map((img, idx) => {
					const isSelected = idx === selectedIndex;
					return (
						<button
							type="button"
							key={img.id}
							onClick={() => onSelect(idx)}
							className={`relative shrink-0 overflow-hidden cursor-pointer transition-[transform,opacity,border-color] duration-[var(--ui-motion-duration-standard)] rounded-md border-2 h-[var(--spacing-thumbnail-card-height)] w-[var(--spacing-thumbnail-card-width)]
                ${
									isSelected
										? "border-accent ring-2 ring-accent/30 opacity-100 scale-105"
										: "border-glass-border-strong opacity-60 hover:opacity-100 hover:border-glass-border-focus"
								}
              `}
						>
							<img
								src={img.url}
								alt={img.name}
								className="h-full w-full object-cover"
								loading="lazy"
							/>
							{isSelected && (
								<div className="absolute inset-0 bg-accent/10 pointer-events-none" />
							)}
						</button>
					);
				})}
			</div>

			{/* Gradients to indicate scrolling */}
			<div className="absolute left-0 top-0 h-full w-12 bg-linear-to-r from-background-base to-transparent pointer-events-none z-[var(--ui-layer-content)]" />
			<div className="absolute right-0 top-0 h-full w-12 bg-linear-to-l from-background-base to-transparent pointer-events-none z-[var(--ui-layer-content)]" />
		</div>
	);
};
