# PROJECT CONSTITUTION & PHILOSOPHY

## 1. Zero Over-Engineering (零过度设计)
- **Rule**: Always choose the simplest possible implementation.
- **Prohibition**: Do NOT use meta-frameworks (Next.js, Nuxt, SvelteKit, Remix) unless explicitly requested.
- **Default**: Use Vite + [Library] (SPA mode) for all frontend tasks.
- **Philosophy**: We prefer "Worse is Better" simplicity over "Correct" complexity.

## 2. Atomic Changes (原子化变更)
- **Rule**: Never refactor the entire architecture in one step.
- **Process**: 
  1. Plan the change.
  2. Modify ONE component or file.
  3. Verify it works.
  4. Move to the next.
- If a user asks for a rewrite, break it down into 3+ steps internally before executing.

## 3. Stability First (稳定性优先)
- **Rule**: Existing features must NOT break when adding new ones (Regression Testing).
- **Check**: Before finalizing any code, ask yourself: "Did I break the build? Did I break the 'Add Task' button?"

## 4. Tech Stack Constraints (技术栈约束)
- **Allowed**: HTML, CSS (Tailwind), JS (ES6+), Svelte (Vite), LocalStorage.
- **Banned**: TypeScript (unless asked), SSR (Server Side Rendering), Docker (unless asked), Complex State Management (Redux/Pinia) - use simple Stores.

## 5. Verification Process (验证流程)
- **Problem**: `npm run dev` is a blocking server process. Do NOT use it for checking errors.
- **Rule**: When you want to verify if your code works/compiles:
  - Use `npm run build` (or `npx vite build`).
  - OR use `npx svelte-check` (if available).
- **Process**:
  1. Edit code.
  2. Run `npm run build` to catch syntax/build errors.
  3. If it fails, read the log and fix.
  4. If it passes, assume the code is valid.
- **Exception**: Only run `npm run dev` if the user explicitly asks "Start the server" as the FINAL step.

---

### 马斯克会怎么做？(The Musk Algorithm applied to AI)

如果马斯克在管理这个 AI 团队，他会强制执行 **"The Algorithm"** 的五步法。对应到我们使用 OpenCode 的策略上：

1.  **质疑需求 (Question the Requirements)**：
    *   AI 说：“为了状态管理，我建议引入 Redux。”
    *   马斯克式回答：“**驳回。** 你的需求是错的。这个应用只有 3 个状态，用全局变量或者 Svelte Store 足够了。蠢货。”

2.  **删除零件 (Delete the Part)**：
    *   AI 生成了 `vite.config.js`, `svelte.config.js`, `.prettierrc`, `.eslintrc`。
    *   马斯克式操作：**删掉。** 只需要 `index.html` 和 `main.js` 能跑起来就行。如果跑不起来，再加回来（但通常不需要加回来）。

3.  **简化与优化 (Simplify or Optimize)**：
    *   永远不要让 AI 一次性重构整个项目。
    *   **指令技巧**：“只重构 `Sidebar` 组件。不要动其他任何东西。确信能跑了再告诉我。”

4.  **加快迭代周期 (Accelerate Cycle Time)**：
    *   不要等 AI 写完 500 行代码再去跑 `npm run dev`。
    *   **指令技巧**：“每写完一个函数，就给我输出一段测试代码。我要看到它现在就能跑。”

5.  **自动化 (Automate)**：
    *   这就是你正在做的——试图配置 OpenCode 让它自动遵守规则。

---

如果我在大的改动之后忘记，那么你提醒我
"Review logic. Remove redundant code. Simplify state management. Can we make xxx under 400 lines without splitting files?"
Removing whitespace and compressing CSS is NOT simplification. It makes the code unmaintainable.
    Rule: Readability > Line Count.
    Do not delete comments or necessary spacing.

---

