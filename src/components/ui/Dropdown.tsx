import { ChevronDown } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

export interface DropdownOption<T extends string | number> {
	label: string | ReactNode;
	value: T;
}

export interface DropdownProps<T extends string | number> {
	value: T;
	onChange: (value: T) => void;
	options: DropdownOption<T>[];
	className?: string;
	listClassName?: string;
}

export function Dropdown<T extends string | number>({
	value,
	onChange,
	options,
	className = "",
	listClassName = "",
}: DropdownProps<T>) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const selectedOption =
		options.find((opt) => opt.value === value) || options[0];

	const handleOutsideClick = useCallback((event: MouseEvent) => {
		if (
			dropdownRef.current &&
			!dropdownRef.current.contains(event.target as Node)
		) {
			setIsOpen(false);
		}
	}, []);

	useEffect(() => {
		if (isOpen) {
			document.addEventListener("mousedown", handleOutsideClick);
		} else {
			document.removeEventListener("mousedown", handleOutsideClick);
		}
		return () => {
			document.removeEventListener("mousedown", handleOutsideClick);
		};
	}, [isOpen, handleOutsideClick]);

	return (
		<div
			className={`relative ${isOpen ? "z-[var(--ui-layer-overlay)]" : "z-[var(--ui-layer-content)]"}`}
			ref={dropdownRef}
		>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={`flex items-center justify-between gap-2 bg-glass-bg-hover hover:bg-glass-bg-active border border-glass-border-hover rounded-lg text-xs text-foreground px-3 py-1.5 outline-none focus:border-accent/50 transition-[background-color,border-color,color] duration-[var(--ui-motion-duration-standard)] cursor-pointer w-full ${className}`}
			>
				<span className="truncate">{selectedOption?.label}</span>
				<ChevronDown
					size={14}
					className={`text-foreground-muted transition-transform duration-[var(--ui-motion-duration-standard)] ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen && (
				<div
					className={`absolute z-[var(--ui-layer-overlay)] top-full left-0 mt-1 w-full max-h-60 overflow-y-auto overflow-x-hidden bg-overlay-blur backdrop-blur-xl border border-glass-border-base rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-[var(--ui-motion-duration-standard)] ${listClassName}`}
				>
					{options.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => {
								onChange(opt.value);
								setIsOpen(false);
							}}
							className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer flex items-center
                ${opt.value === value ? "bg-accent/10 text-accent font-medium" : "text-foreground-muted hover:text-foreground hover:bg-glass-bg-hover"}
              `}
						>
							{opt.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
