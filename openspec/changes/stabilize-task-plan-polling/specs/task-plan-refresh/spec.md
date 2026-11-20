# Spec Delta

## Purpose

Defines how the task panel discovers and refreshes plans, keeps the selected plan current, and reports loading failures without disrupting a valid view.

## ADDED Requirements

### Requirement: Periodic Refresh Reads Only the Selected Plan
The task panel SHALL refresh the selected plan on its existing polling interval without rediscovering plan files during each poll.

#### Scenario: Periodic refresh
- **WHEN** the periodic refresh interval elapses while a plan is selected
- **THEN** the panel rereads the selected plan without scanning the project for plans

### Requirement: Plan Discovery Runs on Defined Events
Automatic plan discovery SHALL run at project startup, when the project directory changes, and when the user explicitly requests a refresh.

#### Scenario: Project opens or changes
- **WHEN** a project opens or the active project directory changes
- **THEN** the panel discovers available plans in that project

#### Scenario: User requests refresh
- **WHEN** the user explicitly requests a refresh
- **THEN** the panel rediscovers available plans and refreshes the selected plan

### Requirement: Plan Discovery Skips Dependency and Generated Directories
Automatic plan discovery SHALL NOT descend into dependency or generated-output directories, including `node_modules`, `dist`, `.next`, and `vendor`.

#### Scenario: Discovery encounters an excluded directory
- **WHEN** automatic plan discovery encounters `node_modules`, `dist`, `.next`, or `vendor`
- **THEN** it does not list that directory or inspect its descendants for plans

### Requirement: Unchanged Plan Refresh Preserves the Current View
When a refresh returns the same plan content, the panel SHALL NOT replace the rendered plan, SHALL preserve keyboard focus, and SHALL NOT cause the unchanged plan content to be announced again to assistive technology.

#### Scenario: Selected plan has not changed
- **WHEN** a refresh reads content identical to the content currently displayed
- **THEN** the panel does not replace the current view or cause it to be re-announced

### Requirement: Unchanged Empty and Error States Preserve the Current View
Repeated refreshes that produce the same empty or selected-plan read-error state SHALL NOT replace the rendered view.

#### Scenario: No plan is selected
- **WHEN** a refresh occurs while no plan is selected and the empty state is already displayed
- **THEN** the panel does not replace the empty state

#### Scenario: The same selected-plan read error recurs
- **WHEN** a refresh fails to read the same selected plan and its error state is already displayed
- **THEN** the panel does not replace the existing error state

### Requirement: Latest Plan Selection Wins
After the user selects a plan, a result from an earlier plan load SHALL NOT replace the newly selected plan.

#### Scenario: Older read completes after a new selection
- **WHEN** a read for plan A is still in flight after the user selects plan B
- **THEN** plan A's result does not replace plan B in the panel

### Requirement: Selected Plan Read Failures Are Reported
The panel SHALL report an error when reading the selected plan fails.

#### Scenario: Selected plan cannot be read
- **WHEN** reading the selected plan fails
- **THEN** the panel reports that the selected plan could not be read

### Requirement: Ancillary Update Failures Preserve Readable Plans
The panel SHALL retain successfully read plan content when updating stored selection or badge state fails.

#### Scenario: Ancillary update fails after a successful read
- **WHEN** the selected plan is read successfully but updating stored selection or badge fails
- **THEN** the panel continues displaying the successfully read plan without reporting a plan-read error

### Requirement: Behavior Changes Have Automated Test Evidence
Every change to behavior defined by this capability SHALL be covered by automated regression tests that exercise the affected scenarios.

#### Scenario: Plan refresh behavior changes
- **WHEN** a behavior in this capability is implemented or changed
- **THEN** automated tests demonstrate the affected scenarios and fail if the specified behavior regresses
