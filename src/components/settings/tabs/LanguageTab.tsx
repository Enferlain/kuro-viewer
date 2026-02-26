import { Clock, Globe } from "lucide-react";
import type React from "react";
import { Dropdown } from "../../ui/Dropdown";
import { SettingGroup } from "../ui/SettingGroup";
import { SettingRow } from "../ui/SettingRow";

export interface LanguageTabProps {
	displayLanguage: string;
	setDisplayLanguage: (val: string) => void;
	fallbackLanguage: string;
	setFallbackLanguage: (val: string) => void;
	dateFormat: string;
	setDateFormat: (val: string) => void;
	timeFormat: string;
	setTimeFormat: (val: string) => void;
	firstDayOfWeek: string;
	setFirstDayOfWeek: (val: string) => void;
	numberFormat: string;
	setNumberFormat: (val: string) => void;
}

export const LanguageTab: React.FC<LanguageTabProps> = ({
	displayLanguage,
	setDisplayLanguage,
	fallbackLanguage,
	setFallbackLanguage,
	dateFormat,
	setDateFormat,
	timeFormat,
	setTimeFormat,
	firstDayOfWeek,
	setFirstDayOfWeek,
	numberFormat,
	setNumberFormat,
}) => (
	<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-(--ui-motion-duration-slow)">
		<div>
			<h4 className="text-xl font-bold text-foreground mb-1">Language</h4>
			<p className="text-sm text-foreground-muted">
				Localization preferences and regional formatting.
			</p>
		</div>

		<SettingGroup title="Language Preferences" icon={<Globe size={12} />}>
			<SettingRow
				label="Display Language"
				description="Primary language for the application interface."
			>
				<Dropdown
					value={displayLanguage}
					onChange={(val) => setDisplayLanguage(val as string)}
					className="min-w-[160px]"
					options={[
						{ label: "English (US)", value: "en-US" },
						{ label: "English (UK)", value: "en-GB" },
						{ label: "Deutsch", value: "de-DE" },
						{ label: "Français", value: "fr-FR" },
						{ label: "Español", value: "es-ES" },
						{ label: "日本語", value: "ja-JP" },
						{ label: "中文 (简体)", value: "zh-CN" },
					]}
				/>
			</SettingRow>
			<SettingRow
				label="Fallback Language"
				description="Language to use if translations are missing in your primary language."
			>
				<Dropdown
					value={fallbackLanguage}
					onChange={(val) => setFallbackLanguage(val as string)}
					className="min-w-[160px]"
					options={[
						{ label: "English (US)", value: "en-US" },
						{ label: "English (UK)", value: "en-GB" },
					]}
				/>
			</SettingRow>
		</SettingGroup>

		<SettingGroup title="Regional Formats" icon={<Clock size={12} />}>
			<SettingRow
				label="Date Format"
				description="Format used for file modification dates and metadata."
			>
				<Dropdown
					value={dateFormat}
					onChange={(val) => setDateFormat(val as string)}
					className="min-w-[160px]"
					options={[
						{ label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
						{ label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
						{ label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
					]}
				/>
			</SettingRow>
			<SettingRow label="Time Format" description="Display format for times.">
				<Dropdown
					value={timeFormat}
					onChange={(val) => setTimeFormat(val as string)}
					className="min-w-[160px]"
					options={[
						{ label: "12-hour (1:30 PM)", value: "12h" },
						{ label: "24-hour (13:30)", value: "24h" },
					]}
				/>
			</SettingRow>
			<SettingRow
				label="First Day of Week"
				description="Starting day for calendar views."
			>
				<Dropdown
					value={firstDayOfWeek}
					onChange={(val) => setFirstDayOfWeek(val as string)}
					className="min-w-[160px]"
					options={[
						{ label: "Sunday", value: "0" },
						{ label: "Monday", value: "1" },
					]}
				/>
			</SettingRow>
			<SettingRow
				label="Number Format"
				description="Decimal and grouping separators for file sizes and metrics."
			>
				<Dropdown
					value={numberFormat}
					onChange={(val) => setNumberFormat(val as string)}
					className="min-w-[160px]"
					options={[
						{ label: "1,234.56", value: "dot" },
						{ label: "1.234,56", value: "comma" },
					]}
				/>
			</SettingRow>
		</SettingGroup>
	</div>
);
