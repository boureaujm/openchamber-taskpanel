# Spec Delta

## Purpose

Defines the default visibility of completed plan tasks and ensures that hiding task rows does not change progress information.

## ADDED Requirements

### Requirement: Completed Tasks Are Hidden on Initial Load
When a plan is first displayed, the task panel SHALL hide completed task rows by default.

#### Scenario: Plan contains completed and unfinished tasks
- **WHEN** the panel initially displays a plan containing completed and unfinished tasks
- **THEN** only unfinished task rows are visible

### Requirement: Users Can Reveal Completed Tasks
The task panel SHALL allow users to reveal completed task rows through its completed-task visibility control.

#### Scenario: User enables completed-task visibility
- **WHEN** the user activates the completed-task visibility control
- **THEN** completed task rows become visible

### Requirement: Hidden Tasks Remain in Progress Totals
Progress percentages, completed-task totals, and section counts SHALL include completed tasks whether or not their rows are visible.

#### Scenario: Completed task rows are hidden
- **WHEN** the panel hides completed task rows
- **THEN** progress and section counts still reflect all tasks in the plan

### Requirement: Behavior Changes Have Automated Test Evidence
Every change to behavior defined by this capability SHALL be covered by automated regression tests that exercise the affected scenarios.

#### Scenario: Completed-task visibility behavior changes
- **WHEN** a behavior in this capability is implemented or changed
- **THEN** automated tests demonstrate the affected scenarios and fail if the specified behavior regresses
