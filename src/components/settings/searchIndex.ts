import type { SettingCategory } from "./SettingsModal";

export interface SettingIndexEntry {
	id: string; // The DOM id in SettingRow
	label: string;
	category: SettingCategory;
	keywords: string[];
}

export const SETTINGS_INDEX: SettingIndexEntry[] = [
	// General
	{
		id: "general-startup",
		label: "Launch on Startup",
		category: "general",
		keywords: ["boot", "login", "auto", "start"],
	},
	{
		id: "general-update",
		label: "Auto-Update",
		category: "general",
		keywords: ["version", "upgrade", "download", "latest"],
	},
	{
		id: "general-instances",
		label: "Allow Multiple Instances",
		category: "general",
		keywords: ["window", "open", "new", "duplicate"],
	},
	{
		id: "general-watch",
		label: "Watch for Changes",
		category: "general",
		keywords: ["refresh", "folder", "monitor", "live"],
	},
	{
		id: "general-autoopen",
		label: "Auto-Open New Images",
		category: "general",
		keywords: ["generation", "stable diffusion", "ai", "focus"],
	},
	{
		id: "general-gpu",
		label: "Hardware Acceleration",
		category: "general",
		keywords: ["performance", "speed", "video card", "decode"],
	},
	{
		id: "general-lowpower",
		label: "Low Power Mode",
		category: "general",
		keywords: ["battery", "laptop", "energy", "save", "eco"],
	},
	{
		id: "general-cache",
		label: "Thumbnail Cache Limit",
		category: "general",
		keywords: ["memory", "disk space", "storage", "clear"],
	},
	{
		id: "general-export",
		label: "Export Settings",
		category: "general",
		keywords: ["backup", "save", "config", "download"],
	},
	{
		id: "general-import",
		label: "Import Settings",
		category: "general",
		keywords: ["restore", "load", "config", "upload"],
	},

	// Appearance
	{
		id: "appearance-theme",
		label: "Theme",
		category: "appearance",
		keywords: ["dark mode", "light mode", "system", "colors"],
	},
	{
		id: "appearance-custom",
		label: "Custom Theme",
		category: "appearance",
		keywords: ["community", "pack", "install", "colors"],
	},
	{
		id: "appearance-backdrop",
		label: "Window Backdrop",
		category: "appearance",
		keywords: ["blur", "glass", "transparent", "acrylic", "mica", "opacity"],
	},
	{
		id: "appearance-accent",
		label: "Accent Color",
		category: "appearance",
		keywords: ["primary", "brand", "highlight", "selection"],
	},

	// Layout
	{
		id: "layout-builder",
		label: "Layout Builder",
		category: "layout",
		keywords: [
			"position",
			"toolbar",
			"gallery",
			"strip",
			"sidebar",
			"top",
			"bottom",
			"left",
			"right",
		],
	},
	{
		id: "layout-autohide",
		label: "Auto-Hide Toolbar",
		category: "layout",
		keywords: ["disappear", "hover", "clean", "distraction free"],
	},
	{
		id: "layout-grid",
		label: "Grid Background Opacity",
		category: "layout",
		keywords: ["checkers", "transparency", "png", "darkness", "alpha"],
	},

	// Slideshow
	{
		id: "slideshow-enable",
		label: "Enable Slideshow",
		category: "slideshow",
		keywords: ["play", "auto", "presentation", "start"],
	},
	{
		id: "slideshow-interval",
		label: "Display Duration",
		category: "slideshow",
		keywords: ["seconds", "time", "speed", "delay"],
	},
	{
		id: "slideshow-loop",
		label: "Loop Automatically",
		category: "slideshow",
		keywords: ["repeat", "endless", "restart", "continuous"],
	},
	{
		id: "slideshow-shuffle",
		label: "Shuffle Order",
		category: "slideshow",
		keywords: ["random", "mix", "sort"],
	},
	{
		id: "slideshow-transition",
		label: "Transition Style",
		category: "slideshow",
		keywords: ["animation", "fade", "slide", "instant", "effect"],
	},
	{
		id: "slideshow-playlist",
		label: "Active Playlist",
		category: "slideshow",
		keywords: ["collection", "album", "list", "favorites"],
	},

	// Controls
	{
		id: "controls-scroll",
		label: "Primary Scroll Action",
		category: "controls",
		keywords: ["mouse wheel", "zoom", "pan", "next", "previous"],
	},
	{
		id: "controls-middle",
		label: "Middle Click Action",
		category: "controls",
		keywords: ["mouse button", "wheel click", "reset zoom", "close"],
	},
	{
		id: "controls-invert",
		label: "Invert Scroll Direction",
		category: "controls",
		keywords: ["mouse wheel", "reverse", "natural", "mac"],
	},
	{
		id: "controls-ctrl",
		label: "Ctrl + Scroll Action",
		category: "controls",
		keywords: ["modifier", "mouse wheel", "zoom", "pan", "command"],
	},
	{
		id: "controls-shift",
		label: "Shift + Scroll Action",
		category: "controls",
		keywords: ["modifier", "mouse wheel", "horizontal", "pan"],
	},
	{
		id: "controls-space",
		label: "Spacebar Action",
		category: "controls",
		keywords: ["keyboard", "pan", "drag", "grab"],
	},

	// Language
	{
		id: "language-display",
		label: "Display Language",
		category: "language",
		keywords: ["english", "translate", "locale", "text"],
	},
	{
		id: "language-fallback",
		label: "Fallback Language",
		category: "language",
		keywords: ["default", "missing", "translation"],
	},
	{
		id: "language-date",
		label: "Date Format",
		category: "language",
		keywords: ["calendar", "time", "day", "month", "year"],
	},
	{
		id: "language-time",
		label: "Time Format",
		category: "language",
		keywords: ["clock", "12h", "24h", "am", "pm"],
	},
	{
		id: "language-firstday",
		label: "First Day of Week",
		category: "language",
		keywords: ["calendar", "monday", "sunday", "start"],
	},
	{
		id: "language-number",
		label: "Number Format",
		category: "language",
		keywords: ["decimal", "comma", "separator", "metric"],
	},

	// Plugins
	{
		id: "plugins-directory",
		label: "Plugin Directory",
		category: "plugins",
		keywords: ["folder", "path", "install", "location"],
	},
	{
		id: "plugins-auto",
		label: "Auto-load Plugins",
		category: "plugins",
		keywords: ["startup", "boot", "enable", "automatic"],
	},
	{
		id: "plugins-dev",
		label: "Developer Mode",
		category: "plugins",
		keywords: ["debug", "console", "reload", "author"],
	},

	// File Types
	{
		id: "filetypes-associations",
		label: "File Associations",
		category: "fileType",
		keywords: [
			"default app",
			"open with",
			"extension",
			"png",
			"jpg",
			"webp",
			"gif",
		],
	},

	// Edit
	{
		id: "edit-confirm-delete",
		label: "Confirm on Delete",
		category: "edit",
		keywords: ["trash", "remove", "warning", "prompt", "ask"],
	},
	{
		id: "edit-confirm-overwrite",
		label: "Confirm on Overwrite",
		category: "edit",
		keywords: ["save", "replace", "warning", "prompt", "ask"],
	},
	{
		id: "edit-default-save",
		label: "Default Save Action",
		category: "edit",
		keywords: ["hotkey", "ctrl s", "save as", "save copy"],
	},
	{
		id: "edit-metadata",
		label: "Preserve Metadata",
		category: "edit",
		keywords: ["exif", "png chunks", "ai generation", "tags", "keep", "save"],
	},
	{
		id: "edit-contextual",
		label: "Contextual 'Save As'",
		category: "edit",
		keywords: ["folder", "directory", "location", "path"],
	},
	{
		id: "edit-crop-grid",
		label: "Crop Grid Overlay",
		category: "edit",
		keywords: ["thirds", "golden ratio", "center", "lines", "visual"],
	},
	{
		id: "edit-crop-aspect",
		label: "Preserve Aspect Ratio",
		category: "edit",
		keywords: ["lock", "proportions", "square", "ratio", "crop"],
	},
	{
		id: "edit-paste",
		label: "Enable Image Pasting",
		category: "edit",
		keywords: ["clipboard", "ctrl v", "copy", "insert"],
	},
	{
		id: "edit-multi",
		label: "Multi-File Selection",
		category: "edit",
		keywords: ["bulk", "batch", "gallery", "copy", "cut", "select"],
	},
	{
		id: "edit-primary-app",
		label: "Primary Application",
		category: "edit",
		keywords: ["photoshop", "editor", "open with", "external", "path"],
	},
	{
		id: "edit-secondary-app",
		label: "Secondary Application",
		category: "edit",
		keywords: ["gimp", "paint", "editor", "open with", "external", "path"],
	},

	// Content
	{
		id: "content-library",
		label: "Library Paths",
		category: "content",
		keywords: ["folders", "directories", "scan", "index", "watch"],
	},
	{
		id: "content-clip",
		label: "Enable CLIP Semantic Search",
		category: "content",
		keywords: ["ai", "machine learning", "smart search", "tags", "auto"],
	},
	{
		id: "content-metadata",
		label: "Extract Embedded Metadata",
		category: "content",
		keywords: ["exif", "png chunks", "generation parameters", "read", "scan"],
	},

	// Privacy
	{
		id: "privacy-telemetry",
		label: "Anonymous Telemetry",
		category: "privacy",
		keywords: ["data collection", "analytics", "tracking", "usage", "send"],
	},
];
