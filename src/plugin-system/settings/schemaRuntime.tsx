import { useMemo } from "react";
import { SettingRow } from "../../components/settings/ui/SettingRow";
import { SettingToggle } from "../../components/settings/ui/SettingToggle";
import { Dropdown } from "../../components/ui/Dropdown";
import type {
	PluginSettingsDefinition,
	PluginSettingsRendererProps,
} from "./types";

type FieldBase = {
	id: string;
	label: string;
	description?: string;
};

type BooleanField = FieldBase & {
	type: "boolean";
	default: boolean;
};

type NumberField = FieldBase & {
	type: "number";
	default: number;
	min: number;
	max: number;
	step: number;
	ui: "slider" | "input";
};

type EnumField = FieldBase & {
	type: "enum";
	default: string;
	options: Array<{
		value: string;
		label: string;
	}>;
};

type StringField = FieldBase & {
	type: "string";
	default: string;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
};

type KeybindingField = FieldBase & {
	type: "keybinding";
	default: string;
	scope: "global" | "viewer" | "plugin";
};

type SchemaField =
	| BooleanField
	| NumberField
	| EnumField
	| StringField
	| KeybindingField;

type SchemaSection = {
	id: string;
	label: string;
	description?: string;
	fields: SchemaField[];
};

type PluginSettingsSchemaRuntime = {
	pluginId: string;
	title?: string;
	description?: string;
	presentation: "inline" | "modal";
	sections: SchemaSection[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function readOptionalString(value: unknown): string | undefined {
	return isNonEmptyString(value) ? value.trim() : undefined;
}

function readFiniteNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function formatNumberValue(value: number, step: number): string {
	if (step >= 1) {
		return String(Math.round(value));
	}
	if (step >= 0.1) {
		return value.toFixed(1);
	}
	if (step >= 0.01) {
		return value.toFixed(2);
	}
	return value.toString();
}

function readPath(root: unknown, path: string): unknown {
	if (!isRecord(root)) {
		return undefined;
	}

	let current: unknown = root;
	for (const part of path.split(".")) {
		if (!isRecord(current) || !(part in current)) {
			return undefined;
		}
		current = current[part];
	}

	return current;
}

function writePath(
	root: Record<string, unknown>,
	path: string,
	value: unknown,
) {
	const parts = path.split(".");
	let current: Record<string, unknown> = root;

	for (const part of parts.slice(0, -1)) {
		const existing = current[part];
		if (!isRecord(existing)) {
			current[part] = {};
		}
		current = current[part] as Record<string, unknown>;
	}

	const leaf = parts.at(-1);
	if (!leaf) {
		return;
	}
	current[leaf] = value;
}

function sanitizeByField(field: SchemaField, input: unknown): unknown {
	switch (field.type) {
		case "boolean":
			return typeof input === "boolean" ? input : field.default;
		case "number": {
			const numberValue =
				typeof input === "number" && Number.isFinite(input)
					? input
					: field.default;
			return clamp(numberValue, field.min, field.max);
		}
		case "enum":
			return typeof input === "string" &&
				field.options.some((option) => option.value === input)
				? input
				: field.default;
		case "string": {
			const source = typeof input === "string" ? input : field.default;
			if (
				typeof field.maxLength === "number" &&
				source.length > field.maxLength
			) {
				return source.slice(0, field.maxLength);
			}
			if (
				typeof field.minLength === "number" &&
				source.length < field.minLength
			) {
				return field.default;
			}
			if (field.pattern) {
				try {
					if (!new RegExp(field.pattern).test(source)) {
						return field.default;
					}
				} catch {
					return source;
				}
			}
			return source;
		}
		case "keybinding": {
			if (typeof input !== "string") {
				return field.default;
			}
			const trimmed = input.trim();
			if (trimmed.length === 0 || trimmed.length > 24) {
				return field.default;
			}
			return trimmed.toUpperCase();
		}
	}
}

function normalizeValueBySchema(
	schema: PluginSettingsSchemaRuntime,
	value: unknown,
): Record<string, unknown> {
	const next: Record<string, unknown> = {};

	for (const section of schema.sections) {
		for (const field of section.fields) {
			const current = readPath(value, field.id);
			writePath(next, field.id, sanitizeByField(field, current));
		}
	}

	return next;
}

function createDefaultValueFromSchema(
	schema: PluginSettingsSchemaRuntime,
): Record<string, unknown> {
	const next: Record<string, unknown> = {};

	for (const section of schema.sections) {
		for (const field of section.fields) {
			writePath(next, field.id, field.default);
		}
	}

	return next;
}

function parseBooleanField(
	base: FieldBase,
	field: Record<string, unknown>,
): BooleanField {
	return {
		...base,
		type: "boolean",
		default: typeof field.default === "boolean" ? field.default : false,
	};
}

function parseNumberField(
	base: FieldBase,
	field: Record<string, unknown>,
): NumberField {
	const fallbackDefault = readFiniteNumber(field.default, 0);
	const min = readFiniteNumber(field.min, 0);
	const max = readFiniteNumber(field.max, 100);
	const normalizedMin = Math.min(min, max);
	const normalizedMax = Math.max(min, max);
	const rawStep = readFiniteNumber(field.step, 1);
	const step = rawStep > 0 ? rawStep : 1;
	const ui = field.ui === "input" ? "input" : "slider";

	return {
		...base,
		type: "number",
		default: clamp(fallbackDefault, normalizedMin, normalizedMax),
		min: normalizedMin,
		max: normalizedMax,
		step,
		ui,
	};
}

function parseEnumField(
	base: FieldBase,
	field: Record<string, unknown>,
): EnumField | null {
	const rawOptions = Array.isArray(field.options) ? field.options : [];
	const options = rawOptions
		.filter(isRecord)
		.map((option) => {
			const value = isNonEmptyString(option.value)
				? option.value.trim()
				: undefined;
			const label = isNonEmptyString(option.label)
				? option.label.trim()
				: undefined;
			return value && label ? { value, label } : null;
		})
		.filter(
			(option): option is { value: string; label: string } => option !== null,
		);

	if (options.length === 0) {
		return null;
	}

	const rawDefault = isNonEmptyString(field.default)
		? field.default.trim()
		: options[0].value;
	const defaultValue = options.some((option) => option.value === rawDefault)
		? rawDefault
		: options[0].value;

	return {
		...base,
		type: "enum",
		default: defaultValue,
		options,
	};
}

function parseStringField(
	base: FieldBase,
	field: Record<string, unknown>,
): StringField {
	const defaultValue = typeof field.default === "string" ? field.default : "";
	const minLength =
		typeof field.min_length === "number" && Number.isInteger(field.min_length)
			? Math.max(0, field.min_length)
			: undefined;
	const maxLength =
		typeof field.max_length === "number" && Number.isInteger(field.max_length)
			? Math.max(1, field.max_length)
			: undefined;
	const pattern = typeof field.pattern === "string" ? field.pattern : undefined;

	return {
		...base,
		type: "string",
		default: defaultValue,
		minLength,
		maxLength,
		pattern,
	};
}

function parseKeybindingField(
	base: FieldBase,
	field: Record<string, unknown>,
): KeybindingField {
	const defaultValue = isNonEmptyString(field.default)
		? field.default.trim().toUpperCase()
		: "K";
	const scope =
		field.scope === "global" ||
		field.scope === "viewer" ||
		field.scope === "plugin"
			? field.scope
			: "plugin";

	return {
		...base,
		type: "keybinding",
		default: defaultValue,
		scope,
	};
}

function parseField(fieldInput: unknown): SchemaField | null {
	if (!isRecord(fieldInput)) {
		return null;
	}

	if (!isNonEmptyString(fieldInput.id) || !isNonEmptyString(fieldInput.label)) {
		return null;
	}

	if (!isNonEmptyString(fieldInput.type)) {
		return null;
	}

	const base: FieldBase = {
		id: fieldInput.id.trim(),
		label: fieldInput.label.trim(),
		description: readOptionalString(fieldInput.description),
	};

	switch (fieldInput.type) {
		case "boolean":
			return parseBooleanField(base, fieldInput);
		case "number":
			return parseNumberField(base, fieldInput);
		case "enum":
			return parseEnumField(base, fieldInput);
		case "string":
			return parseStringField(base, fieldInput);
		case "keybinding":
			return parseKeybindingField(base, fieldInput);
		default:
			return null;
	}
}

function parseSection(sectionInput: unknown): SchemaSection | null {
	if (!isRecord(sectionInput)) {
		return null;
	}

	if (
		!isNonEmptyString(sectionInput.id) ||
		!isNonEmptyString(sectionInput.label)
	) {
		return null;
	}

	const rawFields = Array.isArray(sectionInput.fields)
		? sectionInput.fields
		: [];
	const fields = rawFields
		.map(parseField)
		.filter((field): field is SchemaField => field !== null);

	if (fields.length === 0) {
		return null;
	}

	return {
		id: sectionInput.id.trim(),
		label: sectionInput.label.trim(),
		description: readOptionalString(sectionInput.description),
		fields,
	};
}

function parseSettingsSchema(
	schemaJson: string,
	expectedPluginId: string,
): PluginSettingsSchemaRuntime | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(schemaJson);
	} catch {
		return null;
	}

	if (!isRecord(parsed)) {
		return null;
	}

	if (!isNonEmptyString(parsed.plugin_id)) {
		return null;
	}

	if (parsed.plugin_id.trim() !== expectedPluginId) {
		return null;
	}

	const presentation = parsed.presentation === "modal" ? "modal" : "inline";
	const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
	const sections = rawSections
		.map(parseSection)
		.filter((section): section is SchemaSection => section !== null);

	if (sections.length === 0) {
		return null;
	}

	return {
		pluginId: parsed.plugin_id.trim(),
		title: readOptionalString(parsed.title),
		description: readOptionalString(parsed.description),
		presentation,
		sections,
	};
}

function SchemaSettingsRenderer({
	schema,
	value,
	onChange,
}: PluginSettingsRendererProps & { schema: PluginSettingsSchemaRuntime }) {
	const normalized = useMemo(
		() => normalizeValueBySchema(schema, value),
		[schema, value],
	);

	const setFieldValue = (field: SchemaField, nextFieldValue: unknown) => {
		const nextSettings = normalizeValueBySchema(schema, value);
		writePath(nextSettings, field.id, sanitizeByField(field, nextFieldValue));
		onChange(nextSettings);
	};

	return (
		<div className="space-y-3">
			{schema.sections.map((section) => (
				<section
					key={section.id}
					className="rounded-xl border border-glass-border-base bg-glass-bg-subtle"
				>
					<div className="px-4 py-3 border-b border-glass-border-base">
						<p className="text-[11px] uppercase tracking-wider font-semibold text-foreground-subtle">
							{section.label}
						</p>
						{section.description && (
							<p className="text-[11px] text-foreground-muted mt-1">
								{section.description}
							</p>
						)}
					</div>
					<div className="divide-y divide-glass-border-base">
						{section.fields.map((field) => {
							const current = readPath(normalized, field.id);

							if (field.type === "boolean") {
								return (
									<SettingRow
										key={field.id}
										label={field.label}
										description={field.description}
									>
										<SettingToggle
											checked={current === true}
											onChange={(next) => setFieldValue(field, next)}
										/>
									</SettingRow>
								);
							}

							if (field.type === "number") {
								const currentNumber =
									typeof current === "number" ? current : field.default;
								return (
									<SettingRow
										key={field.id}
										label={field.label}
										description={field.description}
									>
										<div className="w-64 max-w-[42vw]">
											<div className="flex items-center justify-between text-[10px] text-foreground-subtle font-mono mb-1">
												<span>{formatNumberValue(field.min, field.step)}</span>
												<span className="text-foreground font-semibold">
													{formatNumberValue(currentNumber, field.step)}
												</span>
												<span>{formatNumberValue(field.max, field.step)}</span>
											</div>
											{field.ui === "input" ? (
												<input
													type="number"
													value={currentNumber}
													min={field.min}
													max={field.max}
													step={field.step}
													onChange={(event) => {
														setFieldValue(field, Number(event.target.value));
													}}
													className="w-full h-8 rounded-lg border border-glass-border-base bg-glass-bg-hover px-2 text-xs text-foreground outline-none focus:border-accent/40"
												/>
											) : (
												<input
													type="range"
													min={field.min}
													max={field.max}
													step={field.step}
													value={currentNumber}
													onChange={(event) => {
														setFieldValue(field, Number(event.target.value));
													}}
													className="w-full h-2.5 accent-accent cursor-pointer"
												/>
											)}
										</div>
									</SettingRow>
								);
							}

							if (field.type === "enum") {
								const currentValue =
									typeof current === "string" ? current : field.default;
								return (
									<SettingRow
										key={field.id}
										label={field.label}
										description={field.description}
									>
										<div className="w-48 max-w-[40vw]">
											<Dropdown
												value={currentValue}
												onChange={(next) => setFieldValue(field, next)}
												options={field.options}
											/>
										</div>
									</SettingRow>
								);
							}

							if (field.type === "string") {
								const currentValue =
									typeof current === "string" ? current : field.default;
								return (
									<SettingRow
										key={field.id}
										label={field.label}
										description={field.description}
									>
										<input
											type="text"
											value={currentValue}
											onChange={(event) =>
												setFieldValue(field, event.target.value)
											}
											minLength={field.minLength}
											maxLength={field.maxLength}
											className="w-56 max-w-[42vw] h-8 rounded-lg border border-glass-border-base bg-glass-bg-hover px-2 text-xs text-foreground outline-none focus:border-accent/40"
										/>
									</SettingRow>
								);
							}

							const currentKeybinding =
								typeof current === "string" ? current : field.default;
							return (
								<SettingRow
									key={field.id}
									label={field.label}
									description={field.description}
								>
									<div className="flex items-center gap-2">
										<input
											type="text"
											value={currentKeybinding}
											onChange={(event) =>
												setFieldValue(field, event.target.value)
											}
											className="w-20 h-8 rounded-lg border border-glass-border-base bg-glass-bg-hover px-2 text-xs text-foreground text-center font-mono outline-none focus:border-accent/40"
											maxLength={24}
										/>
										<span className="text-[10px] uppercase tracking-wider text-foreground-subtle font-semibold">
											{field.scope}
										</span>
									</div>
								</SettingRow>
							);
						})}
					</div>
				</section>
			))}
		</div>
	);
}

export function createPluginSettingsDefinitionFromSchema(
	schemaJson: string,
	expectedPluginId: string,
): PluginSettingsDefinition | null {
	const schema = parseSettingsSchema(schemaJson, expectedPluginId);
	if (!schema) {
		return null;
	}

	return {
		pluginId: schema.pluginId,
		presentation: schema.presentation,
		title: schema.title,
		description: schema.description,
		createDefaultValue: () => createDefaultValueFromSchema(schema),
		render: (props) => <SchemaSettingsRenderer schema={schema} {...props} />,
	};
}
