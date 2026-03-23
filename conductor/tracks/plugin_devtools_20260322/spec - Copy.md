# Track Specification: Plugin Workspace And Devtools

## Goal

Make it practical to develop plugins inside this repo without editing base app
files as part of normal plugin work.

This track is about giving plugin authors a frictionless workflow:

- create or register a plugin workspace
- validate it against the host contract
- reload it while the app is running
- inspect app UI and plugin surfaces during development
- understand what the host exposes without digging through base code

## Why This Is A Separate Track

The current plugin-system closeout work is mostly end-user and host-safety
oriented:

- install and uninstall
- manifest/schema validation
- settings persistence
- lifecycle safety

This track is different. It is about the developer loop for authors working on
plugins inside `plugins/`.

## Current Baseline

The repo already has:

- a user-facing Plugins settings tab
- plugin archive install, inspect, list, and uninstall
- host-rendered settings UI from `settings.schema.json`
- schema validation and fail-closed behavior
- a new extracted plugin workspace at `plugins/forensics-suite/`

The repo does not yet have:

- workspace plugin discovery
- a dev-only plugin tooling surface
- plugin workspace reload support
- plugin scaffolding from inside the app
- UI inspection tooling for plugin authors
- a supported local build/package workflow for plugin workspaces

## Desired Outcome

In dev mode, the app should support plugin authors directly.

A developer should be able to:

- create a plugin workspace from a minimal scaffold
- register an existing plugin folder that was created outside the app
- validate manifest and settings schema immediately
- reload a workspace plugin without touching base files
- inspect the UI and understand where plugin hooks or slots belong
- open relevant source in their editor from the app

## Design Direction

### Separate From User Settings

This should not primarily live in the normal user-facing Settings > Plugins
surface.

User-facing plugin management and developer-facing plugin tooling are different
jobs.

Preferred direction:

- keep `Settings > Plugins` focused on installed plugins and user management
- add a separate dev-only `Plugin Devtools` surface

## Initial Devtools Shape

The first version should stay small and app-specific, not framework-sized.

### Plugin Devtools Surface

Dev-only panel or modal with traits such as:

- movable or draggable
- minimizable or hideable
- optionally translucent or low-emphasis while inspecting the app

### Core Modes

- `Inspect`: identify clicked UI, related source, and plugin-relevant context
- `Plugins`: show workspace plugins, validation state, reload, and registration
- `State`: show manifest/schema/settings/runtime diagnostics
- `Logs`: show load errors or validation failures

## Author Workflow Principles

- plugin code should live in `plugins/`, not in base app files
- plugin authors should be able to start from either a scaffold or an existing
  folder
- validation should be automatic and fail closed
- the app should explain what is wrong rather than silently ignoring invalid
  plugin workspaces

## Explicitly Out Of Scope For This Track

- turning Kuro into a general plugin framework
- a full IDE inside the app
- unrestricted in-app source editing
- marketplace or remote distribution features

## Success Criteria

- dev mode can discover and surface workspace plugins
- authors can scaffold or register plugin workspaces without editing base files
- authors can reload a workspace plugin from inside the app
- validation failures are clear and actionable
- the devtools surface helps authors understand host capabilities and likely
  integration points
- the tooling remains clearly separate from normal user settings
