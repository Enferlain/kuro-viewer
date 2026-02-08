import type React from "react";
import { useEffect, useRef } from "react";
import type { ImageFile } from "../types";

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
		<div className="h-24 bg-background-base border-t border-white/[0.06] flex items-center px-4 relative z-40">
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
							className={`
                group relative flex-shrink-0 h-16 w-24 rounded-lg overflow-hidden transition-all duration-200
                border 
                ${
									isSelected
										? "border-accent ring-2 ring-accent/30 opacity-100 scale-105"
										: "border-white/[0.1] opacity-60 hover:opacity-100 hover:border-white/[0.3]"
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
			<div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background-base to-transparent pointer-events-none" />
			<div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background-base to-transparent pointer-events-none" />
		</div>
	);
};
