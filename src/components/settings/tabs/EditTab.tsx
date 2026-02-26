import {
	AlertTriangle,
	ClipboardPaste,
	ExternalLink,
	FolderInput,
	Save,
	Target,
} from "lucide-react";
import type React from "react";
import { Button } from "../../ui/Button";
import { Dropdown } from "../../ui/Dropdown";
import { SettingGroup } from "../ui/SettingGroup";
import { SettingRow } from "../ui/SettingRow";
import { SettingToggle } from "../ui/SettingToggle";

export interface EditTabProps {
	confirmDelete: boolean;
	setConfirmDelete: (val: boolean) => void;
	confirmOverwrite: boolean;
	setConfirmOverwrite: (val: boolean) => void;
	defaultSaveBehavior: string;
	setDefaultSaveBehavior: (val: string) => void;
	preserveMetadata: boolean;
	setPreserveMetadata: (val: boolean) => void;
	saveAsCurrentFolder: boolean;
	setSaveAsCurrentFolder: (val: boolean) => void;
	enableClipboardPasting: boolean;
	setEnableClipboardPasting: (val: boolean) => void;
	multiFileSelection: boolean;
	setMultiFileSelection: (val: boolean) => void;
	primaryEditorPath: string;
	setPrimaryEditorPath: (val: string) => void;
	secondaryEditorPath: string;
	setSecondaryEditorPath: (val: string) => void;
	cropGridType: string;
	setCropGridType: (val: string) => void;
	preserveCropAspectRatio: boolean;
	setPreserveCropAspectRatio: (val: boolean) => void;
}

export const EditTab: React.FC<EditTabProps> = ({
	confirmDelete,
	setConfirmDelete,
	confirmOverwrite,
	setConfirmOverwrite,
	defaultSaveBehavior,
	setDefaultSaveBehavior,
	preserveMetadata,
	setPreserveMetadata,
	saveAsCurrentFolder,
	setSaveAsCurrentFolder,
	enableClipboardPasting,
	setEnableClipboardPasting,
	multiFileSelection,
	setMultiFileSelection,
	primaryEditorPath,
	setPrimaryEditorPath,
	secondaryEditorPath,
	setSecondaryEditorPath,
	cropGridType,
	setCropGridType,
	preserveCropAspectRatio,
	setPreserveCropAspectRatio,
}) => (
	<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-(--ui-motion-duration-slow)">
		<div>
			<h4 className="text-xl font-bold text-foreground mb-1">Edit & Flow</h4>
			<p className="text-sm text-foreground-muted">
				Configure saving behavior, external editors, and clipboard defaults.
			</p>
		</div>

		<SettingGroup title="File Operations" icon={<AlertTriangle size={12} />}>
			<SettingRow
				label="Confirm on Delete"
				description="Require confirmation before moving files to the trash."
			>
				<SettingToggle checked={confirmDelete} onChange={setConfirmDelete} />
			</SettingRow>
			<SettingRow
				label="Confirm on Overwrite"
				description="Require confirmation before saving over an existing image."
			>
				<SettingToggle
					checked={confirmOverwrite}
					onChange={setConfirmOverwrite}
				/>
			</SettingRow>
		</SettingGroup>

		<SettingGroup title="Save Behavior" icon={<Save size={12} />}>
			<SettingRow
				label="Default Save Action"
				description="Action triggered when saving via hotkey or the primary button."
			>
				<Dropdown
					value={defaultSaveBehavior}
					onChange={(val) => setDefaultSaveBehavior(val as string)}
					className="min-w-[180px]"
					options={[
						{ label: "Save As", value: "save_as" },
						{ label: "Save Copy (auto-increment)", value: "save_copy" },
						{ label: "Overwrite Original", value: "overwrite" },
					]}
				/>
			</SettingRow>
			<SettingRow
				label="Preserve Metadata"
				description="Keep EXIF and other embedded metadata when saving modified images."
			>
				<SettingToggle
					checked={preserveMetadata}
					onChange={setPreserveMetadata}
				/>
			</SettingRow>
			<SettingRow
				label="Contextual 'Save As'"
				description="Always open the Save Dialog in the current image's folder."
			>
				<SettingToggle
					checked={saveAsCurrentFolder}
					onChange={setSaveAsCurrentFolder}
				/>
			</SettingRow>
		</SettingGroup>

		<SettingGroup title="Core Edit (Crop)" icon={<Target size={12} />}>
			<SettingRow
				label="Crop Grid Overlay"
				description="Default overlay shown during crop commands."
			>
				<Dropdown
					value={cropGridType}
					onChange={(val) => setCropGridType(val as string)}
					className="min-w-[180px]"
					options={[
						{ label: "Rule of Thirds", value: "thirds" },
						{ label: "Golden Ratio", value: "golden" },
						{ label: "Center Cross", value: "center" },
						{ label: "None", value: "none" },
					]}
				/>
			</SettingRow>
			<SettingRow
				label="Preserve Aspect Ratio"
				description="Lock crop handles to the source image's original ratio by default."
			>
				<SettingToggle
					checked={preserveCropAspectRatio}
					onChange={setPreserveCropAspectRatio}
				/>
			</SettingRow>
		</SettingGroup>

		<SettingGroup
			title="Clipboard & Selection"
			icon={<ClipboardPaste size={12} />}
		>
			<SettingRow
				label="Enable Image Pasting"
				description="Paste copied images (Ctrl+V) directly into the viewer."
			>
				<SettingToggle
					checked={enableClipboardPasting}
					onChange={setEnableClipboardPasting}
				/>
			</SettingRow>
			<SettingRow
				label="Multi-File Selection"
				description="Allow selecting multiple items in the gallery or grid for bulk operations."
			>
				<SettingToggle
					checked={multiFileSelection}
					onChange={setMultiFileSelection}
				/>
			</SettingRow>
		</SettingGroup>

		<SettingGroup title="External Editors" icon={<ExternalLink size={12} />}>
			<SettingRow
				label="Primary Application"
				description="Default app used for 'Edit in...' actions (e.g., Photoshop.exe)."
			>
				<div className="flex w-full gap-2 items-center">
					<input
						type="text"
						value={primaryEditorPath}
						onChange={(e) => setPrimaryEditorPath(e.target.value)}
						placeholder="C:\Path\To\Editor.exe"
						className="flex-1 bg-glass-bg-subtle border border-glass-border-base rounded-xl px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-glass-border-focus focus:ring-1 focus:ring-glass-border-focus transition-all duration-(--ui-motion-duration-standard)"
					/>
					<Button
						variant="secondary"
						className="h-[34px] px-3 border-glass-border-base"
						title="Browse..."
					>
						<FolderInput size={14} className="opacity-70" />
					</Button>
				</div>
			</SettingRow>
			<SettingRow
				label="Secondary Application"
				description="Optional backup editor (e.g., GIMP, MS Paint)."
			>
				<div className="flex w-full gap-2 items-center">
					<input
						type="text"
						value={secondaryEditorPath}
						onChange={(e) => setSecondaryEditorPath(e.target.value)}
						placeholder="Optional path..."
						className="flex-1 bg-glass-bg-subtle border border-glass-border-base rounded-xl px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-glass-border-focus focus:ring-1 focus:ring-glass-border-focus transition-all duration-(--ui-motion-duration-standard)"
					/>
					<Button
						variant="secondary"
						className="h-[34px] px-3 border-glass-border-base"
						title="Browse..."
					>
						<FolderInput size={14} className="opacity-70" />
					</Button>
				</div>
			</SettingRow>
		</SettingGroup>
	</div>
);
