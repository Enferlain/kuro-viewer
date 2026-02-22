import { AlertTriangle, X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	description: string;
	confirmText?: string;
	cancelText?: string;
	isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	description,
	confirmText = "Confirm",
	cancelText = "Cancel",
	isDestructive = false,
}) => {
	// Handle Escape key to close
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[var(--ui-layer-modal)] flex items-center justify-center">
			{/* Backdrop */}
			<button
				type="button"
				className="absolute inset-0 w-full h-full bg-overlay-dim backdrop-blur-sm animate-in fade-in duration-[var(--ui-motion-duration-standard)] cursor-default"
				onClick={onClose}
				aria-label="Close dialog"
			/>

			{/* Dialog Box */}
			<div
				role="dialog"
				aria-modal="true"
				className="relative w-full max-w-sm bg-background-elevated border border-glass-border-strong rounded-xl shadow-xl p-6 animate-in zoom-in-95 fade-in duration-[var(--ui-motion-duration-standard)]"
			>
				{/* Close Button */}
				<button
					type="button"
					onClick={onClose}
					className="absolute top-4 right-4 text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
					aria-label="Close"
				>
					<X size={16} />
				</button>

				{/* Header */}
				<div className="flex flex-col items-center text-center gap-3 mb-4">
					<div
						className={`p-3 rounded-full shrink-0 ${
							isDestructive
								? "bg-destructive/10 text-destructive"
								: "bg-accent/10 text-accent"
						}`}
					>
						<AlertTriangle size={24} />
					</div>
					<h3 className="text-lg font-semibold text-foreground leading-tight mt-1">
						{title}
					</h3>
				</div>

				{/* Description */}
				<div className="mb-8 text-center px-2">
					<p className="text-sm text-foreground-muted leading-relaxed">
						{description}
					</p>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-center gap-3">
					<Button
						variant="ghost"
						onClick={onClose}
						className="text-foreground-muted hover:text-foreground h-10 px-6"
					>
						{cancelText}
					</Button>
					<Button
						variant={isDestructive ? "destructive" : "primary"}
						onClick={() => {
							onConfirm();
							onClose();
						}}
						className="h-10 px-8"
					>
						{confirmText}
					</Button>
				</div>
			</div>
		</div>
	);
};
