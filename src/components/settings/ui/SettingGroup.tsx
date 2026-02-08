import type React from "react";

export const SettingGroup: React.FC<{
	title: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
}> = ({ title, icon, children }) => (
	<div className="space-y-3">
		<div className="flex items-center gap-2 px-1">
			{icon && <span className="text-foreground-muted">{icon}</span>}
			<h5 className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
				{title}
			</h5>
		</div>
		<div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
			{children}
		</div>
	</div>
);
