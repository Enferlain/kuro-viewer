import type React from "react";

export const SettingRow: React.FC<{
	id?: string;
	label: string;
	description?: string;
	disabled?: boolean;
	children: React.ReactNode;
	onClick?: () => void;
}> = ({ id, label, description, disabled, children, onClick }) => (
	<section
		id={id}
		className={`flex items-center justify-between p-4 group transition-[background-color,opacity,filter,box-shadow,transform] duration-(--ui-motion-duration-standard)
			${onClick && !disabled ? "cursor-pointer hover:bg-glass-bg-base" : ""} 
			${disabled ? "opacity-50 pointer-events-none grayscale-50" : ""}
			data-[highlight=true]:bg-accent/10 data-[highlight=true]:shadow-glow data-[highlight=true]:border data-[highlight=true]:border-accent/40 data-[highlight=true]:rounded-xl data-[highlight=true]:scale-[1.01]`}
		onClick={disabled ? undefined : onClick}
		onKeyDown={(e) =>
			!disabled && onClick && (e.key === "Enter" || e.key === " ") && onClick()
		}
		aria-label={label}
		tabIndex={onClick && !disabled ? 0 : undefined}
	>
		<div className="flex flex-col gap-0.5">
			<span className="text-sm font-medium text-foreground group-hover:text-foreground-hover transition-colors">
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
