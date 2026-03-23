import type React from "react";
import { useCallback, useRef, useState } from "react";

interface DragState {
	x: number;
	y: number;
}

interface UseDragReturn {
	position: DragState;
	handlePointerDown: (event: React.PointerEvent) => void;
	resetPosition: () => void;
}

/**
 * Lightweight drag hook for making an element draggable by a handle region.
 * Uses pointer events for cross-device support. No external dependencies.
 */
export function useDrag(initial: DragState = { x: 0, y: 0 }): UseDragReturn {
	const [position, setPosition] = useState<DragState>(initial);
	const dragRef = useRef<{
		startX: number;
		startY: number;
		originX: number;
		originY: number;
	} | null>(null);

	const handlePointerDown = useCallback(
		(event: React.PointerEvent) => {
			event.preventDefault();
			const target = event.currentTarget as HTMLElement;
			target.setPointerCapture(event.pointerId);

			dragRef.current = {
				startX: event.clientX,
				startY: event.clientY,
				originX: position.x,
				originY: position.y,
			};

			const handlePointerMove = (moveEvent: PointerEvent) => {
				if (!dragRef.current) return;
				const dx = moveEvent.clientX - dragRef.current.startX;
				const dy = moveEvent.clientY - dragRef.current.startY;
				setPosition({
					x: dragRef.current.originX + dx,
					y: dragRef.current.originY + dy,
				});
			};

			const handlePointerUp = () => {
				dragRef.current = null;
				target.removeEventListener("pointermove", handlePointerMove);
				target.removeEventListener("pointerup", handlePointerUp);
			};

			target.addEventListener("pointermove", handlePointerMove);
			target.addEventListener("pointerup", handlePointerUp);
		},
		[position.x, position.y],
	);

	const resetPosition = useCallback(() => {
		setPosition(initial);
	}, [initial]);

	return { position, handlePointerDown, resetPosition };
}
