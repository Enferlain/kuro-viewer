import { Monitor, Palette, Plus, Puzzle, Trash2 } from "lucide-react";
import type React from "react";
import { Button } from "../../ui/Button";
import { SettingGroup } from "../ui/SettingGroup";
import { SettingRow } from "../ui/SettingRow";

interface AppearanceTabProps {
	theme: "dark" | "light" | "system";
	setTheme: (val: "dark" | "light" | "system") => void;
	customThemes: { id: string; name: string; author: string }[];
	setCustomThemes: (
		val: { id: string; name: string; author: string }[],
	) => void;
	selectedThemeId: string | null;
	setSelectedThemeId: (val: string | null) => void;
	backdropStyle: "None" | "Acrylic" | "Mica";
	setBackdropStyle: (val: "None" | "Acrylic" | "Mica") => void;
	accentColor: string;
	setAccentColor: (val: string) => void;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({
	theme,
	setTheme,
	customThemes,
	setCustomThemes,
	selectedThemeId,
	setSelectedThemeId,
	backdropStyle,
	setBackdropStyle,
	accentColor,
	setAccentColor,
}) => (
	<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
		<div>
			<h4 className="text-xl font-bold text-white mb-1">Appearance</h4>
			<p className="text-sm text-foreground-muted">
				Personalize the look and feel of your viewer.
			</p>
		</div>

		<SettingGroup title="Theme" icon={<Palette size={12} />}>
			<SettingRow
				label="Application Theme"
				description="Select between light, dark, or follow your system preference."
			>
				<div className="grid grid-cols-3 gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-[240px]">
					{(["dark", "light", "system"] as const).map((t) => (
						<button
							type="button"
							key={t}
							onClick={() => setTheme(t)}
							className={`
                py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all
                ${
									theme === t
										? "bg-accent text-white shadow-glow"
										: "text-foreground-muted hover:text-foreground hover:bg-white/[0.05]"
								}
              `}
						>
							{t}
						</button>
					))}
				</div>
			</SettingRow>
		</SettingGroup>

		<SettingGroup title="Custom Themes" icon={<Puzzle size={12} />}>
			{customThemes.length > 0 ? (
				customThemes.map((t) => (
					<SettingRow
						key={t.id}
						label={t.name}
						description={`by ${t.author}`}
						onClick={() => setSelectedThemeId(t.id)}
					>
						<div className="flex items-center gap-2">
							{selectedThemeId === t.id ? (
								<div className="flex items-center gap-2 px-2 py-1 bg-accent/10 border border-accent/20 rounded-md">
									<div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
									<span className="text-[10px] font-bold text-accent uppercase tracking-widest">
										Active
									</span>
								</div>
							) : (
								<Button
									variant="secondary"
									className="text-[10px] h-7 px-3 border-white/[0.05]"
									onClick={(e) => {
										e.stopPropagation();
										setSelectedThemeId(t.id);
									}}
								>
									Apply
								</Button>
							)}
							<Button
								variant="icon"
								className="text-foreground-muted hover:text-red-400 hover:bg-red-400/10 w-7 h-7"
								onClick={(e) => {
									e.stopPropagation();
									setCustomThemes(
										customThemes.filter((theme) => theme.id !== t.id),
									);
									if (selectedThemeId === t.id) setSelectedThemeId(null);
								}}
							>
								<Trash2 size={14} />
							</Button>
						</div>
					</SettingRow>
				))
			) : (
				<div className="p-8 text-center flex flex-col items-center gap-2">
					<Puzzle size={24} className="text-white/10" />
					<p className="text-[11px] text-foreground-muted italic">
						No custom themes installed.
					</p>
				</div>
			)}
			<div className="p-3 border-t border-white/[0.04]">
				<Button
					variant="secondary"
					className="w-full text-[10px] h-9 border-dashed flex items-center justify-center gap-2 hover:border-accent/50 hover:text-accent transition-all"
					onClick={() => {
						const id = `new-theme-${Date.now()}`;
						setCustomThemes([
							...customThemes,
							{
								id,
								name: `Untitled Theme ${customThemes.length + 1}`,
								author: "User",
							},
						]);
					}}
				>
					<Plus size={14} />
					Add Theme Pack
				</Button>
			</div>
		</SettingGroup>

		<SettingGroup title="Window Effects" icon={<Monitor size={12} />}>
			<SettingRow
				label="Backdrop Style"
				description="Windows 11 system transparency effects for the application window."
			>
				<select
					value={backdropStyle}
					onChange={(e) =>
						setBackdropStyle(e.target.value as typeof backdropStyle)
					}
					className="bg-white/[0.05] border border-white/[0.1] rounded-lg text-xs text-foreground px-3 py-1.5 outline-none focus:border-accent/50 transition-colors w-[120px]"
				>
					<option value="None">None</option>
					<option value="Acrylic">Acrylic</option>
					<option value="Mica">Mica</option>
				</select>
			</SettingRow>
		</SettingGroup>

		<SettingGroup title="Colors" icon={<Palette size={12} />}>
			<SettingRow
				label="Accent Color"
				description="Choose the primary highlight color used throughout the interface."
			>
				<div className="flex items-center gap-2">
					{[
						"#3b82f6", // Blue
						"#8b5cf6", // Violet
						"#ec4899", // Pink
						"#f43f5e", // Rose
						"#f59e0b", // Amber
						"#10b981", // Emerald
					].map((color) => (
						<button
							type="button"
							key={color}
							onClick={() => setAccentColor(color)}
							className={`
                w-6 h-6 rounded-full transition-all border-2
                ${accentColor === color ? "border-white scale-110 shadow-glow" : "border-transparent hover:scale-105"}
              `}
							style={{ backgroundColor: color }}
						/>
					))}
					<div className="w-[1px] h-4 bg-white/[0.1] mx-1" />
					<input
						type="color"
						value={accentColor}
						onChange={(e) => setAccentColor(e.target.value)}
						className="w-6 h-6 rounded-md bg-transparent border-none cursor-pointer overflow-hidden p-0"
					/>
				</div>
			</SettingRow>
		</SettingGroup>
	</div>
);
