import { SnakeNamingStrategy } from './snake-naming.strategy.js';

describe('SnakeNamingStrategy', () => {
  const naming = new SnakeNamingStrategy();

  it.each([
    ['createdAt', 'created_at'],
    ['featuredImageUrl', 'featured_image_url'],
    ['id', 'id'],
    ['userID', 'user_id'],
  ])('maps the property %s to the column %s', (property, column) => {
    expect(naming.columnName(property, undefined, [])).toBe(column);
  });

  it('keeps a name given in @Column({ name })', () => {
    expect(naming.columnName('createdAt', 'made_at', [])).toBe('made_at');
  });

  it('prefixes columns of embedded entities', () => {
    expect(naming.columnName('city', undefined, ['homeAddress'])).toBe(
      'home_address_city',
    );
  });

  it('snake_cases table names unless @Entity names them', () => {
    expect(naming.tableName('RefreshToken', undefined)).toBe('refresh_token');
    expect(naming.tableName('RefreshToken', 'refresh_tokens')).toBe(
      'refresh_tokens',
    );
  });

  it('names a join column after the relation', () => {
    expect(naming.joinColumnName('replyTo', 'id')).toBe('reply_to_id');
  });
});
