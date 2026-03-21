# Track Specification: Plugin System 1.0 Closeout

## Goal

Finish the remaining work needed for the current plugin system to feel safe,
predictable, and usable for real third-party plugins.

This track is no longer about the initial bootstrap. Manifest validation,
install inspection, install and uninstall flows, schema-driven Configure UI, and
basic settings persistence already exist in the repo.

## Current Implemented Baseline

The host already supports:

- inspect-before-install flow
- manifest validation
- hardened archive extraction with staging and rollback
- installed plugin listing and uninstall
- host-rendered Configure UI from `settings.schema.json`
- persisted plugin settings in app settings
- host-side settings schema validation with fail-closed behavior

## Remaining Scope

- finish plugin lifecycle work beyond install and uninstall
- complete remaining security hardening for the current archive and schema model
- improve responsiveness and startup behavior for larger plugin counts
- add conflict management for plugin-provided hotkeys
- tighten schema-driven settings UI parity and polish
- fill testing, manual QA, and authoring-doc gaps

## Explicitly Out Of Scope For This Track

- a full marketplace or remote registry
- full `wasmtime` runtime execution for arbitrary backend plugins
- advanced plugin UI slot mounting beyond what is needed to close current 1.0
  host behavior
- forensics algorithm parity work unrelated to the host plugin platform itself

## Success Criteria

- install, inspect, list, uninstall, and enable-disable flows are supported and
  test-covered
- plugin settings persist correctly through apply, cancel, restart, reinstall,
  and uninstall scenarios
- invalid or malicious plugin settings schemas fail closed in a clear way
- plugin list and configure flows remain responsive as plugin count grows
- plugin docs clearly describe supported-now behavior versus planned behavior
