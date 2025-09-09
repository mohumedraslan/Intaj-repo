---

# 📄 DB_DESCRIPTION.md

```markdown
# Database Schema – Intaj

This schema is designed to support **chatbot SaaS now** and **workflow automation later**.

---

## 📌 Tables

### 1. profiles

- Stores user info and subscription.
- Linked to Supabase `auth.users`.

| Column       | Type    | Description          |
| ------------ | ------- | -------------------- |
| id           | uuid    | FK → auth.users      |
| name         | text    | User name            |
| email        | text    | Unique email         |
| subscription | text    | free, pro, business  |
| created_at   | timest. | When profile created |

---

### 2. chatbots

- Each chatbot config belongs to a user.

| Column     | Type    | Description                      |
| ---------- | ------- | -------------------------------- |
| id         | uuid    | Primary key                      |
| user_id    | uuid    | FK → profiles.id                 |
| name       | text    | Chatbot name                     |
| model      | text    | AI model (OpenAI, Mistral, etc.) |
| settings   | jsonb   | Model params                     |
| created_at | timest. | Creation time                    |

---

### 3. messages

- Chat history between user and bot.

| Column     | Type    | Description             |
| ---------- | ------- | ----------------------- |
| id         | uuid    | Primary key             |
| chatbot_id | uuid    | FK → chatbots.id        |
| role       | text    | user, assistant, system |
| content    | text    | Message text            |
| created_at | timest. | Timestamp               |

---

### 4. faqs

- Custom Q&A pairs per chatbot.

| Column     | Type | Description      |
| ---------- | ---- | ---------------- |
| id         | uuid | Primary key      |
| chatbot_id | uuid | FK → chatbots.id |
| question   | text | FAQ question     |
| answer     | text | FAQ answer       |

---

### 5. data_sources

- Files or URLs uploaded to chatbot.

| Column     | Type    | Description      |
| ---------- | ------- | ---------------- |
| id         | uuid    | Primary key      |
| chatbot_id | uuid    | FK → chatbots.id |
| type       | text    | pdf, docx, url   |
| path       | text    | Supabase storage |
| created_at | timest. | Upload time      |

---

### 6. connections

- Stores external integrations.

| Column      | Type    | Description               |
| ----------- | ------- | ------------------------- |
| id          | uuid    | Primary key               |
| user_id     | uuid    | FK → profiles.id          |
| chatbot_id  | uuid    | FK → chatbots.id          |
| platform    | text    | website, whatsapp, etc.   |
| credentials | jsonb   | Encrypted API keys/tokens |
| active      | bool    | Is connection live?       |
| created_at  | timest. | Added time                |

---

### 7. workflows (future automation)

- JSON definition of workflows (Zapier/n8n style).

| Column     | Type    | Description                        |
| ---------- | ------- | ---------------------------------- |
| id         | uuid    | Primary key                        |
| user_id    | uuid    | FK → profiles.id                   |
| chatbot_id | uuid    | FK → chatbots.id                   |
| name       | text    | Workflow name                      |
| definition | jsonb   | Workflow steps (trigger + actions) |
| active     | bool    | Workflow status                    |
| created_at | timest. | Created at                         |
