import type React from "react";
import { useCallback, useRef, useState } from "react";

interface DragState {
	x: number;
	y: number;
}

interface UseDragReturn {
	badgeRef: React.RefObject<HTMLDivElement | null>;
	panelRef: React.RefObject<HTMLDivElement | null>;
	position: DragState;
	handlePointerDown: (event: React.PointerEvent) => void;
	handlePointerDownOrClick: (
		event: React.PointerEvent,
		onClick: () => void,
	) => void;
	resetPosition: () => void;
}

/**
 * Lightweight drag hook for making an element draggable by a handle region.
 * Uses pointer events for cross-device support. No external dependencies.
 */
export function useDrag(initial: DragState = { x: 0, y: 0 }): UseDragReturn {
	const [position, setPosition] = useState<DragState>(initial);
	const badgeRef = useRef<HTMLDivElement | null>(null);
	const panelRef = useRef<HTMLDivElement | null>(null);
	const positionRef = useRef<DragState>(initial);
	const dragRef = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		originX: number;
		originY: number;
		didDrag: boolean;
		nextX: number;
		nextY: number;
	} | null>(null);
	const DRAG_THRESHOLD = 4;

	const applyPositionToElements = useCallback((nextPosition: DragState) => {
		positionRef.current = nextPosition;
		const transform = `translate3d(${nextPosition.x}px, ${nextPosition.y}px, 0)`;
		if (badgeRef.current) {
			badgeRef.current.style.transform = transform;
		}
		if (panelRef.current) {
			panelRef.current.style.transform = transform;
		}
	}, []);

	const beginPointerSession = useCallback(
		(event: React.PointerEvent, onClick?: () => void) => {
			if (event.pointerType === "mouse" && event.button !== 0) {
				return;
			}

			event.preventDefault();
			const target = event.currentTarget as HTMLElement;
			target.setPointerCapture(event.pointerId);

			dragRef.current = {
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
				originX: positionRef.current.x,
				originY: positionRef.current.y,
				didDrag: false,
				nextX: positionRef.current.x,
				nextY: positionRef.current.y,
			};

			const cleanup = () => {
				dragRef.current = null;
				window.removeEventListener("pointermove", handlePointerMove);
				window.removeEventListener("pointerup", handlePointerUp);
				window.removeEventListener("pointercancel", handlePointerCancel);
				try {
					target.releasePointerCapture(event.pointerId);
				} catch {
					// Pointer capture may already be released; ignore.
				}
			};

			const handlePointerMove = (moveEvent: PointerEvent) => {
				if (
					!dragRef.current ||
					moveEvent.pointerId !== dragRef.current.pointerId
				) {
					return;
				}

				const dx = moveEvent.clientX - dragRef.current.startX;
				const dy = moveEvent.clientY - dragRef.current.startY;
				if (!dragRef.current.didDrag && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
					dragRef.current.didDrag = true;
				}

				if (!dragRef.current.didDrag) {
					return;
				}

				dragRef.current.nextX = dragRef.current.originX + dx;
				dragRef.current.nextY = dragRef.current.originY + dy;
				applyPositionToElements({
					x: dragRef.current.nextX,
					y: dragRef.current.nextY,
				});
			};

			const handlePointerUp = (upEvent: PointerEvent) => {
				if (
					!dragRef.current ||
					upEvent.pointerId !== dragRef.current.pointerId
				) {
					return;
				}

				const didDrag = dragRef.current.didDrag;
				const finalPosition = {
					x: dragRef.current.nextX,
					y: dragRef.current.nextY,
				};
				cleanup();
				if (didDrag) {
					setPosition(finalPosition);
				} else {
					onClick?.();
				}
			};

			const handlePointerCancel = (cancelEvent: PointerEvent) => {
				if (
					!dragRef.current ||
					cancelEvent.pointerId !== dragRef.current.pointerId
				) {
					return;
				}
				cleanup();
			};

			window.addEventListener("pointermove", handlePointerMove);
			window.addEventListener("pointerup", handlePointerUp);
			window.addEventListener("pointercancel", handlePointerCancel);
		},
		[applyPositionToElements],
	);

	const handlePointerDown = useCallback(
		(event: React.PointerEvent) => {
			beginPointerSession(event);
		},
		[beginPointerSession],
	);

	const handlePointerDownOrClick = useCallback(
		(event: React.PointerEvent, onClick: () => void) => {
			beginPointerSession(event, onClick);
		},
		[beginPointerSession],
	);

	const resetPosition = useCallback(() => {
		applyPositionToElements(initial);
		setPosition(initial);
	}, [applyPositionToElements, initial]);

	return {
		badgeRef,
		panelRef,
		position,
		handlePointerDown,
		handlePointerDownOrClick,
		resetPosition,
	};
}
