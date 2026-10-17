# Release changelog

Write concise release notes for users in plain English.

- Include only changes users can notice or benefit from. Explain their practical effect, not implementation details.
- Use commits between the previous release tag and the current release tag as the source of truth. If there is no previous tag, use the available project history.
- Skip purely internal work, including refactors, tests, CI, build tooling, dependency updates, and maintenance.
- Group relevant notes under New, Fixed, or Removed. Omit empty sections.
- Start with a heading containing the exact release version.
- Describe removals only as removals; never present them as new features.
- Do not invent behavior. Return only Markdown. GitLab publishes this text as the release description.
