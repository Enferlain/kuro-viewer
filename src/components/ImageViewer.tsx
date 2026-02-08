import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FilterType, type ViewerState } from "../types";

interface ImageViewerProps {
	src: string;
	activeFilter: FilterType;
	viewerState: ViewerState;
	setViewerState: React.Dispatch<React.SetStateAction<ViewerState>>;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
	src,
	activeFilter,
	viewerState,
	setViewerState,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

	// Function to calculate fit scale based on container and image dimensions
	const fitToView = useCallback(() => {
		const container = containerRef.current;
		const img = imgRef.current;

		if (!container || !img || img.naturalWidth === 0) return;

		const { width: containerWidth, height: containerHeight } =
			container.getBoundingClientRect();
		const padding = 48;

		const availWidth = Math.max(containerWidth - padding, 200);
		const availHeight = Math.max(containerHeight - padding, 200);

		const scaleX = availWidth / img.naturalWidth;
		const scaleY = availHeight / img.naturalHeight;

		const fitScale = Math.min(scaleX, scaleY, 1.0);

		setViewerState({
			scale: fitScale,
			translation: { x: 0, y: 0 },
		});
	}, [setViewerState]);

	// Watch for window resize to maintain fit if user hasn't zoomed manually
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new ResizeObserver(() => {
			// Only re-fit if we are currently in "fit mode" (scale was calculated or reset)
			// or if the scale is very close to the fit scale.
			// For simplicity in this rapid viewer, we maintain fit if the user hit '0' recently.
			// Here we just check if scale is 0 (pending) or if we want to enforce it.
			// A simple heuristic: if scale is 0, we fit.
			if (viewerState.scale === 0) {
				fitToView();
			}
		});

		observer.observe(container);
		return () => observer.disconnect();
	}, [viewerState.scale, fitToView]);

	// Watch for the specific "reset" signal (scale === 0) from parent
	useEffect(() => {
		if (viewerState.scale === 0) {
			fitToView();
		}
	}, [viewerState.scale, fitToView]);

	const handleWheel = (e: React.WheelEvent) => {
		const scaleFactor = 1.1;
		const delta = -e.deltaY;

		setViewerState((prev) => {
			// Don't calculate on 0 scale (loading state)
			const currentScale = prev.scale === 0 ? 1 : prev.scale;
			let newScale =
				delta > 0 ? currentScale * scaleFactor : currentScale / scaleFactor;
			newScale = Math.min(Math.max(newScale, 0.05), 50);
			return { ...prev, scale: newScale };
		});
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		if (e.button !== 0) return; // Only left click
		setIsDragging(true);
		setDragStart({
			x: e.clientX - viewerState.translation.x,
			y: e.clientY - viewerState.translation.y,
		});
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDragging) return;
		e.preventDefault();
		setViewerState((prev) => ({
			...prev,
			translation: {
				x: e.clientX - dragStart.x,
				y: e.clientY - dragStart.y,
			},
		}));
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const getFilterStyle = () => {
		switch (activeFilter) {
			case FilterType.NOISE:
				// Simulating the "Noise Map" (Difference) from the python script
				// High contrast + grayscale + invert helps highlight pixel noise/grain
				return {
					filter: "grayscale(100%) contrast(300%) brightness(0.8) invert(1)",
					mixBlendMode: "normal" as const,
				};
			case FilterType.PCA:
				// Simulating PCA Component 1 (Structural/Luminance dominance)
				// High contrast to separate features
				return {
					filter: "grayscale(100%) contrast(150%) brightness(1.1)",
				};
			default:
				return {};
		}
	};

	// Handle scale=0 (reset/loading signal) for rendering
	// If scale is 0, we render at opacity 0 to prevent FOUC until calculation is done
	const renderScale = viewerState.scale === 0 ? 0.01 : viewerState.scale;
	const isHidden = viewerState.scale === 0;

	return (
		<section
			ref={containerRef}
			aria-label="Image Viewer"
			className="flex-1 relative overflow-hidden bg-background-deep cursor-move select-none"
			onWheel={handleWheel}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
		>
			{/* Grid Background */}
			<div
				className="absolute inset-0 opacity-10 pointer-events-none"
				style={{
					backgroundImage: "radial-gradient(circle, #333 1px, transparent 1px)",
					backgroundSize: "24px 24px",
				}}
			/>

			<div
				className="absolute w-full h-full flex items-center justify-center"
				style={{
					transform: `translate3d(${viewerState.translation.x}px, ${viewerState.translation.y}px, 0) scale(${renderScale})`,
					transformOrigin: "center center",
					opacity: isHidden ? 0 : 1,
				}}
			>
				<div className="relative shadow-2xl">
					<img
						ref={imgRef}
						src={src}
						alt="View"
						className="max-w-none pointer-events-none"
						style={getFilterStyle()}
						draggable={false}
						onLoad={fitToView}
					/>
				</div>
			</div>
		</section>
	);
};
