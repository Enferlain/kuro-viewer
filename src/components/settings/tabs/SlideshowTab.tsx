import { ListVideo, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import type React from "react";
import { Button } from "../../ui/Button";
import { Dropdown } from "../../ui/Dropdown";
import { SettingGroup } from "../ui/SettingGroup";
import { SettingRow } from "../ui/SettingRow";
import { SettingToggle } from "../ui/SettingToggle";

export interface Playlist {
	id: string;
	name: string;
	itemCount: number;
}

interface SlideshowTabProps {
	slideshowEnabled: boolean;
	setSlideshowEnabled: (val: boolean) => void;
	slideshowInterval: number;
	setSlideshowInterval: (val: number) => void;
	slideshowLoop: boolean;
	setSlideshowLoop: (val: boolean) => void;
	slideshowShuffle: boolean;
	setSlideshowShuffle: (val: boolean) => void;
	transitionStyle: "Instant" | "Fade" | "Slide";
	setTransitionStyle: (val: "Instant" | "Fade" | "Slide") => void;
	playlists: Playlist[];
	setPlaylists: (val: Playlist[]) => void;
	activePlaylistId: string | null;
	setActivePlaylistId: (val: string | null) => void;
}

export const SlideshowTab: React.FC<SlideshowTabProps> = ({
	slideshowEnabled,
	setSlideshowEnabled,
	slideshowInterval,
	setSlideshowInterval,
	slideshowLoop,
	setSlideshowLoop,
	slideshowShuffle,
	setSlideshowShuffle,
	transitionStyle,
	setTransitionStyle,
	playlists,
	setPlaylists,
	activePlaylistId,
	setActivePlaylistId,
}) => (
	<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-[var(--ui-motion-duration-slow)]">
		<div>
			<h4 className="text-xl font-bold text-foreground mb-1">Slideshow</h4>
			<p className="text-sm text-foreground-muted">
				Configure automated playback and custom viewing paths.
			</p>
		</div>

		<SettingGroup title="Auto-Play" icon={<Play size={12} />}>
			<SettingRow
				label="Enable Slideshow"
				description="Automatically cycle through images in the current folder or playlist."
			>
				<SettingToggle
					checked={slideshowEnabled}
					onChange={setSlideshowEnabled}
				/>
			</SettingRow>

			<SettingRow
				label="Interval Duration"
				description="How long each image stays on screen before transitioning."
				disabled={!slideshowEnabled}
			>
				<Dropdown
					value={slideshowInterval}
					onChange={(val) => setSlideshowInterval(val as number)}
					className="min-w-[120px]"
					options={[
						{ label: "3 Seconds", value: 3 },
						{ label: "5 Seconds", value: 5 },
						{ label: "10 Seconds", value: 10 },
						{ label: "30 Seconds", value: 30 },
						{ label: "60 Seconds", value: 60 },
					]}
				/>
			</SettingRow>

			<SettingRow
				label="Loop Playback"
				description="Restart from the beginning once the end of the list is reached."
				disabled={!slideshowEnabled}
			>
				<SettingToggle checked={slideshowLoop} onChange={setSlideshowLoop} />
			</SettingRow>

			<SettingRow
				label="Shuffle Order"
				description="Randomize the playback order instead of sequential navigation."
				disabled={!slideshowEnabled}
			>
				<SettingToggle
					checked={slideshowShuffle}
					onChange={setSlideshowShuffle}
				/>
			</SettingRow>
		</SettingGroup>

		<SettingGroup title="Transitions" icon={<Sparkles size={12} />}>
			<SettingRow
				label="Transition Style"
				description="Animation effect used when switching between images."
			>
				<Dropdown
					value={transitionStyle}
					onChange={(val) =>
						setTransitionStyle(val as "Instant" | "Fade" | "Slide")
					}
					className="min-w-[120px]"
					options={[
						{ label: "Instant", value: "Instant" },
						{ label: "Fade", value: "Fade" },
						{ label: "Slide", value: "Slide" },
					]}
				/>
			</SettingRow>
		</SettingGroup>

		<SettingGroup title="Playlists" icon={<ListVideo size={12} />}>
			{playlists.length > 0 ? (
				playlists.map((playlist) => (
					<SettingRow
						key={playlist.id}
						label={playlist.name}
						description={`${playlist.itemCount} items`}
						onClick={() => setActivePlaylistId(playlist.id)}
					>
						<div className="flex items-center gap-2">
							{activePlaylistId === playlist.id ? (
								<div className="flex items-center gap-2 px-2 py-1 bg-accent/10 border border-accent/20 rounded-md">
									<div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
									<span className="text-[10px] font-bold text-accent uppercase tracking-widest">
										Active
									</span>
								</div>
							) : (
								<Button
									variant="secondary"
									className="text-[10px] h-7 px-3 border-glass-border-subtle"
									onClick={(e) => {
										e.stopPropagation();
										setActivePlaylistId(playlist.id);
									}}
								>
									Play
								</Button>
							)}
							<Button
								variant="icon"
								className="text-foreground-muted hover:text-destructive hover:bg-destructive/10 w-7 h-7"
								onClick={(e) => {
									e.stopPropagation();
									setPlaylists(playlists.filter((p) => p.id !== playlist.id));
									if (activePlaylistId === playlist.id)
										setActivePlaylistId(null);
								}}
							>
								<Trash2 size={14} />
							</Button>
						</div>
					</SettingRow>
				))
			) : (
				<div className="p-8 text-center flex flex-col items-center gap-2">
					<ListVideo size={24} className="text-foreground-subtle/20" />
					<p className="text-[11px] text-foreground-muted italic">
						No custom playlists found.
					</p>
				</div>
			)}
			<div className="p-3 border-t border-glass-border-subtle">
				<Button
					variant="secondary"
					className="w-full text-[10px] h-9 border-dashed flex items-center justify-center gap-2 hover:border-accent/50 hover:text-accent transition-[border-color,color] duration-[var(--ui-motion-duration-standard)]"
					onClick={() => {
						const id = `playlist-${Date.now()}`;
						setPlaylists([
							...playlists,
							{
								id,
								name: `Untitled Playlist ${playlists.length + 1}`,
								itemCount: 0,
							},
						]);
					}}
				>
					<Plus size={14} />
					Create Playlist
				</Button>
			</div>
		</SettingGroup>
	</div>
);
