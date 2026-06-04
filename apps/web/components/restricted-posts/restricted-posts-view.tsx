'use client';

import { useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { AppealStatus, RestrictedPostDto } from '@costy/shared';

import { Button } from '@/components/shared/button';
import { useRestrictedPosts, useSubmitAppealMutation } from '@/hooks/queries/use-restricted-posts';
import { isApiQueryError } from '@/lib/api-query';
import { cn } from '@/lib/utils';

const APPEAL_STATUS_LABEL: Record<AppealStatus, string> = {
  PENDING: 'Đang chờ xử lý',
  ACCEPTED: 'Đã chấp nhận',
  REJECTED: 'Đã từ chối',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RestrictedPostCard({ post }: { post: RestrictedPostDto }) {
  const [message, setMessage] = useState('');
  const { mutate: submitAppeal, isPending } = useSubmitAppealMutation();
  const canAppeal = post.appealStatus !== 'PENDING' && post.appealStatus !== 'ACCEPTED';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập nội dung kháng nghị.');
      return;
    }
    submitAppeal(
      { postId: post.id, message: trimmed },
      {
        onSuccess: () => {
          toast.success('Đã gửi kháng nghị. Đội ngũ sẽ xem xét trong thời gian sớm nhất.');
          setMessage('');
        },
        onError: (err) => {
          toast.error(isApiQueryError(err) ? err.message : 'Không gửi được kháng nghị.');
        },
      },
    );
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Bài viết bị ẩn</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ẩn từ {formatDate(post.hiddenAt)}
              {post.appealStatus ? (
                <>
                  {' '}
                  · Kháng nghị:{' '}
                  <span
                    className={cn(
                      post.appealStatus === 'PENDING' && 'text-amber-600 dark:text-amber-400',
                      post.appealStatus === 'ACCEPTED' && 'text-green-600 dark:text-green-400',
                      post.appealStatus === 'REJECTED' && 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {APPEAL_STATUS_LABEL[post.appealStatus]}
                  </span>
                </>
              ) : (
                <> · Chưa gửi kháng nghị</>
              )}
            </p>
          </div>

          <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">
            {post.content || '(Không có nội dung văn bản)'}
          </p>

          {canAppeal ? (
            <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-3">
              <label htmlFor={`appeal-${post.id}`} className="text-sm font-semibold text-foreground">
                Gửi kháng nghị
              </label>
              <textarea
                id={`appeal-${post.id}`}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Giải thích lý do bạn cho rằng bài viết không vi phạm quy tắc an toàn trẻ em..."
                maxLength={2000}
                disabled={isPending}
                className="w-full rounded-xl border border-border bg-transparent p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <Button type="submit" size="md" loading={isPending} disabled={isPending}>
                Gửi kháng nghị
              </Button>
            </form>
          ) : post.appealStatus === 'PENDING' ? (
            <p className="border-t border-border pt-3 text-sm text-muted-foreground">
              Kháng nghị của bạn đang được đội ngũ xem xét.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function RestrictedPostsView() {
  const { data, isLoading, isError, error } = useRestrictedPosts();
  const posts = data ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        <span className="sr-only">Đang tải…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-sm text-red-600 dark:text-red-400">
        {isApiQueryError(error) ? error.message : 'Không tải được danh sách bài viết bị hạn chế.'}
      </p>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Bạn không có bài viết nào đang bị hạn chế hiển thị.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {posts.map((post) => (
        <RestrictedPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
