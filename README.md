# Intaj — Automation Platform MVP

Intaj is a modern automation platform for business, sales, marketing, and content creation. It enables you to build, deploy, and manage:

- AI chatbots (MVP)
- Sales agents
- Marketing agents
- Content creator agents
- Workflow automations (coming soon)

**MVP Focus:** Chatbots (with extensible architecture for future automation agents)

## Getting Started

First, install dependencies and run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS, Shadcn UI
- Supabase (auth, database, storage, vector search)
- Stripe integration (subscriptions)
- Embeddable chat widget
- Extensible for future automation agents

## File Structure

- `src/app/` — Next.js app routes (dashboard, chat, widget, etc)
- `src/lib/` — Core libraries (supabase, embeddings, usage, etc)
- `db/` — Database schema and SQL functions

## Contributing

See `db/DB_DESCRIPTION.md` for schema and table docs. PRs welcome!

### Code Quality & Standards

This project uses several tools to maintain code quality and consistency:

```bash
# Run ESLint to check for code issues
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format
```

We use husky and lint-staged to automatically run linting and formatting on staged files before commits.

## Links

- [DB Schema](db/DB_DESCRIPTION.md)
- [Code Style Guidelines](CODE_STYLE.md)

---

This project is the foundation for a full automation platform. MVP = chatbots, but architecture supports sales, marketing, and content agents.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
