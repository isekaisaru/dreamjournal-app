# Morpheusヒーロー基盤(#1) Implementation Plan

> **For agentic workers:** Implement this plan with TDD. Keep the change visual-only and do not touch auth, DB, Stripe, routing logic, or forest-specific Morpheus work.

**Goal:** Upgrade `MorpheusHero` into the token-driven hero primitive for the full-screen redesign path, using #0 tokens for responsive size, glow, and float.

**Architecture:** Add `cssSize` to `MorpheusImage` for CSS-driven square rendering while preserving numeric intrinsic dimensions for `next/image`. Make `MorpheusHero` default to `var(--morpheus-hero)`, add a decorative `animate-moon-pulse` glow ring, and add `animate-morpheus-float` to the image wrapper. Remove fixed hero sizes from current MorpheusHero consumers.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, Jest, Testing Library, framer-motion.

## Global Constraints

- Presentation-only change. Do not alter authentication, data fetching, Stripe, DB, migrations, rake tasks, or forest screen behavior.
- Preserve backward compatibility: explicit numeric `size` on `MorpheusHero` / `MorpheusImage` must still render fixed-size images.
- Do not convert small inline `MorpheusImage` usages to hero behavior. This pass is only for `MorpheusHero` and its current full-screen consumers.
- Do not touch `frontend/public/images/morpheus/generated/`.

## Tasks

- [ ] Add failing tests for `MorpheusImage`.
  - `cssSize` uses intrinsic `320` by default and renders via CSS width/height.
  - numeric `size` without `cssSize` preserves existing fixed rendering.

- [ ] Add failing tests for `MorpheusHero`.
  - renders title/message.
  - renders a decorative `animate-moon-pulse` glow ring.
  - defaults to `var(--morpheus-hero)`.
  - explicit numeric `size` remains a fixed-size escape hatch.

- [ ] Implement `MorpheusImage.cssSize`.
  - Add `cssSize?: string`.
  - Use `size ?? 320` as intrinsic size when `cssSize` exists.
  - Apply `style={{ width: cssSize, height: cssSize }}` and `sizes={cssSize}`.
  - Preserve fallback SVG behavior.

- [ ] Upgrade `MorpheusHero`.
  - Remove the internal default fixed `size`.
  - Pass `cssSize="var(--morpheus-hero)"` when no numeric `size` override is supplied.
  - Add `animate-moon-pulse` decorative ring.
  - Add `motion-safe:animate-morpheus-float` to the image wrapper.

- [ ] Remove fixed hero sizes from current consumers.
  - `frontend/app/home/page.tsx`
  - `frontend/app/subscription/page.tsx`
  - `frontend/app/login/page.tsx`
  - `frontend/app/components/MorpheusLoginRequired.tsx`
  - `frontend/app/components/MorpheusGuide.tsx`

- [ ] Validate.
  - `npx jest __tests__/components/MorpheusImage.test.tsx __tests__/components/MorpheusHero.test.tsx --runInBand`
  - `npx jest --runInBand`
  - Build or equivalent check. If build is blocked by a pre-existing Next page export/type issue, document the exact failure.
