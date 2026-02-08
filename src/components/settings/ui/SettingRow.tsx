import type React from "react";

export const SettingRow: React.FC<{
	label: string;
	description?: string;
	children: React.ReactNode;
	onClick?: () => void;
}> = ({ label, description, children, onClick }) => (
	<section
		className={`flex items-center justify-between p-4 group transition-colors duration-200 ${onClick ? "cursor-pointer hover:bg-white/[0.02]" : ""}`}
		onClick={onClick}
		onKeyDown={(e) =>
			onClick && (e.key === "Enter" || e.key === " ") && onClick()
		}
		aria-label={label}
		tabIndex={onClick ? 0 : undefined}
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
