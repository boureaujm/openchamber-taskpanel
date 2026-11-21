# Spec Delta

## Purpose

Defines which Markdown checkbox lines represent task-plan items so examples and snippets are not mistaken for work in the plan.

## ADDED Requirements

### Requirement: Fenced Code Does Not Contain Plan Tasks
The task parser SHALL ignore checkbox-like lines inside fenced Markdown code blocks.

#### Scenario: Checkbox example is fenced
- **WHEN** a Markdown plan contains a task-shaped checkbox line inside a fenced code block
- **THEN** that line is not parsed as a task

#### Scenario: Checkbox outside a fence remains a task
- **WHEN** a Markdown plan contains a task-shaped checkbox line outside fenced code blocks
- **THEN** that line is parsed as a task

### Requirement: Behavior Changes Have Automated Test Evidence
Every change to behavior defined by this capability SHALL be covered by automated regression tests that exercise the affected scenarios.

#### Scenario: Task parsing behavior changes
- **WHEN** a behavior in this capability is implemented or changed
- **THEN** automated tests demonstrate the affected scenarios and fail if the specified behavior regresses
