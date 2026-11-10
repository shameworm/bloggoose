# BlogGoose

A REST API for a small blog: users, posts and authentication. Built with [NestJS](https://nestjs.com) and PostgreSQL as a learning project.

## Stack

- **NestJS 12** on Express, TypeScript, ES modules
- **PostgreSQL** with **TypeORM**
- **class-validator** for request and environment validation
- **Swagger** API docs
- **Vitest** for tests, **oxlint** for linting, **Prettier** for formatting
- **NestJS Observe** for tracing, logs and error tracking
- **Bun** as the package manager

## Getting started

You need [Bun](https://bun.sh), a recent Node.js and a running PostgreSQL server.

```bash
# 1. Install dependencies
bun install

# 2. Create the database
createdb bloggoose

# 3. Configure the environment
cp .env.example .env   # then edit .env

# 4. Start in watch mode
bun run start:dev
```

The API runs on `http://localhost:3000` and the Swagger docs on [`http://localhost:3000/api`](http://localhost:3000/api).

In development TypeORM creates and updates the tables from the entities automatically (`synchronize`). It is turned off when `NODE_ENV=production`.

## Environment variables

All variables are checked on startup by [`src/config/env.validation.ts`](src/config/env.validation.ts). If one is missing or invalid, the app stops with an error that names it. See [`.env.example`](.env.example) for a template.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development`, `production` or `test` |
| `PORT` | no | `3000` | HTTP port |
| `OBSERVE_APP_KEY` | yes | | NestJS Observe app key |
| `OBSERVE_APP_SECRET` | yes | | NestJS Observe app secret |
| `OBSERVE_APP_SERVICE_ID` | yes | | Service name shown in Observe |
| `DB_HOST` | yes | | PostgreSQL host |
| `DB_PORT` | yes | | PostgreSQL port, usually `5432` |
| `DB_USERNAME` | yes | | PostgreSQL user |
| `DB_PASSWORD` | yes | | PostgreSQL password |
| `DB_NAME` | yes | | Database name |

## Scripts

| Command | What it does |
|---|---|
| `bun run start:dev` | Start in watch mode |
| `bun run start` | Start once |
| `bun run start:debug` | Start in watch mode with the debugger |
| `bun run build` | Compile to `dist/` |
| `bun run start:prod` | Run the compiled app |
| `bun run test` | Unit tests |
| `bun run test:watch` | Unit tests in watch mode |
| `bun run test:cov` | Unit tests with coverage |
| `bun run test:e2e` | End-to-end tests |
| `bun run lint` | Lint with oxlint |
| `bun run format` | Format with Prettier |

## API

Full request and response schemas are in Swagger at `/api`. All ids are UUIDs.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/signup` | Create an account |
| `POST` | `/auth/login` | Log in with email **or** username and password |
| `POST` | `/auth/logout` | Log out |

### Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/users?limit=&page=` | List users, paginated. **Requires login** |
| `GET` | `/users/:id` | Get one user |
| `POST` | `/users` | Create a user |
| `PATCH` | `/users/:id` | Update some fields of a user |
| `DELETE` | `/users/:id` | Delete a user |

### Posts

| Method | Path | Description |
|---|---|---|
| `GET` | `/posts?authorId=&limit=&page=` | List posts, optionally by author, paginated |
| `GET` | `/posts/:id` | Get one post |
| `POST` | `/posts` | Create a post (draft unless `"publish": true`) |
| `PATCH` | `/posts/:id` | Update a post, publish or unpublish it |
| `DELETE` | `/posts/:id` | Delete a post |

Pagination defaults to `limit=10`, `page=1`; `limit` is at most 100.

### Trying requests

Every module has ready-made requests in its `http/` folder (`src/auth/http`, `src/users/http`, `src/posts/http`), for the REST Client extension in VS Code or the HTTP client in JetBrains IDEs. Files that need an id start with a variable such as `@userId = …`: paste an id from a create response there.

## Project structure

```
src/
  main.ts                 bootstrap: validation pipe, Swagger, port
  app.module.ts           config, Observe, TypeORM and feature modules
  config/                 environment variable validation
  common/                 shared DTOs (pagination) and types
  auth/                   signup, login, logout
  users/                  users: entity, DTOs, service, controller
  posts/                  posts: entity, DTOs, service, controller
```

Each feature module keeps its `dtos/` (what clients may send), `entities/` (database tables), `http/` request files and `*.spec.ts` tests next to the code.

## Current limitations

This is a learning project and some parts are deliberately simple for now:

- **Auth is a dummy.** Logging in sets one flag for the whole app, so once anyone logs in, everyone is logged in. It is meant to be replaced with per-client tokens (JWT).
- **Passwords are stored in plain text.** They are never returned in responses, but they should be hashed (for example with bcrypt or argon2) before this goes anywhere real.
- **Images are URLs only.** `avatarUrl` and `featuredImageUrl` point to existing images; there are no uploads.

## Observability

The app reports traces, logs, metrics and errors to [NestJS Observe](https://observe.nestjs.com). To connect it, run the command below and approve the code at [observe.nestjs.com/link](https://observe.nestjs.com/link). It writes `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` into `.env`.

```bash
npx @nestjs/observe link
```

In production, set those variables in the environment instead of `.env`.
