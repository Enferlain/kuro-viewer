import type React from "react";
import { useRef, useState } from "react";

interface VirtualizedListProps<T> {
	items: T[];
	itemHeight: number;
	renderItem: (item: T, index: number) => React.ReactNode;
	visibleCount: number;
	className?: string;
}

export function VirtualizedList<T>({
	items,
	itemHeight,
	renderItem,
	visibleCount,
	className = "",
}: VirtualizedListProps<T>) {
	const [scrollTop, setScrollTop] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	const totalHeight = items.length * itemHeight;
	const containerHeight = Math.min(items.length, visibleCount) * itemHeight;

	const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
	const endIndex = Math.min(
		items.length - 1,
		Math.floor((scrollTop + containerHeight) / itemHeight) + 2,
	);

	const visibleItems = items.slice(startIndex, endIndex + 1);

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		setScrollTop(e.currentTarget.scrollTop);
	};

	return (
		<div
			ref={containerRef}
			onScroll={handleScroll}
			className={`overflow-y-auto custom-scrollbar ${className}`}
			style={{ height: `${containerHeight}px` }}
		>
			<div style={{ height: `${totalHeight}px`, position: "relative" }}>
				{visibleItems.map((item, index) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: virtual list mapped keys
						key={startIndex + index}
						style={{
							position: "absolute",
							top: `${(startIndex + index) * itemHeight}px`,
							left: 0,
							right: 0,
							height: `${itemHeight}px`,
						}}
					>
						{renderItem(item, startIndex + index)}
					</div>
				))}
			</div>
		</div>
	);
}
