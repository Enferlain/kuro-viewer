import type React from "react";

export const SettingRow: React.FC<{
	label: string;
	description?: string;
	disabled?: boolean;
	children: React.ReactNode;
	onClick?: () => void;
}> = ({ label, description, disabled, children, onClick }) => (
	<section
		className={`flex items-center justify-between p-4 group transition-[background-color,opacity,filter] duration-[var(--ui-motion-duration-standard)] ${onClick && !disabled ? "cursor-pointer hover:bg-glass-bg-base" : ""} ${disabled ? "opacity-50 pointer-events-none grayscale-50" : ""}`}
		onClick={disabled ? undefined : onClick}
		onKeyDown={(e) =>
			!disabled && onClick && (e.key === "Enter" || e.key === " ") && onClick()
		}
		aria-label={label}
		tabIndex={onClick && !disabled ? 0 : undefined}
	>
		<div className="flex flex-col gap-0.5">
			<span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
				{label}
			</span>
			{description && (
				<span className="text-[11px] text-foreground-muted leading-relaxed max-w-[400px]">
					{description}
				</span>
			)}
		</div>
		<div className="flex-none ml-6">{children}</div>
	</section>
);
