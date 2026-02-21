import type React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "ghost" | "icon" | "destructive";
	active?: boolean;
	tooltip?: string;
}

export const Button: React.FC<ButtonProps> = ({
	children,
	className = "",
	variant = "secondary",
	active = false,
	tooltip,
	...props
}) => {
	const baseStyles =
		"relative inline-flex items-center justify-center rounded-lg transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-[var(--ui-motion-duration-standard)] ease-[var(--ease-decelerate)] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

	const variants = {
		primary:
			"bg-accent text-white shadow-glow hover:bg-accent-bright active:scale-[0.98]",
		secondary: `bg-glass-bg-hover border border-glass-border-base text-foreground hover:bg-glass-bg-active hover:border-glass-border-hover shadow-sm active:scale-[0.98] ${active ? "bg-accent/20 border-accent/50 text-accent-bright" : ""}`,
		ghost:
			"bg-transparent text-foreground-muted hover:text-foreground hover:bg-glass-bg-hover",
		icon: `p-2 rounded-md hover:bg-glass-bg-strong text-foreground-muted hover:text-foreground transition-colors ${active ? "text-accent-bright bg-accent/10" : ""}`,
		destructive:
			"bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 hover:border-destructive/30 hover:text-destructive-hover shadow-sm active:scale-[0.98]",
	};

	const sizes = variant === "icon" ? "" : "px-3 py-1.5 text-sm font-medium";

	return (
		<button
			className={`${baseStyles} ${variants[variant]} ${sizes} ${className}`}
			title={tooltip}
			{...props}
		>
			{children}
			{active && variant !== "primary" && (
				<span className="absolute inset-0 rounded-lg ring-1 ring-accent/30 pointer-events-none animate-pulse" />
			)}
		</button>
	);
};
