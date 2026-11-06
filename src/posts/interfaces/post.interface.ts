export interface Post {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  content: string;
  featuredImageUrl: string | null;
  publishedAt: Date | null; // null = draft
  createdAt: Date;
  updatedAt: Date;
}
