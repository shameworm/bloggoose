export interface Post {
  id: number;
  authorId: number;
  title: string;
  slug: string;
  content: string;
  publishedAt: Date | null; // null = draft
  createdAt: Date;
  updatedAt: Date;
}
