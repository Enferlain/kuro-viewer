import { FileImage, Plus, Settings2, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "../../ui/Button";
import { SettingGroup } from "../ui/SettingGroup";
import { SettingRow } from "../ui/SettingRow";

interface FileTypesTabProps {
	fileAssociations: string[];
	setFileAssociations: (val: string[]) => void;
}

export const FileTypesTab: React.FC<FileTypesTabProps> = ({
	fileAssociations,
	setFileAssociations,
}) => {
	const [newExt, setNewExt] = useState("");

	const handleAdd = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newExt) return;

		let formattedExt = newExt.trim().toLowerCase();
		if (!formattedExt.startsWith(".")) {
			formattedExt = `.${formattedExt}`;
		}

		if (!fileAssociations.includes(formattedExt)) {
			setFileAssociations([...fileAssociations, formattedExt].sort());
		}
		setNewExt("");
	};

	const removeExt = (extToRemove: string) => {
		setFileAssociations(fileAssociations.filter((ext) => ext !== extToRemove));
	};

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-[var(--ui-motion-duration-slow)]">
			<div>
				<h4 className="text-xl font-bold text-foreground mb-1">File Types</h4>
				<p className="text-sm text-foreground-muted">
					Manage system-level extensions and default opener associations.
				</p>
			</div>

			<SettingGroup title="Registered Formats" icon={<FileImage size={12} />}>
				<div className="px-4 py-2 space-y-4">
					<div className="flex flex-wrap gap-2">
						{fileAssociations.map((ext) => (
							<div
								key={ext}
								className="flex items-center gap-2 bg-glass-bg-base border border-glass-border-base rounded-md px-2 py-1"
							>
								<span className="text-foreground text-xs font-mono font-medium">
									{ext}
								</span>
								<button
									type="button"
									className="text-foreground-muted hover:text-destructive cursor-pointer transition-colors"
									onClick={() => removeExt(ext)}
									aria-label={`Remove ${ext}`}
								>
									<Trash2 size={12} />
								</button>
							</div>
						))}
						{fileAssociations.length === 0 && (
							<div className="text-xs text-foreground-muted w-full italic py-1">
								No extensions registered.
							</div>
						)}
					</div>

					<form
						onSubmit={handleAdd}
						className="flex gap-2 pt-2 border-t border-glass-border-subtle"
					>
						<input
							type="text"
							value={newExt}
							onChange={(e) => setNewExt(e.target.value)}
							placeholder="e.g. .arw, .dng"
							className="flex-1 bg-glass-bg-base border border-glass-border-hover rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-[border-color,background-color,box-shadow] duration-[var(--ui-motion-duration-standard)]"
						/>
						<Button
							type="submit"
							variant="secondary"
							className="text-xs px-4"
							disabled={!newExt.trim()}
						>
							<Plus size={14} className="mr-2" /> Add Format
						</Button>
					</form>
				</div>
			</SettingGroup>

			<SettingGroup title="System" icon={<Settings2 size={12} />}>
				<SettingRow
					label="Register as Windows Default Viewer"
					description="Set Kuro Viewer as the default application for all registered image formats in Windows Settings."
				>
					<Button variant="secondary" className="text-xs h-8 px-4">
						Open System Settings
					</Button>
				</SettingRow>
			</SettingGroup>
		</div>
	);
};
