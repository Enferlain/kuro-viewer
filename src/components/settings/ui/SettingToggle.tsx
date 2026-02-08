import type React from "react";

export const SettingToggle: React.FC<{
	checked: boolean;
	onChange: (val: boolean) => void;
}> = ({ checked, onChange }) => (
	<button
		type="button"
		onClick={(e) => {
			e.stopPropagation();
			onChange(!checked);
		}}
		className={`
      w-9 h-5 rounded-full relative transition-all duration-300 border flex items-center
      ${checked ? "bg-accent border-accent shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]" : "bg-white/[0.05] border-white/[0.1]"}
    `}
	>
		<div
			className={`
      w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-300
      ${checked ? "translate-x-[18px]" : "translate-x-0.5"}
    `}
		/>
	</button>
);
