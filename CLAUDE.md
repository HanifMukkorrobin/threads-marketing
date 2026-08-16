# Project Guidelines & Superpowers Protocol

## Superpowers Protocol Enforcement

Always strictly follow the **Superpowers** workflow and discipline (`superpowers:using-superpowers`) on every session and task in this project:

1. **Invoke Skills Before Any Action**:
   - Before taking action, writing code, exploring the codebase, or asking clarifying questions, check available skills and invoke the relevant one.
   - Announce `"Using [skill] to [purpose]"` and follow the skill instructions precisely.

2. **Skill Priority & Workflow**:
   - **New Features / UI / Functionality**: Invoke `superpowers:brainstorming` first to explore requirements and design before jumping into implementation or plans.
   - **Planning**: After brainstorming or receiving a clear specification, invoke `superpowers:writing-plans`.
   - **Execution**: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`.
   - **Bug Fixes / Issues**: Always invoke `superpowers:systematic-debugging` before proposing fixes.
   - **Implementation**: Follow `superpowers:test-driven-development` when writing features or bugfixes.
   - **Completion & Verification**: Invoke `superpowers:verification-before-completion` before claiming work is finished.

3. **Task Tracking**:
   - Maintain a task artifact markdown checklist for multi-step tasks and keep it updated throughout execution.
