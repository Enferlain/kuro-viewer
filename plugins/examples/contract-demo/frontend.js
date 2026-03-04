/**
 * Contract Demo frontend entry.
 *
 * This file intentionally keeps runtime behavior minimal.
 * It documents the target shape plugin authors should export once
 * dynamic frontend loading is wired for external plugins.
 */

export default {
	id: "contract-demo",
	slots: {
		panel: () => null,
	},
	settings: {
		schemaPath: "settings.schema.json",
		presentation: "modal",
		title: "Contract Demo Settings",
		description: "Fake controls to validate host settings surfaces.",
	},
};
