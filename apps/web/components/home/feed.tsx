/* eslint-disable @typescript-eslint/no-misused-promises -- handlers OK */
'use client';

import type { PostFeedItemDto } from '@threads/shared';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { apiFetch } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import type { ServerAuthUser } from '@/lib/auth-user.types';
const defaultDemoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? 'seed_demo_user_001';
const showGoogleAuth = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

type FeedUser = {
  id: string;
  email: string | null;
  username: string;
  name: string | null;
};

function userFromServer(u: ServerAuthUser): FeedUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username ?? '',
    name: u.name,
  };
}

type Props = {
  /** Session server (get-session) — đồng bộ paint đầu với client, tránh hydration #418. */
  initialUser: ServerAuthUser | null;
};

export function HomeFeed({ initialUser }: Props) {
  const { data: session } = authClient.useSession();

  const me = useMemo(() => {
    const fromClient = session?.user
      ? {
          id: session.user.id,
          email: session.user.email ?? null,
          username: (session.user as { username?: string | null }).username ?? '',
          name: session.user.name ?? null,
        }
      : null;
    const fromServer = initialUser ? userFromServer(initialUser) : null;
    return fromClient ?? fromServer ?? null;
  }, [session?.user, initialUser]);

  const [devUserId, setDevUserId] = useState(defaultDemoUserId);
  const [posts, setPosts] = useState<PostFeedItemDto[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await apiFetch<PostFeedItemDto[]>('/posts');
    if (!res.success) {
      setError(res.error.message);
      setPosts([]);
      return;
    }
    setPosts(res.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || posting) return;

    setPosting(true);
    setError(null);

    const headers: Record<string, string> = {};
    if (!me) {
      headers['x-dev-user-id'] = devUserId;
    }

    const res = await apiFetch<PostFeedItemDto>('/posts', {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: text }),
    });

    if (!res.success) {
      setError(res.error.message);
      setPosting(false);
      return;
    }

    setContent('');
    setPosts((prev) => [res.data, ...prev]);
    setPosting(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Feed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Đọc feed công khai; đăng bài cần{' '}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            đăng nhập
          </Link>
          {showGoogleAuth ? (
            <>
              ,{' '}
              <span className="font-medium text-foreground">Google</span> (nút bên dưới)
            </>
          ) : null}{' '}
          hoặc header dev (môi trường không production).
        </p>
      </header>

      <section className="mb-8 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        {!me && showGoogleAuth ? (
          <section aria-labelledby="feed-google-heading" className="mb-6">
            <h2 id="feed-google-heading" className="text-sm font-medium text-foreground">
              Đăng nhập bằng Google
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Chuyển tới Google để chọn tài khoản; sau khi xong bạn quay lại đây đã đăng nhập.
            </p>
            <div className="mt-3">
              <GoogleSignInButton
                callbackURL="/"
                label="Tiếp tục với Google"
                className="bg-background"
                onError={(msg) => setGoogleError(msg)}
              />
            </div>
            {googleError ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {googleError}
              </p>
            ) : null}
            <div className="relative my-6" aria-hidden="true">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">hoặc dev / form mật khẩu</span>
              </div>
            </div>
          </section>
        ) : null}

        {!me ? (
          <>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="dev-user">
              Dev user id (khi chưa đăng nhập, chỉ non-production)
            </label>
            <input
              id="dev-user"
              className="mt-1 mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              value={devUserId}
              onChange={(ev) => setDevUserId(ev.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
          </>
        ) : (
          <p className="mb-4 text-xs text-muted-foreground">
            Bạn đang đăng nhập — gửi bài không cần header dev. Session được làm mới theo cấu hình Better Auth (cookie
            cache + làm mới định kỳ).
          </p>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <textarea
            className="min-h-[96px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Có gì mới?"
            value={content}
            onChange={(ev) => setContent(ev.target.value)}
            maxLength={2000}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{content.length}/2000</span>
            <button
              type="submit"
              disabled={posting || content.trim().length === 0}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
            >
              {posting ? 'Đang đăng…' : 'Đăng'}
            </button>
          </div>
        </form>
      </section>

      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <section aria-busy={loading}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải feed…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có bài đăng. Hãy chạy seed hoặc viết bài mới.</p>
        ) : (
          <ul className="flex flex-col">
            {posts.map((post) => (
              <li
                key={post.id}
                className="border-b border-border px-1 py-4 first:pt-0 last:border-b-0"
              >
                <div className="flex gap-3">
                  <div
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
                    aria-hidden
                  >
                    {post.author.username.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold">{post.author.name ?? post.author.username}</span>
                      <span className="text-sm text-muted-foreground">@{post.author.username}</span>
                      <time
                        className="text-xs text-muted-foreground"
                        dateTime={post.createdAt}
                        title={post.createdAt}
                      >
                        {new Date(post.createdAt).toLocaleString('vi-VN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {post.content}
                    </p>
                    {post.replyCount > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {post.replyCount} phản hồi
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
