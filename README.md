# BlogGoose

A REST API for a Twitter-like microblog: short posts (up to 500 characters), replies and user
profiles, with JWT authentication. Built with [NestJS](https://nestjs.com) and PostgreSQL as a
learning project.

- **Posts** are short and can't be edited: delete and post again. A post can reply to another post.
- **Deleting is soft**: a deleted post disappears from the API, but replies keep their parent.
- **Counters** (`postCount`, `replyCount`) change in the same transaction as the rows they count.
- **Auth** uses a short-lived access token plus a refresh token in an httpOnly cookie that is
  replaced on every refresh. Reusing an old one logs the user out everywhere.

## Stack

- **NestJS 12** on Express, TypeScript, ES modules
- **PostgreSQL 18** in Docker, **TypeORM** with migrations
- **JWT** (`@nestjs/jwt`) with refresh tokens in httpOnly cookies, **bcrypt** for passwords
- **class-validator** for request and environment validation
- **Swagger / OpenAPI** docs with examples
- **Vitest** + **supertest** for tests, **oxlint** for linting, **Prettier** for formatting
- **NestJS Observe** for tracing, logs and error tracking
- **Bun** as the runtime for scripts and the package manager

## Getting started

You need [Bun](https://bun.sh) and [Docker](https://www.docker.com).

```bash
# 1. Install dependencies
bun install

# 2. Configure the environment
cp .env.example .env
# then set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (32+ characters each):
openssl rand -hex 32

# 3. Start PostgreSQL (port 5433, see docker-compose.yml)
docker compose up -d

# 4. Create the tables
bun run db:migrate

# 5. Optional: fill the database with sample users and posts
bun run db:seed

# 6. Start in watch mode
bun run start:dev
```

The API runs on `http://localhost:3000`, the Swagger docs on
[`http://localhost:3000/api`](http://localhost:3000/api).

### Trying it in Swagger

1. Run `bun run db:seed`. It creates the users `alice`, `bob`, `carol`, `dave` and `erin`, all
   with the password `password123`.
2. In Swagger, call `POST /auth/login`. The example body already logs in as `alice`.
3. Copy `accessToken` from the response, click **Authorize** and paste it.
4. Routes with a lock now work. The access token lives 15 minutes. Call `POST /auth/refresh` for
   a new one: the browser sends the refresh cookie by itself.

## Environment variables

All variables are checked on startup by [`src/config/env.validation.ts`](src/config/env.validation.ts).
If one is missing or invalid, the app stops with an error that names it. See
[`.env.example`](.env.example) for a template.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development`, `production` or `test` |
| `PORT` | no | `3000` | HTTP port |
| `OBSERVE_APP_KEY` | yes | | NestJS Observe app key |
| `OBSERVE_APP_SECRET` | yes | | NestJS Observe app secret |
| `OBSERVE_APP_SERVICE_ID` | yes | | Service name shown in Observe |
| `DB_HOST` | yes | | PostgreSQL host |
| `DB_PORT` | yes | | PostgreSQL port; `5433` with the Docker setup |
| `DB_USERNAME` | yes | | PostgreSQL user |
| `DB_PASSWORD` | yes | | PostgreSQL password |
| `DB_NAME` | yes | | Database name |
| `CORS_ORIGIN` | yes | | The frontend's origin, e.g. `http://localhost:3001` |
| `JWT_ACCESS_SECRET` | yes | | Signs access tokens, at least 32 characters |
| `JWT_REFRESH_SECRET` | yes | | Signs refresh tokens, at least 32 characters, different from the access secret |
| `JWT_ACCESS_TTL` | yes | | Access token lifetime in seconds, e.g. `900` |
| `JWT_REFRESH_TTL_DAYS` | yes | | Refresh token lifetime in days, e.g. `30` |

Docker Compose reads the `DB_*` variables from the same `.env`.

## Scripts

| Command | What it does |
|---|---|
| `bun run start:dev` | Start in watch mode |
| `bun run start` | Start once |
| `bun run start:debug` | Start in watch mode with the debugger |
| `bun run build` | Compile to `dist/` |
| `bun run start:prod` | Run the compiled app |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:revert` | Undo the last migration |
| `bun run db:generate src/database/migrations/<Name>` | Generate a migration from entity changes |
| `bun run db:seed` | Replace all data with sample users, posts and replies (refuses in production) |
| `bun run test` | Unit and HTTP tests |
| `bun run test:watch` | Tests in watch mode |
| `bun run test:cov` | Tests with coverage |
| `bun run lint` | Lint with oxlint |
| `bun run format` | Format with Prettier |

## Database

- The schema is changed only by migrations in
  [`src/database/migrations`](src/database/migrations); `synchronize` is off. After changing an
  entity, generate a migration, read it, then run it.
- Property names are camelCase in code and snake_case in the database (`createdAt` →
  `created_at`), by a custom [naming strategy](src/database/snake-naming.strategy.ts).
- Tables: `users`, `posts`, `refresh_tokens` (one row per refresh token, storing only its
  sha256 hash).
- On the first start, Docker also creates an empty `bloggoose_test` database for future
  end-to-end tests.

## Authentication

| Token | Lifetime | Where it lives | Sent to |
|---|---|---|---|
| Access token (JWT) | `JWT_ACCESS_TTL` | Response body; the client keeps it in memory | Every protected route, as `Authorization: Bearer <token>` |
| Refresh token (JWT) | `JWT_REFRESH_TTL_DAYS` | httpOnly cookie `refresh_token` with path `/auth` | Only `/auth/refresh` and `/auth/logout`, by the browser |

- Every route needs an access token unless it is marked `@Public()`: a global guard checks it.
- `POST /auth/refresh` replaces the refresh token with a new one and revokes the old one.
  Reusing a revoked token is treated as theft: every session of that user is revoked.
- The database stores only a hash of each refresh token, so a leaked database can't be used to
  log in.
- A post's author is always the logged-in user. The request body can't set it.

## API

The full request and response schemas, with examples, are in Swagger at `/api`. All ids are UUIDs.
🔓 marks public routes; every other route needs an access token.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/signup` | 🔓 Create an account and log in |
| `POST` | `/auth/login` | 🔓 Log in with an email **or** username and password |
| `POST` | `/auth/refresh` | 🔓 New access token, using the refresh cookie |
| `POST` | `/auth/logout` | 🔓 Revoke the refresh token and clear the cookie |
| `GET` | `/auth/me` | The logged-in user |

### Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/users?limit=&page=` | List users, oldest first |
| `GET` | `/users/:id` | 🔓 A user's profile |
| `POST` | `/users` | Create a user (to register, use `/auth/signup`) |
| `PATCH` | `/users/:id` | Change some profile fields |
| `DELETE` | `/users/:id` | Delete a user and their posts |

### Posts

| Method | Path | Description |
|---|---|---|
| `GET` | `/posts?authorId=&limit=&page=` | 🔓 List posts, newest first, optionally by one author |
| `GET` | `/posts/:id` | 🔓 One post |
| `POST` | `/posts` | Write a post, or a reply with `replyToId` |
| `DELETE` | `/posts/:id` | Delete a post (soft delete) |

Pagination defaults to `limit=10`, `page=1`; `limit` is at most 100. Unknown fields in a request
body are rejected with 400.

### Request files

Every module has ready-made requests in its `http/` folder (`src/auth/http`, `src/users/http`,
`src/posts/http`) for the REST Client extension in VS Code or the HTTP client in JetBrains IDEs.
`auth.endpoint.http` and `posts.post.endpoint.http` log in as `alice` first and reuse the token.
The other files don't send a token yet, so their protected routes answer 401.

## Tests

```bash
bun run test
```

The tests need no database or network:

- **Services** run against mocked repositories. `TokensService` signs real JWTs and keeps
  refresh tokens in an in-memory table.
- **Controllers** are tested over real HTTP with supertest, using the real guard, validation pipe
  and cookie parser, so status codes, `@Public()`, validation and cookies behave as in production.
- **DTOs, env validation, the naming strategy and decorators** have their own specs.

End-to-end tests against a real database are not written yet. `test/app.e2e-spec.ts` is still
the Nest starter test and fails.

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint, build and tests on pushes to
`main` and on every pull request.

## Project structure

```
src/
  main.ts                  bootstrap: validation pipe, Swagger, cookies, CORS
  app.module.ts            config, Observe, TypeORM and feature modules
  swagger.ts               Swagger setup and auth schemes
  config/                  environment variable validation
  database/                data source, naming strategy, migrations, seed
  common/
    decorators/            @Public(), @CurrentUser()
    dtos/                  pagination
    pipes/                 the global validation pipe
    swagger/               examples and error response docs
  auth/                    signup, login, refresh, logout; tokens, guard, refresh_tokens entity
  users/                   users: entity, DTOs, service, controller
  posts/                   posts: entity, DTOs, service, controller
test/
  helpers/                 a test Nest app for HTTP tests
```

Each feature module keeps its `dtos/` (what clients may send), `entities/` (database tables),
`http/` request files and `*.spec.ts` tests next to the code.

## Current limitations

This is a learning project and some parts are not built yet:

- **No ownership checks yet.** Any logged-in user can edit or delete any user, and delete any
  post. Owner and admin checks come next.
- **No likes, reposts or follows yet.** The counters and the `repostOfId` column exist, but
  there are no routes for them.
- **No timelines or cursor pagination yet.** Lists use `limit`/`page`.
- **Images are URLs only**: `avatarUrl`, `bannerUrl` and `featuredImageUrl` point to existing
  images; there are no uploads.

## Observability

The app reports traces, logs, metrics and errors to [NestJS Observe](https://observe.nestjs.com).
To connect it, run the command below and approve the code at
[observe.nestjs.com/link](https://observe.nestjs.com/link). It writes `OBSERVE_APP_KEY` and
`OBSERVE_APP_SECRET` into `.env`.

```bash
npx @nestjs/observe link
```

In production, set those variables in the environment instead of `.env`.

## License

[MIT](LICENSE)
