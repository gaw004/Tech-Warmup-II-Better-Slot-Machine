# AI Plan
**Strategy Owner:** Kareem Nabulsi

---

## Model
**Claude Sonnet** via Claude Code.

Sonnet is fast and capable enough for this project. We'll only switch to Opus if Sonnet repeatedly fails on a task.

---

## Approach
We prompt Claude Code in small steps — one feature at a time. We review the output, lint it, and commit before moving on.

```
Prompt → Review → Lint → Test → Commit → Repeat
```

---

## Prompting Strategy
- Keep prompts specific and scoped (e.g., "write a spinReels() function that returns a 3x3 symbol grid")
- If output is wrong, re-prompt with corrections before touching the code manually
- Hand-edits are a last resort and will be logged

---

## Code Quality Checklist (per feature)
- [ ] ESLint passes
- [ ] JSDoc comments on all functions
- [ ] Unit test written
- [ ] No duplicate code

---

## Rules We're Following
- No agent commits — each member commits under their own GitHub account
- Hand-edits only after a failed re-prompt attempt (logged in ai-use-log.md)
- All work lives in the repo
- Everyone works on individual branches

---

## Known Risks

| Risk | Fix |
|------|-----|
| Inconsistent code style | Run linter after every generation |
| Hallucinated APIs | Test immediately after generation |
| Context drift in long sessions | Start fresh session per module |

---

*See [ai-use-log.md](./ai-use-log.md) for real-time notes.*
