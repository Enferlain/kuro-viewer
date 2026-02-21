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
		      w-9 h-5 rounded-full relative transition-[background-color,border-color,box-shadow] duration-[var(--ui-motion-duration-slow)] border flex items-center cursor-pointer
	      ${checked ? "bg-accent border-accent shadow-glow" : "bg-glass-bg-hover border-glass-border-hover"}
	    `}
	>
		<div
			className={`
	      w-3.5 h-3.5 rounded-full bg-accent-foreground shadow-sm transition-transform duration-[var(--ui-motion-duration-slow)]
	      ${checked ? "translate-x-[18px]" : "translate-x-0.5"}
	    `}
		/>
	</button>
);
