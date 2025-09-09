# INTAJ — Kickstart Prompts (senior prompt engineer)

> A ready-to-queue, step-by-step list of prompts you can paste into GitHub Copilot Chat, ChatGPT, or any coding LLM to scaffold, build, and launch the Intaj MVP. Follow the prompts in order (1 → N). Each prompt specifies _where to run it_ (Copilot/ChatGPT/Terminal), _context_, _expected outputs_, and _commit message suggestions_.

---

## How to use this file

1. **Run prompts in order**. Each prompt builds on the previous one.
2. Use **Copilot Chat** or **ChatGPT** for code generation prompts that ask for full files. Use **Terminal** for initialization commands the prompts output. For Copilot, open the repo and paste the prompt into Copilot Chat so it can write files directly in your project. For ChatGPT, copy the LLM output into files manually or ask the LLM to create a gist.
3. When a prompt asks for "create these files", accept or copy/paste generated content into the corresponding files in your repo.
4. Commit often with the suggested commit messages.

---

### ORDER: Foundations → Core Features → Integrations → Launch → Growth

---

## Prompt 001 — Project & repo initialization

**Use with:** Terminal + Copilot/ChatGPT (for file contents)

**Context:** Repo name: `intaj`. Tech: Next.js 15 (App Router), TypeScript, Tailwind, Shadcn UI, Supabase, Stripe, OpenRouter.

**Prompt (paste into Copilot Chat / ChatGPT):**

```
You are a senior full-stack engineer. Generate the exact shell commands and brief explanation to:
1. Create a new GitHub repo named `intaj` (local folder), initialize git, and create main branch.
2. Initialize a Next.js 15 TypeScript project with App Router in `intaj` (use `npm init next-app@latest --typescript`).
3. Install and configure Tailwind CSS, PostCSS, autoprefixer, Shadcn UI base setup, and TypeScript linting (ESLint + Prettier).

Provide the commands, and then create the following files (skeleton contents):
- .gitignore
- README.md (minimal placeholder)
- package.json scripts for: dev, build, start, lint, format

Output only the shell commands first, then a short checklist of the files created with one-line description each.
```

**Expected output:** Shell commands to run locally and a file checklist.

**Commit message:** `chore: init nextjs repo and basic tooling`

---

## Prompt 002 — Project structure & starter README

**Use with:** Copilot Chat / ChatGPT

**Context:** After running Prompt 001 you have the repo skeleton.

**Prompt:**

```
You are a senior developer. Create a detailed README.md for the Intaj repo (MVP-first). Include: project description, tech stack, quick start (install, env vars, run), file structure, contribution note, and links to the DB schema file `db/DB_DESCRIPTION.md`. Keep it concise but actionable so a junior dev can get started in 10 minutes.

Output the full README.md content in markdown.
```

**Expected output:** Complete README.md content. Place into `README.md`.

**Commit message:** `docs: add README`

---

## Prompt 003 — Add DB folder and initial schema file

**Use with:** Copilot Chat / ChatGPT

**Context:** We already defined the schema earlier. Now create database migration SQL and DB_DESCRIPTION file.

**Prompt:**

```
You are a senior backend engineer. Create a `db/` folder and inside it:
1. `database_updates.sql` file containing the SQL create statements for the following tables (with types and sensible defaults): profiles, chatbots, messages, faqs, data_sources, connections, workflows. Use Postgres SQL syntax and gen_random_uuid() defaults. Add indices on frequent lookup columns (chatbot_id, user_id, created_at).
2. `DB_DESCRIPTION.md` that documents each table with columns and purpose (short descriptions).

Output both files in full.
```

**Expected output:** `db/database_updates.sql` and `db/DB_DESCRIPTION.md`.

**Commit message:** `db: add initial schema and descriptions`

---

## Prompt 004 — Supabase project setup checklist

**Use with:** Terminal + ChatGPT (instructions)

**Prompt:**

```
You are a senior cloud engineer. Provide an exact step-by-step checklist to create a Supabase project for Intaj (no UI screenshots, only instructions):
- How to create the project, add the DB schema (from db/database_updates.sql), enable pgvector extension (if using vector search), enable RLS policies, create storage bucket for files, and set service role keys.
- Exact env vars to copy into `.env.local` (names and placeholder values): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
- A simple RLS policy recommendation for messages and chatbots (only owners can read/write their data).

Output the checklist with commands and SQL snippets where needed.
```

**Expected output:** Actionable checklist + RLS snippet.

**Commit message:** `chore: document supabase setup`

---

## Prompt 005 — Setup environment and secrets format

**Use with:** Copilot Chat / ChatGPT

**Prompt:**

```
You are a senior devops/SRE. Produce a secure `.env.local.example` file content listing every environment variable the app will need for MVP. Include comments describing each variable. Variables must include: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY, STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, VERCEL_URL (optional), DATABASE_URL (if direct), and a symmetric key for AES-256-GCM named ENC_MASTER_KEY (32 bytes placeholder). Output only the `.env.local.example` file content.
```

**Expected output:** `.env.local.example` content.

**Commit message:** `chore: add env example`

---

## Prompt 006 — Setup Tailwind + Shadcn base UI

**Use with:** Copilot Chat

**Prompt:**

```
You are a frontend engineer. Generate the minimal set of files and code to configure Tailwind CSS and Shadcn UI in a Next.js 15 TypeScript app (App Router). Create `tailwind.config.cjs`, `postcss.config.cjs`, and example root layout `src/app/layout.tsx` using shadcn patterns and Tailwind. Add a simple dark-mode toggle in the layout and include global styles import.

Output full file contents and explain where to paste them.
```

**Expected output:** Tailwind + layout files.

**Commit message:** `chore: setup tailwind and base layout`

---

## Prompt 007 — Supabase Auth integration (signup/login)

**Use with:** Copilot Chat

**Context:** Use Supabase Auth with email/password and OAuth later.

**Prompt:**

```
You are a senior full-stack developer. Implement Supabase Auth integration for Next.js App Router. Create `src/lib/supabaseClient.ts` (client wrapper), `src/app/(auth)/login/page.tsx` and `src/app/(auth)/signup/page.tsx` pages with simple Shadcn UI forms. Include server actions or client hooks for sign-in/sign-up, and redirect to `/dashboard` on success. Provide code for session protection: a `requireUser` server action that redirects to login if not authenticated.

Output full TypeScript files.
```

**Expected output:** Files created and ready to paste.

**Commit message:** `feat: add supabase auth and auth pages`

---

## Prompt 008 — Profiles table wiring and onboarding checklist

**Use with:** Copilot Chat

**Prompt:**

```
You are a backend engineer. Create an API function and UI to ensure a `profiles` row exists after user signs up. Implement a `POST /api/profiles/create` server action that creates profile row from auth.user and returns profile. Add an onboarding checklist UI component (Shadcn) that appears on first login prompting to "Create your first bot" and stores completion in `profiles.onboarded`.

Output code for API route and UI component.
```

**Expected output:** API route + onboarding component.

**Commit message:** `feat: create profiles on signup and add onboarding checklist`

---

## Prompt 009 — Chatbot CRUD (create, list, edit)

**Use with:** Copilot Chat

**Prompt:**

```
You are a senior full-stack dev. Implement CRUD for chatbots:
- `src/app/dashboard/chatbots/page.tsx` — list user's chatbots with create button.
- `src/app/dashboard/chatbots/[id]/page.tsx` — edit chatbot name, model selection, settings JSON editor, and delete.
- Server actions for create/update/delete that enforce ownership (use supabase row-level rules).

Provide TypeScript + React code for pages and server actions. Keep UI minimal but clean using Shadcn.
```

**Expected output:** Chatbot CRUD pages and API code.

**Commit message:** `feat: chatbots CRUD`

---

## Prompt 010 — FAQ & File Upload (data_sources)

**Use with:** Copilot Chat

**Prompt:**

```
You are a senior dev. Add an interface to upload files (pdf/docx) into Supabase Storage and save metadata into `data_sources` table. Also create a FAQ editor UI where the user can add/edit FAQ pairs saved to `faqs` table. Ensure file uploads show upload progress and preview of uploaded files.

Provide full React components and server actions.
```

**Expected output:** Upload component and FAQ UI.

**Commit message:** `feat: add faq and file upload`

---

## Prompt 011 — Embeddings extraction & vector search (MVP)

**Use with:** Copilot Chat

**Context:** Use OpenRouter/OpenAI for embeddings. Use pgvector extension in Supabase if available.

**Prompt:**

```
You are a senior ML infra engineer. Implement a basic embeddings pipeline:
1. A server action `src/lib/embeddings.ts` that accepts file text or FAQ text, calls OpenRouter/OpenAI embeddings API, and stores vectors in a `vectors` table (create SQL for `vectors` if necessary) using pgvector.
2. A search helper `queryVectorStore(chatbot_id, query)` that returns top-k matching docs with similarity scores.

Provide SQL schema for vectors, TypeScript server functions, and example usage when searching during chat.
```

**Expected output:** SQL and TypeScript embedding store and search helper.

**Commit message:** `feat: add embeddings pipeline and vector search`

---

## Prompt 012 — Chat UI & streaming responses

**Use with:** Copilot Chat

**Prompt:**

```
You are a senior frontend engineer. Build a production-ready chat interface in `src/app/chat/[chatbotId]/page.tsx` that:
- Shows message history from `messages` table.
- Sends user message to a server action `/api/chat/stream`.
- Receives streaming responses from OpenRouter/OpenAI and appends assistant tokens as they arrive (server-sent events or web streaming fetch).
- Saves messages to DB (user message and assistant final message).

Provide the code for the chat page, message components, and the streaming server route handler (Node/Edge-compatible) that connects to OpenRouter with streaming. Handle network interruptions gracefully.
```

**Expected output:** Chat UI + server streaming handler.

**Commit message:** `feat: add chat UI and streaming handler`

---

## Prompt 013 — OpenRouter wrapper + fallback

**Use with:** Copilot Chat

**Prompt:**

```
You are an experienced backend engineer. Create `src/lib/openrouter.ts` that:
- Provides a `streamChatResponse({model, messages, onToken})` function which connects to OpenRouter streaming endpoint, handles chunk parsing, and invokes `onToken` for each token.
- Provides a fallback to OpenAI if OpenRouter returns an error.
- Rate-limits requests per user (basic token bucket using DB table `rate_limits`).

Output TypeScript code suitable for Next.js server environment.
```

**Expected output:** OpenRouter wrapper module.

**Commit message:** `feat: add openrouter wrapper with streaming and fallback`

---

## Prompt 014 — Messages retention & free-tier limits

**Use with:** Copilot Chat

**Prompt:**

```
You are a product-minded backend engineer. Implement a server-side middleware or server action that enforces free-tier usage caps per profile. Rules:
- Free plan: 500 messages / month (configurable).
- Pro plan: unlimited.
Create `src/lib/usage.ts` with functions `incrementUsage(userId)` and `checkUsageLimit(userId)` that returns boolean and throws if over limit.

Also implement DB schema for `usage_metrics` table.
```

**Expected output:** usage functions and schema.

**Commit message:** `feat: add usage tracking and free-tier enforcement`

---

## Prompt 015 — Embeddable Website Widget

**Use with:** Copilot Chat

**Prompt:**

```
You are a senior frontend engineer. Create an embeddable chat widget that customers can copy-paste into any website. Requirements:
- A small JS snippet that injects an iframe and loads a hosted widget from `https://<VERCEL_URL>/widget.js`.
- Widget should render a minimal chat UI and authenticate with a short-lived token from our API (widget session token endpoint).
- Provide code for: `src/pages/widget.js` (served as `widget.js`), `src/app/widget/[id]/page.tsx` (widget UI), and server API to generate widget session tokens.

Produce the widget snippet for customers to paste and the server-side code generating widget tokens.
```

**Expected output:** widget snippet + server code.

**Commit message:** `feat: add embeddable website widget`

---

## Prompt 016 — Stripe Checkout + webhook handling

**Use with:** Copilot Chat

**Prompt:**

```
You are a senior backend engineer. Add Stripe integration using hosted Checkout sessions and a webhook handler:
- Create `src/app/api/stripe/create-checkout-session/route.ts` that creates a Checkout session (product ids: Free, Pro) and returns session URL.
- Create `src/app/api/stripe/webhook/route.ts` to handle `checkout.session.completed` events: verify signature, update `profiles.subscription` and store `stripe_customer_id` in profiles.
- Include security notes for verifying webhook signature and idempotency.

Output full route code and testing instructions with `stripe-cli`.
```

**Expected output:** Stripe routes and instructions.

**Commit message:** `feat: add stripe checkout and webhook handling`

---

## Prompt 017 — Admin dashboard (basic analytics)

**Use with:** Copilot Chat

**Prompt:**

```
You are a product focused developer. Create a minimal admin dashboard at `/admin` that shows:
- Total users, total chatbots, messages last 30 days, top 10 bots by messages.
- Simple filters (date range).
Add server functions that return aggregated metrics from `usage_metrics` and `messages` tables.

Only accessible to users with `is_admin` flag in `profiles`.

Output admin page code and server helpers.
```

**Expected output:** Admin page + server helpers.

**Commit message:** `feat: add admin analytics dashboard`

---

## Prompt 018 — Security: AES-256-GCM credential encryption helper

**Use with:** Copilot Chat

**Prompt:**

```
You are a senior security engineer. Implement an AES-256-GCM helper in TypeScript `src/lib/crypto.ts` with functions `encryptJSON(obj, key)` and `decryptJSON(ciphertext, key)`. Use Web Crypto API (Node/Edge compatible), include nonce generation and authentication tag handling. Provide example usage saving `connections.credentials` (encrypted) and reading back.

Also create a migration note to store encrypted credentials in `connections.credentials`.
```

**Expected output:** crypto helper code and example.

**Commit message:** `feat: add aes-256-gcm helpers for credentials`

---

## Prompt 019 — n8n integration plan + webhook bridge

**Use with:** Copilot Chat

**Prompt:**

```
You are a senior automation engineer. Provide a clear plan and example code to integrate n8n as a helper automation engine (temporary) while Intaj builds its own workflow engine. The plan should include:
- How to trigger n8n workflows from Intaj (HTTP webhook with auth token).
- How to receive webhook callbacks from n8n to our `/api/integrations/n8n/callback` route.
- Example of a small workflow: when `new_lead` event occurs, call n8n webhook to send WhatsApp via Twilio.

Output the plan and example server code for triggering and receiving webhooks.
```

**Expected output:** Integration plan + server code.

**Commit message:** `chore: add n8n integration guide and webhook bridge`

---

## Prompt 020 — Minimal Workflow executor skeleton (internal)

**Use with:** Copilot Chat

**Prompt:**

```
You are a senior systems engineer. Create a minimal internal workflow executor that can run simple JSON-defined workflows stored in `workflows.definition`. Requirements:
- Support triggers: `on_message`, `on_new_user`.
- Support actions: `http_request`, `send_email`, `call_chatbot`.
- Implement `workflowRunner.execute(workflowId, payload)` that validates the workflow, runs actions sequentially, logs execution in `workflow_runs` table, and returns status.

Output TypeScript code for the executor and SQL for `workflow_runs` table.
```

**Expected output:** Workflow executor skeleton.

**Commit message:** `feat: add workflow executor skeleton`

---

## Prompt 021 — CI/CD: GitHub Actions for lint/build/test/deploy

**Use with:** Copilot Chat

**Prompt:**

```
You are a senior devops engineer. Generate a GitHub Actions workflow file `.github/workflows/ci.yml` that:
- Runs on push to main and PRs.
- Installs dependencies, runs lint and typecheck, builds the Next.js app, and runs a basic smoke test.
- Optionally, deploys to Vercel via Vercel GitHub action on push to main using VERCEL_TOKEN secret.

Output the YAML file content.
```

**Expected output:** CI workflow YAML.

**Commit message:** `ci: add github actions for ci and deploy`

---

## Prompt 022 — Logging & monitoring integration (Sentry)

**Use with:** Copilot Chat

**Prompt:**

```
You are an SRE. Add Sentry to the Next.js app with environment-based initialization. Provide `src/lib/sentry.ts` and show how to wrap server and client errors. Also add a simple usage example in the chat API route to capture exceptions.

Output the files and setup instructions.
```

**Expected output:** Sentry integration code and instruction.

**Commit message:** `chore: add sentry monitoring`

---

## Prompt 023 — Vercel deployment checklist + environment variables

**Use with:** ChatGPT / Terminal

**Prompt:**

```
You are an experienced platform engineer. Produce an exact Vercel deployment checklist for Intaj including required environment variables in Vercel project settings, recommended runtime settings, and steps to enable automatic deploys from GitHub. Include notes about preview environments and secure storage of SUPABASE_SERVICE_ROLE_KEY.

Output the checklist.
```

**Expected output:** Vercel deployment checklist.

**Commit message:** `docs: add vercel deployment checklist`

---

## Prompt 024 — Beta testing & onboarding email

**Use with:** ChatGPT

**Prompt:**

```
You are a growth/product manager. Draft a short onboarding email sequence (3 emails) to send to beta testers. Focus: signup, create first bot, install widget, and request feedback. Include subject lines and CTA.

Output full email content in plain text.
```

**Expected output:** Email sequence.

**Commit message:** `docs: add beta onboarding email templates`

---

## Prompt 025 — Marketing launch checklist (first 30 days)

**Use with:** ChatGPT

**Prompt:**

```
You are a growth hacker. Create a 30-day launch checklist for Intaj MVP focused on early traction: Product Hunt launch, LinkedIn posts, targeted outreach to 50 local SMEs, list of 10 demo script ideas, and a basic pricing pitch. Provide short templates the founder can use for outreach messages.

Output the checklist and templates.
```

**Expected output:** 30-day checklist + outreach templates.

**Commit message:** `docs: add marketing launch checklist`

---

## Prompt 026 — Add multi-model config and switcher

**Use with:** Copilot Chat

**Prompt:**

```
You are an ML platform developer. Implement a pluggable model provider pattern: `src/lib/models/providers.ts` that maps model keys like `openai:gpt-4`, `mistral:mix`, `anthropic:claude` to provider clients. Add a UI component in chatbot settings to select default provider and model. The code should allow switching provider at runtime.

Output TypeScript code.
```

**Expected output:** provider mapping + UI.

**Commit message:** `feat: add pluggable model providers`

---

## Prompt 027 — Add tests (basic)

**Use with:** Copilot Chat

**Prompt:**

```
You are a TDD-focused engineer. Add a few basic tests using Jest + React Testing Library for the Chat UI and for API route `POST /api/chat/stream` (mock OpenRouter). Create `jest.config.js`, and sample tests: chat UI renders, messages appear, and server route returns streaming token chunks.

Output test config and tests.
```

**Expected output:** Jest config and tests.

**Commit message:** `test: add basic tests for chat UI and chat route`

---

## Prompt 028 — Runbook: incident, backup, and data export

**Use with:** ChatGPT

**Prompt:**

```
You are a site reliability engineer. Write a short runbook with steps for:
- What to do if Supabase DB becomes read-only.
- How to restore from backup (pgdump/restore).
- How to run a GDPR user data export (step-by-step SQL + Supabase storage paths).

Keep it actionable and concise.
```

**Expected output:** Runbook markdown.

**Commit message:** `docs: add runbook for incidents and backups`

---

## Prompt 029 — Roadmap & prioritized features list (3 quarters)

**Use with:** ChatGPT

**Prompt:**

```
You are a senior PM. Produce a prioritized roadmap for next 3 quarters (Q1: MVP improvements, Q2: multi-channel + workflows, Q3: marketplace & enterprise). Include milestones, success metrics, and acceptance criteria for each milestone.

Output a markdown roadmap.
```

**Expected output:** Roadmap document.

**Commit message:** `docs: add 3-quarter roadmap`

---

## Prompt 030 — Developer Onboarding checklist

**Use with:** ChatGPT

**Prompt:**

```
You are a senior engineering manager. Create a short onboarding checklist for a new developer joining the Intaj project. Include local setup steps, how to run migrations, how to get access to Supabase/Vercel secrets, coding style, and code review expectations.

Output the checklist.
```

**Expected output:** Onboarding checklist.

**Commit message:** `docs: add developer onboarding checklist`

---

## Tips for using these prompts

- Paste each prompt exactly into Copilot Chat or ChatGPT with repository context open. For Copilot, open the target file and ask Copilot to "create file X with content" and paste the prompt.
- For server routes and secrets, always test locally with `supabase start` or `stripe-cli` for webhook verification.
- Commit often and keep each prompt output in a separate commit.

---

## Final note

This list is intentionally exhaustive to let you _queue tasks_ and hand them to Copilot or an LLM one-by-one. If you want, I can now run a subset of these prompts and produce the actual files for you (for example: prompts 1–7 to create the working skeleton). Tell me which block (e.g., 001–007) you want me to expand into real files first.

Good luck — you're set to move from zero to a marketable Intaj MVP fast.🔥
