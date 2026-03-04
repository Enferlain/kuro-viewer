import type React from "react";
import { type FC, useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Dropdown } from "../../components/ui/Dropdown";
import { FilterType } from "../../types";
import type {
	ForensicsHotkeys,
	ForensicsPluginState,
	ForensicsViewOptions,
	NoiseOptions,
	PcaOptions,
	TextureOptions,
} from "./forensicsPlugin";
import { DEFAULT_FORENSICS_HOTKEYS, sanitizeHotkey } from "./forensicsPlugin";

interface ForensicsPanelProps {
	state: ForensicsPluginState;
	onNoiseChange: (next: NoiseOptions) => void;
	onPcaChange: (next: PcaOptions) => void;
	onTextureChange: (next: TextureOptions) => void;
	onMagnifierChange: (enabled: boolean, zoom: number) => void;
	onViewChange: (next: ForensicsViewOptions) => void;
	onHotkeysChange: (next: ForensicsHotkeys) => void;
}

const labelClass =
	"text-[10px] uppercase tracking-wider font-bold text-foreground-subtle";

const HotkeyRecorder: FC<{
	currentKey: string;
	onRecord: (key: string) => void;
}> = ({ currentKey, onRecord }) => {
	const [listening, setListening] = useState(false);

	useEffect(() => {
		if (!listening) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();

			let keyName = e.key;
			if (keyName === " ") keyName = "Space";
			if (keyName.length === 1) keyName = keyName.toUpperCase();
			if (["Control", "Alt", "Shift", "Meta"].includes(keyName)) return;

			onRecord(keyName);
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
				min-w-[36px] h-7 px-2 justify-center font-mono text-[11px] tracking-wider
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

export const ForensicsPanel: React.FC<ForensicsPanelProps> = ({
	state,
	onNoiseChange,
	onPcaChange,
	onTextureChange,
	onMagnifierChange,
	onViewChange,
	onHotkeysChange,
}) => {
	const duplicateHotkeys = (() => {
		const entries = (
			Object.entries(state.hotkeys) as Array<[keyof ForensicsHotkeys, string]>
		).map(([mode, hotkey]) => ({
			mode,
			hotkey: hotkey.toLowerCase(),
		}));
		const seen = new Set<string>();
		const duplicates = new Set<string>();
		for (const entry of entries) {
			if (seen.has(entry.hotkey)) {
				duplicates.add(entry.hotkey.toUpperCase());
			}
			seen.add(entry.hotkey);
		}
		return Array.from(duplicates.values());
	})();

	return (
		<div className="space-y-0 divide-y divide-glass-border-base">
			{/* ── Mode-specific controls (contextually linked to tab selection) ── */}
			{state.mode === FilterType.NOISE && (
				<div className="py-3 first:pt-0">
					<p className={labelClass}>Noise Controls</p>
					<div className="mt-2 grid grid-cols-2 gap-3">
						<label className="text-xs text-foreground-muted">
							Amplitude
							<div className="flex items-center justify-between mt-1 mb-0.5">
								<span className="text-[10px] text-foreground-subtle">1</span>
								<span className="text-[11px] font-mono text-foreground">
									{state.noise.amplitude}
								</span>
								<span className="text-[10px] text-foreground-subtle">100</span>
							</div>
							<input
								type="range"
								min={1}
								max={100}
								step={1}
								value={state.noise.amplitude}
								onChange={(event) =>
									onNoiseChange({
										...state.noise,
										amplitude: Number(event.target.value),
									})
								}
								className="w-full mt-1 accent-accent cursor-pointer"
							/>
						</label>
						<label className="text-xs text-foreground-muted">
							Opacity
							<div className="flex items-center justify-between mt-1 mb-0.5">
								<span className="text-[10px] text-foreground-subtle">0.00</span>
								<span className="text-[11px] font-mono text-foreground">
									{state.noise.opacity.toFixed(2)}
								</span>
								<span className="text-[10px] text-foreground-subtle">1.00</span>
							</div>
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={state.noise.opacity}
								onChange={(event) =>
									onNoiseChange({
										...state.noise,
										opacity: Number(event.target.value),
									})
								}
								className="w-full mt-1 accent-accent cursor-pointer"
							/>
						</label>
					</div>
					<div className="mt-2 flex items-center gap-4 text-xs text-foreground">
						<label className="inline-flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={state.noise.equalizeHistogram}
								onChange={(event) =>
									onNoiseChange({
										...state.noise,
										equalizeHistogram: event.target.checked,
									})
								}
								className="accent-accent cursor-pointer"
							/>
							Equalize Histogram
						</label>
						<label className="inline-flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={state.noise.rembg}
								onChange={(event) =>
									onNoiseChange({ ...state.noise, rembg: event.target.checked })
								}
								className="accent-accent cursor-pointer"
							/>
							Use rembg mask
						</label>
					</div>
				</div>
			)}

			{state.mode === FilterType.PCA && (
				<div className="py-3 first:pt-0">
					<p className={labelClass}>PCA Controls</p>
					<div className="mt-2 grid grid-cols-2 gap-3">
						<div>
							<p className="text-xs text-foreground-muted mb-1">Input</p>
							<Dropdown
								value={state.pca.input}
								onChange={(input) => onPcaChange({ ...state.pca, input })}
								options={[
									{ value: "color", label: "Color" },
									{ value: "luminance-gradient", label: "Luminance Gradient" },
								]}
							/>
						</div>
						<div>
							<p className="text-xs text-foreground-muted mb-1">Mode</p>
							<Dropdown
								value={state.pca.mode}
								onChange={(mode) => onPcaChange({ ...state.pca, mode })}
								options={[
									{ value: "projection", label: "Projection" },
									{ value: "difference", label: "Difference" },
									{ value: "distance", label: "Distance" },
									{ value: "component", label: "Component" },
								]}
							/>
						</div>
						<div>
							<p className="text-xs text-foreground-muted mb-1">Enhancement</p>
							<Dropdown
								value={state.pca.enhancement}
								onChange={(enhancement) =>
									onPcaChange({ ...state.pca, enhancement })
								}
								options={[
									{ value: "none", label: "None" },
									{ value: "equalize-histogram", label: "Equalize Histogram" },
									{ value: "stretch-contrast", label: "Stretch Contrast" },
								]}
							/>
						</div>
						<label className="text-xs text-foreground-muted">
							Opacity
							<div className="flex items-center justify-between mt-1 mb-0.5">
								<span className="text-[10px] text-foreground-subtle">0.10</span>
								<span className="text-[11px] font-mono text-foreground">
									{state.pca.opacity.toFixed(2)}
								</span>
								<span className="text-[10px] text-foreground-subtle">1.00</span>
							</div>
							<input
								type="range"
								min={0.1}
								max={1}
								step={0.01}
								value={state.pca.opacity}
								onChange={(event) =>
									onPcaChange({
										...state.pca,
										opacity: Number(event.target.value),
									})
								}
								className="w-full mt-1 accent-accent cursor-pointer"
							/>
						</label>
					</div>
					<div className="mt-2">
						<div className="flex items-center justify-between text-xs text-foreground-muted">
							<span>Component</span>
							<span className="font-mono">{state.pca.component}</span>
						</div>
						<input
							type="range"
							min={1}
							max={3}
							step={1}
							value={state.pca.component}
							onChange={(event) =>
								onPcaChange({
									...state.pca,
									component: Number(event.target.value),
								})
							}
							className="w-full mt-1 accent-accent cursor-pointer"
						/>
					</div>
					<div className="mt-2 flex items-center gap-4 text-xs text-foreground">
						<label className="inline-flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={state.pca.linearize}
								onChange={(event) =>
									onPcaChange({ ...state.pca, linearize: event.target.checked })
								}
								className="accent-accent cursor-pointer"
							/>
							Linearize
						</label>
						<label className="inline-flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={state.pca.invert}
								onChange={(event) =>
									onPcaChange({ ...state.pca, invert: event.target.checked })
								}
								className="accent-accent cursor-pointer"
							/>
							Invert
						</label>
					</div>
				</div>
			)}

			{state.mode === FilterType.TEXTURE && (
				<div className="py-3 first:pt-0">
					<p className={labelClass}>Texture Controls</p>
					<div className="mt-2 grid grid-cols-2 gap-3">
						<div>
							<p className="text-xs text-foreground-muted mb-1">Mode</p>
							<Dropdown
								value={state.texture.mode}
								onChange={(mode) => onTextureChange({ ...state.texture, mode })}
								options={[
									{ value: "edge-balance", label: "Edge Balance" },
									{ value: "residual-noise", label: "Residual Noise" },
									{ value: "micro-contrast", label: "Micro Contrast" },
								]}
							/>
						</div>
						<div>
							<p className="text-xs text-foreground-muted mb-1">Enhancement</p>
							<Dropdown
								value={state.texture.enhancement}
								onChange={(enhancement) =>
									onTextureChange({ ...state.texture, enhancement })
								}
								options={[
									{ value: "none", label: "None" },
									{ value: "equalize-histogram", label: "Equalize Histogram" },
									{ value: "stretch-contrast", label: "Stretch Contrast" },
								]}
							/>
						</div>
						<label className="text-xs text-foreground-muted">
							Strength
							<div className="flex items-center justify-between mt-1 mb-0.5">
								<span className="text-[10px] text-foreground-subtle">0.00</span>
								<span className="text-[11px] font-mono text-foreground">
									{state.texture.strength.toFixed(2)}
								</span>
								<span className="text-[10px] text-foreground-subtle">1.00</span>
							</div>
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={state.texture.strength}
								onChange={(event) =>
									onTextureChange({
										...state.texture,
										strength: Number(event.target.value),
									})
								}
								className="w-full mt-1 accent-accent cursor-pointer"
							/>
						</label>
						<label className="text-xs text-foreground-muted">
							Smoothness
							<div className="flex items-center justify-between mt-1 mb-0.5">
								<span className="text-[10px] text-foreground-subtle">0.00</span>
								<span className="text-[11px] font-mono text-foreground">
									{state.texture.smoothness.toFixed(2)}
								</span>
								<span className="text-[10px] text-foreground-subtle">1.00</span>
							</div>
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={state.texture.smoothness}
								onChange={(event) =>
									onTextureChange({
										...state.texture,
										smoothness: Number(event.target.value),
									})
								}
								className="w-full mt-1 accent-accent cursor-pointer"
							/>
						</label>
					</div>
					<label className="text-xs text-foreground-muted mt-2 block">
						Opacity
						<div className="flex items-center justify-between mt-1 mb-0.5">
							<span className="text-[10px] text-foreground-subtle">0.10</span>
							<span className="text-[11px] font-mono text-foreground">
								{state.texture.opacity.toFixed(2)}
							</span>
							<span className="text-[10px] text-foreground-subtle">1.00</span>
						</div>
						<input
							type="range"
							min={0.1}
							max={1}
							step={0.01}
							value={state.texture.opacity}
							onChange={(event) =>
								onTextureChange({
									...state.texture,
									opacity: Number(event.target.value),
								})
							}
							className="w-full mt-1 accent-accent cursor-pointer"
						/>
					</label>
				</div>
			)}

			{/* ── Magnifier ── */}
			<div className="py-3">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className={labelClass}>Magnifier</p>
						<p className="text-[11px] text-foreground-muted">
							Square lens shown at the lower-right of the cursor.
						</p>
					</div>
					<label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
						<input
							type="checkbox"
							checked={state.magnifier.enabled}
							onChange={(event) =>
								onMagnifierChange(event.target.checked, state.magnifier.zoom)
							}
							className="accent-accent cursor-pointer"
						/>
						Enabled
					</label>
				</div>
				<div className="mt-2">
					<div className="flex items-center justify-between">
						<span className="text-[11px] text-foreground-muted">Zoom</span>
						<span className="text-[11px] font-mono text-foreground">
							{state.magnifier.zoom.toFixed(2)}x
						</span>
					</div>
					<input
						type="range"
						min={1.25}
						max={4}
						step={0.05}
						value={state.magnifier.zoom}
						onChange={(event) =>
							onMagnifierChange(
								state.magnifier.enabled,
								Number(event.target.value),
							)
						}
						className="w-full mt-1 accent-accent cursor-pointer"
					/>
				</div>
			</div>

			{/* ── Plugin Behavior ── */}
			<div className="py-3">
				<p className={labelClass}>Plugin Behavior</p>
				<div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground">
					<label className="inline-flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={state.view.sideBySide}
							onChange={(event) =>
								onViewChange({
									...state.view,
									sideBySide: event.target.checked,
								})
							}
							className="accent-accent cursor-pointer"
						/>
						Side-by-side compare
					</label>
					<label className="inline-flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={state.view.outputScore}
							onChange={(event) =>
								onViewChange({
									...state.view,
									outputScore: event.target.checked,
								})
							}
							className="accent-accent cursor-pointer"
						/>
						Compute scores
					</label>
				</div>
			</div>

			{/* ── Hotkeys ── */}
			<div className="py-3 last:pb-0">
				<div className="flex items-center justify-between gap-3">
					<p className={labelClass}>Hotkeys</p>
					<span className="text-[10px] text-foreground-subtle">
						Single-key bindings
					</span>
				</div>
				<div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
					<div className="flex items-center gap-2">
						<HotkeyRecorder
							currentKey={state.hotkeys.original}
							onRecord={(key) =>
								onHotkeysChange({
									...state.hotkeys,
									original: sanitizeHotkey(
										key,
										DEFAULT_FORENSICS_HOTKEYS.original,
									),
								})
							}
						/>
						<span className="text-foreground-muted">Original</span>
					</div>
					<div className="flex items-center gap-2">
						<HotkeyRecorder
							currentKey={state.hotkeys.noise}
							onRecord={(key) =>
								onHotkeysChange({
									...state.hotkeys,
									noise: sanitizeHotkey(key, DEFAULT_FORENSICS_HOTKEYS.noise),
								})
							}
						/>
						<span className="text-foreground-muted">Noise</span>
					</div>
					<div className="flex items-center gap-2">
						<HotkeyRecorder
							currentKey={state.hotkeys.pca}
							onRecord={(key) =>
								onHotkeysChange({
									...state.hotkeys,
									pca: sanitizeHotkey(key, DEFAULT_FORENSICS_HOTKEYS.pca),
								})
							}
						/>
						<span className="text-foreground-muted">PCA</span>
					</div>
					<div className="flex items-center gap-2">
						<HotkeyRecorder
							currentKey={state.hotkeys.texture}
							onRecord={(key) =>
								onHotkeysChange({
									...state.hotkeys,
									texture: sanitizeHotkey(
										key,
										DEFAULT_FORENSICS_HOTKEYS.texture,
									),
								})
							}
						/>
						<span className="text-foreground-muted">Texture</span>
					</div>
					<div className="flex items-center gap-2">
						<HotkeyRecorder
							currentKey={state.hotkeys.sideBySide}
							onRecord={(key) =>
								onHotkeysChange({
									...state.hotkeys,
									sideBySide: sanitizeHotkey(
										key,
										DEFAULT_FORENSICS_HOTKEYS.sideBySide,
									),
								})
							}
						/>
						<span className="text-foreground-muted">Split</span>
					</div>
				</div>
				{duplicateHotkeys.length > 0 && (
					<p className="mt-2 text-[10px] text-status-warning">
						Conflicting plugin hotkeys: {duplicateHotkeys.join(", ")}
					</p>
				)}
			</div>
		</div>
	);
};
