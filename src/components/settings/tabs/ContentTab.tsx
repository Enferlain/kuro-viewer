import { Database, FolderSearch, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { Button } from "../../ui/Button";
import { SettingGroup } from "../ui/SettingGroup";
import { SettingRow } from "../ui/SettingRow";
import { SettingToggle } from "../ui/SettingToggle";

interface ContentTabProps {
	libraryPaths: string[];
	setLibraryPaths: (paths: string[]) => void;
	clipEnabled: boolean;
	setClipEnabled: (val: boolean) => void;
	extractMetadata: boolean;
	setExtractMetadata: (val: boolean) => void;
}

export const ContentTab: React.FC<ContentTabProps> = ({
	libraryPaths,
	setLibraryPaths,
	clipEnabled,
	setClipEnabled,
	extractMetadata,
	setExtractMetadata,
}) => {
	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-[var(--ui-motion-duration-slow)]">
			<div>
				<h4 className="text-xl font-bold text-foreground mb-1">Content</h4>
				<p className="text-sm text-foreground-muted">
					Library monitoring paths and metadata deep-scanning features.
				</p>
			</div>

			<SettingGroup title="Library Folders" icon={<FolderSearch size={12} />}>
				<div className="px-4 py-2 space-y-2">
					{libraryPaths.map((path) => (
						<div
							key={path}
							className="flex items-center justify-between bg-glass-bg-base border border-glass-border-base rounded-lg px-3 py-2 text-sm"
						>
							<span className="text-foreground font-mono text-xs truncate max-w-[400px]">
								{path}
							</span>
							<button
								type="button"
								className="text-foreground-muted hover:text-destructive p-1 cursor-pointer transition-colors"
								onClick={() =>
									setLibraryPaths(libraryPaths.filter((p) => p !== path))
								}
							>
								<Trash2 size={14} />
							</button>
						</div>
					))}
					{libraryPaths.length === 0 && (
						<div className="text-center py-6 text-foreground-muted text-sm border border-dashed border-glass-border-subtle rounded-lg">
							No monitored folders. Add a folder to index images.
						</div>
					)}
					<div className="pt-2">
						<Button variant="secondary" className="text-xs h-8 w-full">
							<Plus size={14} className="mr-2" /> Add Folder to Library
						</Button>
					</div>
				</div>
			</SettingGroup>

			<SettingGroup title="Metadata & Scanning" icon={<Database size={12} />}>
				<SettingRow
					label="Semantic Search (CLIP)"
					description="Enable local AI model to search images by natural language descriptions. Requires background indexing."
				>
					<SettingToggle checked={clipEnabled} onChange={setClipEnabled} />
				</SettingRow>
				<SettingRow
					label="Deep Metadata Extraction"
					description="Automatically parse PNG chunks (SD/ComfyUI) and EXIF data when indexing folders."
				>
					<SettingToggle
						checked={extractMetadata}
						onChange={setExtractMetadata}
					/>
				</SettingRow>
			</SettingGroup>
		</div>
	);
};
