# Design

## Context

See `proposal.md` for motivation. The panel already filters completed rows through its visibility state and calculates progress from the full task list; only the initial visibility value conflicts with the intended behavior.

## Goals / Non-Goals

**Goals:**

- Make the initial panel state hide completed rows while preserving the existing toggle and full-plan progress calculations.
- Keep the change local to panel state initialization and its regression tests.

**Non-Goals:**

- Persist the visibility choice across panel sessions.
- Change task parsing, progress formulas, section grouping, or the toggle interaction.

## Decisions

- Initialize the existing visibility state as hidden instead of adding storage or a new setting. This uses the current visibility control and avoids changing session persistence semantics.
- Continue deriving progress and section counts from the complete parsed task list; filtering remains limited to rendered task rows.

## Risks / Trade-offs

- [Users expect their previous visibility choice to persist] → The current choice is not persisted; this change only defines the initial state and does not introduce persistence.

## Migration Plan

No data migration is needed. Reverting the initialization and its regression tests restores the previous default.
