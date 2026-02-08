import type React from "react";

interface CategoryStubProps {
	label: string;
	description?: string;
	icon?: React.ReactNode;
}

export const CategoryStub: React.FC<CategoryStubProps> = ({
	label,
	description = "This category is currently under development.",
	icon,
}) => (
	<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
		<div className="flex flex-col gap-1">
			<div className="flex items-center gap-3">
				{icon && <div className="text-foreground-muted">{icon}</div>}
				<h4 className="text-xl font-bold text-white tracking-tight">{label}</h4>
			</div>
			<p className="text-sm text-foreground-muted">{description}</p>
		</div>

		<div className="p-12 border border-dashed border-white/[0.08] rounded-3xl flex flex-col items-center justify-center gap-4 bg-white/[0.01]">
			<div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center text-foreground-muted">
				{icon}
			</div>
			<div className="text-center">
				<p className="text-sm text-white font-medium mb-1">Coming Soon</p>
				<p className="text-xs text-foreground-muted max-w-[240px] leading-relaxed">
					We're working on making this section high-fidelity. Stay tuned for
					updates!
				</p>
			</div>
		</div>
	</div>
);
