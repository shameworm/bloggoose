export interface Post {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  content: string;
  publishedAt: Date | null; // null = draft
  createdAt: Date;
  updatedAt: Date;
}
