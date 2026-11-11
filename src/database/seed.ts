import bcrypt from 'bcrypt';

import { Post } from '../posts/entities/post.entity.js';
import { User } from '../users/entities/user.entity.js';

import dataSource from './data-source.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to seed a production database');
}

const PASSWORD = 'password123';

const USERNAMES = ['alice', 'bob', 'carol', 'dave', 'erin'];

const POSTS_PER_USER = 20;

const REPLIES_PER_USER = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

await dataSource.initialize();

try {
  await dataSource.transaction(async (manager) => {
    await manager.query('TRUNCATE users, posts RESTART IDENTITY CASCADE');

    const password = await bcrypt.hash(PASSWORD, 10);
    const users = await manager.save(
      User,

      USERNAMES.map((username) =>
        manager.create(User, {
          username,
          email: `${username}@bloggoose.dev`,
          password,
          displayName: username[0].toUpperCase() + username.slice(1),
          avatarUrl: null,
        }),
      ),
    );

    const posts = users.flatMap((user) =>
      Array.from({ length: POSTS_PER_USER }, (_, i) => {
        const createdAt = new Date(Date.now() - Math.random() * 30 * DAY_MS);

        return manager.create(Post, {
          authorId: user.id,
          body: `Post #${i + 1} by @${user.username}. Hello, BlogGoose!`,
          featuredImageUrl: null,
          createdAt,
        });
      }),
    );

    await manager.save(Post, posts, { chunk: 50 });

    const usernameById = new Map(users.map((u) => [u.id, u.username]));

    // Each user replies to a few random posts by other people, a bit later.
    const replies = users.flatMap((user) =>
      Array.from({ length: REPLIES_PER_USER }, () => {
        const others = posts.filter((post) => post.authorId !== user.id);
        const parent = others[Math.floor(Math.random() * others.length)];
        const createdAt = new Date(
          Math.min(
            Date.now(),
            parent.createdAt.getTime() + Math.random() * DAY_MS,
          ),
        );

        return manager.create(Post, {
          authorId: user.id,
          body: `@${usernameById.get(parent.authorId)} nice post!`,
          replyToId: parent.id,
          featuredImageUrl: null,
          createdAt,
        });
      }),
    );

    await manager.save(Post, replies, { chunk: 50 });

    // Recount instead of tracking counters by hand: always correct.
    await manager.query(`
      UPDATE posts p SET reply_count = (
        SELECT count(*) FROM posts r
        WHERE r.reply_to_id = p.id AND r.deleted_at IS NULL
      )`);
    await manager.query(`
      UPDATE users u SET post_count = (
        SELECT count(*) FROM posts p
        WHERE p.author_id = u.id AND p.deleted_at IS NULL
      )`);

    console.log(
      `Seeded ${users.length} users, ${posts.length} posts and ${replies.length} replies.`,
    );
    console.log(`Log in as any of: ${USERNAMES.join(', ')} / ${PASSWORD}`);
  });
} finally {
  await dataSource.destroy();
}
