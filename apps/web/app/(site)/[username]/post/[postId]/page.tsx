import { PostDetailRoute } from '@/components/home/post/post-detail-route';

type Props = {
  params: Promise<{ username: string; postId: string }>;
  searchParams: Promise<{ commentId?: string }>;
};

export default async function PostDetailPage({ params, searchParams }: Props) {
  const { username, postId } = await params;
  const { commentId } = await searchParams;

  return <PostDetailRoute username={username} postId={postId} highlightCommentId={commentId} />;
}
