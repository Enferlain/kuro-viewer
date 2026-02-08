import {
	Check,
	ChevronDown,
	ChevronRight,
	Copy,
	Download,
	Search,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageMetadata } from "../types";
import { Button } from "./Button";

interface MetadataModalProps {
	isOpen: boolean;
	onClose: () => void;
	filename: string;
	data: ImageMetadata;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({
	isOpen,
	onClose,
	filename,
	data,
}) => {
	const [isVisible, setIsVisible] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
		new Set(),
	);
	const [copiedKey, setCopiedKey] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isOpen) {
			setIsVisible(true);
			setSearchQuery("");
			// Delay focus slightly to prevent the 'x' keystroke that opened the modal
			// from being typed into the search field.
			const timer = setTimeout(() => {
				inputRef.current?.focus();
			}, 50);
			return () => clearTimeout(timer);
		} else {
			const timer = setTimeout(() => setIsVisible(false), 200);
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	const toggleGroup = (groupId: string) => {
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(groupId)) next.delete(groupId);
			else next.add(groupId);
			return next;
		});
	};

	const handleCopy = (text: string, key: string) => {
		navigator.clipboard.writeText(text);
		setCopiedKey(key);
		setTimeout(() => setCopiedKey(null), 1500);
	};

	const handleExport = () => {
		// Flatten data for simple export
		const exportObj: Record<
			string,
			Record<string, string | number | boolean>
		> = {};
		data.forEach((group) => {
			exportObj[group.label] = {};
			group.entries.forEach((entry) => {
				exportObj[group.label][entry.key] = entry.value;
			});
		});

		const blob = new Blob([JSON.stringify(exportObj, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${filename}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// Filter logic
	const filteredData = useMemo(() => {
		if (!searchQuery.trim()) return data;
		const lowerQuery = searchQuery.toLowerCase();

		return data
			.map((group) => ({
				...group,
				entries: group.entries.filter(
					(entry) =>
						entry.key.toLowerCase().includes(lowerQuery) ||
						String(entry.value).toLowerCase().includes(lowerQuery),
				),
			}))
			.filter((group) => group.entries.length > 0);
	}, [data, searchQuery]);

	if (!isVisible && !isOpen) return null;

	return (
		<div
			className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-200 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
		>
			{/* Backdrop */}
			<button
				type="button"
				className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 w-full h-full border-none p-0 m-0"
				onClick={onClose}
				aria-label="Close modal"
			/>

			{/* Modal Window */}
			<div
				className={`
          relative w-full max-w-2xl h-[85vh] bg-[#0a0a0c] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col
          transform transition-all duration-300 ease-out
          ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}
        `}
			>
				{/* Header */}
				<div className="flex-none px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
					<div className="flex flex-col overflow-hidden">
						<h3 className="text-sm font-semibold text-foreground tracking-tight">
							Image Inspector
						</h3>
						<span className="text-xs text-foreground-muted font-mono mt-0.5 truncate">
							{filename}
						</span>
					</div>
					<Button
						variant="icon"
						onClick={onClose}
						className="hover:bg-white/[0.08]"
					>
						<X size={18} />
					</Button>
				</div>

				{/* Toolbar / Search */}
				<div className="flex-none px-6 py-3 border-b border-white/[0.06] bg-[#0a0a0c] flex gap-3">
					<div className="relative flex-1">
						<Search
							size={14}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
						/>
						<input
							ref={inputRef}
							type="text"
							placeholder="Filter tags..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent/50 focus:bg-white/[0.05] transition-all"
						/>
					</div>
					<Button
						variant="secondary"
						onClick={handleExport}
						className="gap-2"
						tooltip="Export as JSON"
					>
						<Download size={14} />
						<span className="hidden sm:inline">Export</span>
					</Button>
				</div>

				{/* Content (Scrollable) */}
				<div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-6 space-y-6">
					{filteredData.length > 0 ? (
						filteredData.map((group) => (
							<div key={group.id} className="group-section">
								{/* Group Header */}
								<button
									type="button"
									onClick={() => toggleGroup(group.id)}
									className="flex items-center gap-2 w-full text-left mb-3 hover:text-foreground transition-colors group"
								>
									{collapsedGroups.has(group.id) ? (
										<ChevronRight
											size={14}
											className="text-foreground-muted group-hover:text-foreground"
										/>
									) : (
										<ChevronDown
											size={14}
											className="text-foreground-muted group-hover:text-foreground"
										/>
									)}
									<span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted group-hover:text-foreground">
										{group.label}
									</span>
									<span className="text-[10px] bg-white/[0.05] px-1.5 py-0.5 rounded-full text-foreground-subtle font-mono">
										{group.entries.length}
									</span>
								</button>

								{/* Group Entries */}
								{!collapsedGroups.has(group.id) && (
									<div className="grid gap-px bg-white/[0.04] border border-white/[0.04] rounded-lg overflow-hidden">
										{group.entries.map((entry, idx) => (
											<div
												key={`${group.id}-${entry.key}-${idx}`}
												className="flex flex-col sm:flex-row bg-[#0a0a0c] group/row relative"
											>
												{/* Key Column */}
												<div className="w-full sm:w-48 p-3 sm:py-2 sm:px-4 bg-white/[0.01] border-b sm:border-b-0 sm:border-r border-white/[0.04] flex items-center">
													<span className="text-xs text-foreground-muted font-medium break-words">
														{entry.key}
													</span>
												</div>

												{/* Value Column */}
												<div className="flex-1 p-3 sm:py-2 sm:px-4 flex items-center relative min-w-0 pr-12">
													<div
														className={`text-xs font-mono text-foreground/90 ${entry.isLong ? "whitespace-pre-wrap break-words leading-relaxed py-1" : "truncate"}`}
													>
														{entry.value}
													</div>

													{/* Copy Action (Visible on Hover) */}
													<div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity bg-[#0a0a0c] shadow-xl rounded-md">
														<Button
															variant="icon"
															className="h-7 w-7"
															onClick={() =>
																handleCopy(
																	String(entry.value),
																	`${group.id}-${entry.key}`,
																)
															}
															tooltip="Copy Value"
														>
															{copiedKey === `${group.id}-${entry.key}` ? (
																<Check
																	size={12}
																	className="text-status-success"
																/>
															) : (
																<Copy size={12} />
															)}
														</Button>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						))
					) : (
						<div className="flex flex-col items-center justify-center h-48 text-foreground-subtle">
							<Search size={32} className="opacity-20 mb-4" />
							<p>No tags found matching "{searchQuery}"</p>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex-none px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] flex justify-between items-center">
					<span className="text-[10px] text-foreground-subtle">
						{filteredData.reduce((acc, g) => acc + g.entries.length, 0)} tags
						visible
					</span>
					<Button variant="secondary" onClick={onClose}>
						Close
					</Button>
				</div>
			</div>
		</div>
	);
};
