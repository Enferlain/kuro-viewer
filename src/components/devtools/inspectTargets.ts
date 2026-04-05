export interface InspectTarget {
	label: string;
	sourcePath: string;
	sourceLine?: number;
	sourceColumn?: number;
	kind?: string;
	area?: string;
	pluginId?: string;
	slot?: string;
}

const ATTRIBUTES = {
	label: "data-kuro-inspect-label",
	sourcePath: "data-kuro-inspect-source-path",
	sourceLine: "data-kuro-inspect-source-line",
	sourceColumn: "data-kuro-inspect-source-column",
	kind: "data-kuro-inspect-kind",
	area: "data-kuro-inspect-area",
	pluginId: "data-kuro-inspect-plugin-id",
	slot: "data-kuro-inspect-slot",
} as const;

export interface ResolvedInspectTarget extends InspectTarget {}

export function createInspectTargetAttrs(
	target: InspectTarget,
): Record<string, string> {
	if (!import.meta.env.DEV) {
		return {};
	}

	const attrs: Record<string, string> = {
		[ATTRIBUTES.label]: target.label,
		[ATTRIBUTES.sourcePath]: target.sourcePath,
	};

	if (target.kind) {
		attrs[ATTRIBUTES.kind] = target.kind;
	}
	if (typeof target.sourceLine === "number") {
		attrs[ATTRIBUTES.sourceLine] = String(target.sourceLine);
	}
	if (typeof target.sourceColumn === "number") {
		attrs[ATTRIBUTES.sourceColumn] = String(target.sourceColumn);
	}
	if (target.area) {
		attrs[ATTRIBUTES.area] = target.area;
	}
	if (target.pluginId) {
		attrs[ATTRIBUTES.pluginId] = target.pluginId;
	}
	if (target.slot) {
		attrs[ATTRIBUTES.slot] = target.slot;
	}

	return attrs;
}

export function resolveInspectTarget(
	element: HTMLElement,
): ResolvedInspectTarget | null {
	const owner = element.closest<HTMLElement>(`[${ATTRIBUTES.sourcePath}]`);
	if (!owner) {
		return null;
	}

	const sourcePath = owner.getAttribute(ATTRIBUTES.sourcePath);
	const label = owner.getAttribute(ATTRIBUTES.label);
	if (!sourcePath || !label) {
		return null;
	}

	return {
		label,
		sourcePath,
		sourceLine: parseOptionalPositiveInt(
			owner.getAttribute(ATTRIBUTES.sourceLine),
		),
		sourceColumn: parseOptionalPositiveInt(
			owner.getAttribute(ATTRIBUTES.sourceColumn),
		),
		kind: owner.getAttribute(ATTRIBUTES.kind) ?? undefined,
		area: owner.getAttribute(ATTRIBUTES.area) ?? undefined,
		pluginId: owner.getAttribute(ATTRIBUTES.pluginId) ?? undefined,
		slot: owner.getAttribute(ATTRIBUTES.slot) ?? undefined,
	};
}

function parseOptionalPositiveInt(value: string | null): number | undefined {
	if (!value) {
		return undefined;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
