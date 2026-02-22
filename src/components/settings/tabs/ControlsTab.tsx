import { Keyboard, MousePointer2, Shuffle } from "lucide-react";
import { type FC, useCallback, useEffect, useState } from "react";
import type { Keybind, MouseAction } from "../../../types";
import { Button } from "../../ui/Button";
import { Dropdown } from "../../ui/Dropdown";
import { SettingGroup } from "../ui/SettingGroup";
import { SettingRow } from "../ui/SettingRow";
import { SettingToggle } from "../ui/SettingToggle";

interface ControlsTabProps {
	// Mouse
	primaryScroll: MouseAction;
	setPrimaryScroll: (val: MouseAction) => void;
	middleClick: MouseAction;
	setMiddleClick: (val: MouseAction) => void;
	invertScroll: boolean;
	setInvertScroll: (val: boolean) => void;

	// Modifiers
	ctrlScroll: MouseAction;
	setCtrlScroll: (val: MouseAction) => void;
	shiftScroll: MouseAction;
	setShiftScroll: (val: MouseAction) => void;
	spacebarAction: MouseAction;
	setSpacebarAction: (val: MouseAction) => void;

	// Keyboard
	keybinds: Keybind[];
	setKeybinds: (val: Keybind[]) => void;
}

const actionOptions: { label: string; value: MouseAction }[] = [
	{ label: "Zoom In/Out", value: "Zoom" },
	{ label: "Previous/Next Image", value: "Next/Prev Image" },
	{ label: "Vertical Pan", value: "Vertical Pan" },
	{ label: "Horizontal Pan", value: "Horizontal Pan" },
	{ label: "Reset Zoom", value: "Reset Zoom" },
	{ label: "Fit to Screen", value: "Fit to Screen" },
	{ label: "Toggle Fullscreen", value: "Toggle Fullscreen" },
	{ label: "Toggle Metadata", value: "Toggle Metadata" },
	{ label: "Toggle Toolbar", value: "Toggle Toolbar" },
	{ label: "Play/Pause Slideshow", value: "Play/Pause Slideshow" },
	{ label: "Pan Mode/Drag", value: "Drag/Pan Mode" },
];

const KeyRecorder: FC<{
	currentKey: string;
	onRecord: (key: string) => void;
}> = ({ currentKey, onRecord }) => {
	const [listening, setListening] = useState(false);

	useEffect(() => {
		if (!listening) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();

			// Format key nicely
			let keyName = e.key;
			if (keyName === " ") keyName = "Space";
			if (keyName.length === 1) keyName = keyName.toUpperCase();
			if (keyName === "ArrowRight") keyName = "Right";
			if (keyName === "ArrowLeft") keyName = "Left";
			if (keyName === "ArrowUp") keyName = "Up";
			if (keyName === "ArrowDown") keyName = "Down";

			// Don't record bare modifiers unless that's what we strictly want, but keep it simple for now
			if (["Control", "Alt", "Shift", "Meta"].includes(keyName)) return;

			// Add modifiers
			const modifiers = [];
			if (e.ctrlKey) modifiers.push("Ctrl");
			if (e.altKey) modifiers.push("Alt");
			if (e.shiftKey) modifiers.push("Shift");

			const finalKey =
				modifiers.length > 0 ? `${modifiers.join("+")}+${keyName}` : keyName;

			onRecord(finalKey);
			setListening(false);
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () =>
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
	}, [listening, onRecord]);

	return (
		<Button
			variant={listening ? "primary" : "secondary"}
			className={`
	        min-w-[48px] h-8 px-3 justify-center transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--ui-motion-duration-standard)] font-mono text-[11px] tracking-wider
        ${
					listening
						? "animate-pulse shadow-glow ring-2 ring-accent"
						: "border-b-2 border-glass-border-hover bg-glass-bg-hover hover:bg-glass-bg-strong text-foreground shadow-sm"
				}
      `}
			onClick={() => setListening(true)}
		>
			{listening ? "..." : currentKey}
		</Button>
	);
};

export const ControlsTab: FC<ControlsTabProps> = ({
	primaryScroll,
	setPrimaryScroll,
	middleClick,
	setMiddleClick,
	invertScroll,
	setInvertScroll,
	ctrlScroll,
	setCtrlScroll,
	shiftScroll,
	setShiftScroll,
	spacebarAction,
	setSpacebarAction,
	keybinds,
	setKeybinds,
}) => {
	const updateKeybind = useCallback(
		(actionId: string, newKey: string) => {
			setKeybinds(
				keybinds.map((kb) =>
					kb.action === actionId ? { ...kb, key: newKey } : kb,
				),
			);
		},
		[keybinds, setKeybinds],
	);

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-[var(--ui-motion-duration-slow)]">
			<div>
				<h4 className="text-xl font-bold text-foreground mb-1">Controls</h4>
				<p className="text-sm text-foreground-muted">
					Customize mouse behavior and keyboard shortcuts.
				</p>
			</div>

			<SettingGroup title="Mouse & Scroll" icon={<MousePointer2 size={12} />}>
				<SettingRow
					label="Primary Scroll Wheel"
					description="Default behavior when turning the mouse wheel."
				>
					<Dropdown
						value={primaryScroll}
						onChange={(val) => setPrimaryScroll(val as MouseAction)}
						options={actionOptions}
						className="min-w-[160px]"
					/>
				</SettingRow>

				<SettingRow
					label="Middle Click"
					description="Action performed when pressing the scroll wheel button."
				>
					<Dropdown
						value={middleClick}
						onChange={(val) => setMiddleClick(val as MouseAction)}
						options={actionOptions}
						className="min-w-[160px]"
					/>
				</SettingRow>

				<SettingRow
					label="Invert Scroll Direction"
					description="Reverses the up/down logic for zooming and scrolling."
				>
					<SettingToggle checked={invertScroll} onChange={setInvertScroll} />
				</SettingRow>
			</SettingGroup>

			<SettingGroup title="Modifiers" icon={<Shuffle size={12} />}>
				<SettingRow
					label="Ctrl + Scroll"
					description="Behavior when holding Ctrl while scrolling."
				>
					<Dropdown
						value={ctrlScroll}
						onChange={(val) => setCtrlScroll(val as MouseAction)}
						options={actionOptions}
						className="min-w-[160px]"
					/>
				</SettingRow>
				<SettingRow
					label="Shift + Scroll"
					description="Behavior when holding Shift while scrolling."
				>
					<Dropdown
						value={shiftScroll}
						onChange={(val) => setShiftScroll(val as MouseAction)}
						options={actionOptions}
						className="min-w-[160px]"
					/>
				</SettingRow>
				<SettingRow
					label="Spacebar"
					description="Action bound to the Spacebar key by default."
				>
					<Dropdown
						value={spacebarAction}
						onChange={(val) => setSpacebarAction(val as MouseAction)}
						options={actionOptions}
						className="min-w-[160px]"
					/>
				</SettingRow>
			</SettingGroup>

			<SettingGroup title="Keyboard Shortcuts" icon={<Keyboard size={12} />}>
				{keybinds.map((kb) => (
					<SettingRow key={kb.action} label={kb.label}>
						<KeyRecorder
							currentKey={kb.key}
							onRecord={(newKey) => updateKeybind(kb.action, newKey)}
						/>
					</SettingRow>
				))}
				<div className="py-2 flex justify-center border-t border-glass-border-subtle">
					<Button
						variant="secondary"
						className="text-[11px] h-8 px-4 text-foreground-muted hover:text-foreground-hover border-glass-border-subtle hover:bg-glass-bg-hover transition-[background-color,color,border-color] duration-[var(--ui-motion-duration-standard)]"
						onClick={() => {
							// Reset logic would go here
						}}
					>
						Reset All to Default
					</Button>
				</div>
			</SettingGroup>
		</div>
	);
};
