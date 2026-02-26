import { ChevronRight, Search } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SettingCategory } from "./SettingsModal";
import { SETTINGS_INDEX, type SettingIndexEntry } from "./searchIndex";

interface SettingsSearchProps {
	onSelect: (category: SettingCategory, id: string) => void;
}

export const SettingsSearch: React.FC<SettingsSearchProps> = ({ onSelect }) => {
	const [query, setQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const wrapperRef = useRef<HTMLDivElement>(null);

	// Filter results based on label, category, and keywords
	const results = useMemo(() => {
		if (!query.trim()) return [];

		const lowerQuery = query.toLowerCase();
		return SETTINGS_INDEX.filter((item) => {
			const textMatch = item.label.toLowerCase().includes(lowerQuery);
			const catMatch = item.category.toLowerCase().includes(lowerQuery);
			const keywordMatch = item.keywords.some((k) =>
				k.toLowerCase().includes(lowerQuery),
			);
			return textMatch || catMatch || keywordMatch;
		}).slice(0, 8); // Cap at 8 results
	}, [query]);

	// Close on click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Keyboard Navigation
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!isOpen || results.length === 0) return;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setSelectedIndex((prev) => (prev + 1) % results.length);
				break;
			case "ArrowUp":
				e.preventDefault();
				setSelectedIndex(
					(prev) => (prev - 1 + results.length) % results.length,
				);
				break;
			case "Enter":
				e.preventDefault();
				handleSelect(results[selectedIndex]);
				break;
			case "Escape":
				setIsOpen(false);
				break;
		}
	};

	const handleSelect = (item: SettingIndexEntry) => {
		onSelect(item.category, item.id);
		setIsOpen(false);
		setQuery("");
	};

	return (
		<div className="relative z-50" ref={wrapperRef}>
			<div className="relative group w-64">
				<Search
					size={14}
					className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted group-focus-within:text-accent transition-[color]"
				/>
				<input
					type="text"
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setIsOpen(true);
						setSelectedIndex(0);
					}}
					onFocus={() => {
						if (query) setIsOpen(true);
					}}
					onKeyDown={handleKeyDown}
					placeholder="Search settings..."
					className="w-full bg-glass-bg-subtle border border-glass-border-base rounded-full pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-glass-border-focus focus:ring-1 focus:ring-glass-border-focus transition-all duration-(--)"
				/>
			</div>

			{isOpen && results.length > 0 && (
				<div className="absolute top-full left-0 mt-1 w-72 bg-overlay-blur backdrop-blur-xl border border-glass-border-base rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-(--)">
					<div>
						{results.map((item, i) => (
							<button
								key={item.id}
								type="button"
								onClick={() => handleSelect(item)}
								className={`
                  w-full text-left px-3 py-2 flex items-center justify-between group cursor-pointer 
                  transition-all duration-(--)
                  ${i === selectedIndex ? "bg-accent/10" : "hover:bg-glass-bg-hover"}
                `}
							>
								<div className="flex flex-col gap-0.5 min-w-0">
									<span
										className={`text-xs font-medium truncate ${i === selectedIndex ? "text-accent" : "text-foreground-secondary group-hover:text-foreground"}`}
									>
										{item.label}
									</span>
									<span className="text-[10px] text-foreground-subtle capitalize tracking-wide">
										{item.category}
									</span>
								</div>
								<ChevronRight
									size={12}
									className={`shrink-0 transition-transform ${i === selectedIndex ? "text-accent translate-x-0" : "text-transparent -translate-x-2 group-hover:text-foreground-muted group-hover:translate-x-0"}`}
								/>
							</button>
						))}
					</div>
				</div>
			)}
			{isOpen && query && results.length === 0 && (
				<div className="absolute top-full left-0 mt-1 w-72 bg-overlay-blur backdrop-blur-xl border border-glass-border-base rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-(--)">
					<div className="py-4 text-center px-4">
						<span className="text-xs text-foreground-muted">
							No settings found for "{query}".
						</span>
					</div>
				</div>
			)}
		</div>
	);
};
