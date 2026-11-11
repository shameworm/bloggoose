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
          firstName: username[0].toUpperCase() + username.slice(1),
          lastName: null,
          avatarUrl: null,
        }),
      ),
    );

    const posts = users.flatMap((user) =>
      Array.from({ length: POSTS_PER_USER }, (_, i) => {
        const createdAt = new Date(Date.now() - Math.random() * 30 * DAY_MS);

        return manager.create(Post, {
          authorId: user.id,
          title: `${user.username}'s post #${i + 1}`,
          slug: `${user.username}-post-${i + 1}`,
          content: `Seeded post number ${i + 1} by ${user.username}. `.repeat(
            3,
          ),
          featuredImageUrl: null,
          publishedAt: i % 5 === 0 ? null : createdAt, // every 5th is a draft
          createdAt,
        });
      }),
    );

    await manager.save(Post, posts, { chunk: 50 });

    console.log(`Seeded ${users.length} users and ${posts.length} posts.`);
    console.log(`Log in as any of: ${USERNAMES.join(', ')} / ${PASSWORD}`);
  });
} finally {
  await dataSource.destroy();
}
