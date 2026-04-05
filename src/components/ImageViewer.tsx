import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ViewerState } from "../types";
import { createInspectTargetAttrs } from "./devtools/inspectTargets";

interface ImageViewerProps {
	src: string;
	viewerState: ViewerState;
	setViewerState: React.Dispatch<React.SetStateAction<ViewerState>>;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
	src,
	viewerState,
	setViewerState,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [isSpacePressed, setIsSpacePressed] = useState(false);
	const [isMouseDown, setIsMouseDown] = useState(false);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.code === "Space") {
				event.preventDefault();
				setIsSpacePressed(true);
			}
		};
		const handleKeyUp = (event: KeyboardEvent) => {
			if (event.code === "Space") {
				setIsSpacePressed(false);
				setIsDragging(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, []);

	const fitToView = useCallback(() => {
		const container = containerRef.current;
		const img = imgRef.current;

		if (!container || !img || img.naturalWidth === 0) return;

		const { width: containerWidth, height: containerHeight } =
			container.getBoundingClientRect();
		const availWidth = Math.max(containerWidth, 200);
		const availHeight = Math.max(containerHeight, 200);

		const scaleX = availWidth / img.naturalWidth;
		const scaleY = availHeight / img.naturalHeight;
		const fitScale = Math.min(scaleX, scaleY, 1.0);

		setViewerState({
			scale: fitScale,
			translation: { x: 0, y: 0 },
			isFit: true,
		});
	}, [setViewerState]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new ResizeObserver(() => {
			if (viewerState.scale === 0 || viewerState.isFit) {
				fitToView();
			}
		});

		observer.observe(container);
		return () => observer.disconnect();
	}, [viewerState.scale, viewerState.isFit, fitToView]);

	useEffect(() => {
		if (viewerState.scale === 0) {
			fitToView();
		}
	}, [viewerState.scale, fitToView]);

	const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
		const container = containerRef.current;
		if (!container) return;

		const scaleFactor = 1.1;
		const delta = -event.deltaY;
		const currentScale = viewerState.scale === 0 ? 1 : viewerState.scale;
		let newScale =
			delta > 0 ? currentScale * scaleFactor : currentScale / scaleFactor;
		newScale = Math.min(Math.max(newScale, 0.05), 50);

		if (newScale === currentScale) return;

		const rect = container.getBoundingClientRect();
		const cursorX = event.clientX - rect.left - rect.width / 2;
		const cursorY = event.clientY - rect.top - rect.height / 2;
		const ratio = 1 - newScale / currentScale;
		const dx = (cursorX - viewerState.translation.x) * ratio;
		const dy = (cursorY - viewerState.translation.y) * ratio;

		setViewerState((prev) => ({
			...prev,
			scale: newScale,
			translation: {
				x: prev.translation.x + dx,
				y: prev.translation.y + dy,
			},
			isFit: false,
		}));
	};

	const handleMouseDown = (event: React.MouseEvent) => {
		if (event.button !== 0) return;
		setIsMouseDown(true);
		if (isSpacePressed) {
			event.preventDefault();
			setIsDragging(true);
			setDragStart({
				x: event.clientX - viewerState.translation.x,
				y: event.clientY - viewerState.translation.y,
			});
		}
	};

	const handleMouseMove = (event: React.MouseEvent) => {
		if (!isDragging) return;
		event.preventDefault();
		setViewerState((prev) => ({
			...prev,
			translation: {
				x: event.clientX - dragStart.x,
				y: event.clientY - dragStart.y,
			},
			isFit: false,
		}));
	};

	const handleMouseUp = () => {
		setIsMouseDown(false);
		setIsDragging(false);
	};

	const renderScale = viewerState.scale === 0 ? 0.01 : viewerState.scale;
	const isHidden = viewerState.scale === 0;

	return (
		<section
			ref={containerRef}
			aria-label="Image Viewer"
			{...createInspectTargetAttrs({
				label: "Image Viewer",
				sourcePath: "src/components/ImageViewer.tsx",
				sourceLine: 154,
				kind: "host-component",
				area: "viewer",
			})}
			className="flex-1 relative overflow-hidden bg-background-deep select-none"
			style={{
				cursor: isSpacePressed
					? isMouseDown
						? "grabbing"
						: "grab"
					: "default",
			}}
			onWheel={handleWheel}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
		>
			<div
				className="absolute inset-0 opacity-10 pointer-events-none"
				style={{
					backgroundImage:
						"radial-gradient(circle, var(--color-border-subtle) 1px, transparent 1px)",
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
				<div className="relative shadow-xl">
					<img
						ref={imgRef}
						src={src}
						alt="View"
						className="max-w-none pointer-events-none"
						crossOrigin="anonymous"
						draggable={false}
						onLoad={fitToView}
					/>
				</div>
			</div>
		</section>
	);
};
