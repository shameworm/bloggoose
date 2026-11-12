import { BadRequestException } from '@nestjs/common';

import { createValidationPipe } from '../../common/pipes/validation.pipe.js';
import { CreateUserDto } from './create-user.dto.js';
import { PatchUserDto } from './patch-user.dto.js';

const valid = {
  email: 'johndoe@example.com',
  username: 'makarena',
  password: 'Veryoriginal1!',
};

// Runs the body through the app's ValidationPipe, like a real request.
const pipe = createValidationPipe();
const validate = (
  metatype: typeof CreateUserDto | typeof PatchUserDto,
  body: unknown,
) => pipe.transform(body, { type: 'body', metatype });

describe('CreateUserDto', () => {
  it('accepts a valid user with optional profile fields', async () => {
    await expect(
      validate(CreateUserDto, {
        ...valid,
        displayName: 'John Doe',
        bio: 'Hi',
        avatarUrl: 'https://example.com/a.png',
      }),
    ).resolves.toBeInstanceOf(CreateUserDto);
  });

  it.each(['email', 'username', 'password'])('requires %s', async (field) => {
    const body: Record<string, string> = { ...valid };
    delete body[field];

    await expect(validate(CreateUserDto, body)).rejects.toThrow(
      BadRequestException,
    );
  });

  it.each([
    [
      'a username with @ (login would mix it up with emails)',
      { username: 'john@doe' },
    ],
    ['a username under 8 characters', { username: 'short' }],
    ['a username over 25 characters', { username: 'a'.repeat(26) }],
    ['an invalid email', { email: 'johndoe' }],
    ['a password without an uppercase letter', { password: 'veryoriginal1!' }],
    ['a password without a number', { password: 'Veryoriginal!' }],
    ['a password without a special character', { password: 'Veryoriginal1' }],
    ['a password under 8 characters', { password: 'Ab1!' }],
    ['a bio over 160 characters', { bio: 'a'.repeat(161) }],
    ['an avatarUrl that is not a URL', { avatarUrl: 'not a url' }],
  ])('rejects %s', async (_name, change) => {
    await expect(
      validate(CreateUserDto, { ...valid, ...change }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('PatchUserDto', () => {
  it('accepts an empty patch', async () => {
    await expect(validate(PatchUserDto, {})).resolves.toEqual({});
  });

  it('keeps the CreateUserDto rules for the fields it gets', async () => {
    await expect(
      validate(PatchUserDto, { username: 'john@doe' }),
    ).rejects.toThrow(BadRequestException);
  });
});
