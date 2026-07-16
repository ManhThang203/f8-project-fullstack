'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';

type Props = {
  text: string;
  className?: string;
};

const TOKEN_PATTERN = /((?:https?:\/\/|www\.)\S+|@[a-zA-Z0-9_.]+|#[\p{L}\p{N}_]+)/gu;

/** Chuẩn hóa URL người dùng nhập để anchor luôn dùng http/https. */
function normalizeHref(token: string): string {
  return token.startsWith('www.') ? `https://${token}` : token;
}

/** Render nội dung post, linkify URL và @username nhưng vẫn giữ whitespace từ parent. */
export function RichText({ text, className }: Props) {
  const parts = text.split(TOKEN_PATTERN);

  return (
    <span className={cn(className)}>
      {parts.map((part, index) => {
        if (!part) return null;

        if (part.startsWith('@') && part.length > 1) {
          const username = part.slice(1);
          return (
            <Link
              key={`${part}-${index}`}
              href={`/${encodeURIComponent(username)}`}
              className="text-primary font-medium hover:underline focus-visible:outline-hidden focus-visible:underline"
            >
              {part}
            </Link>
          );
        }

        if (part.startsWith('#') && part.length > 1) {
          return (
            <span key={`${part}-${index}`} className="text-primary font-medium">
              {part}
            </span>
          );
        }

        if (part.startsWith('http://') || part.startsWith('https://') || part.startsWith('www.')) {
          const href = normalizeHref(part);
          return (
            <a
              key={`${part}-${index}`}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary font-medium hover:underline focus-visible:outline-hidden focus-visible:underline"
            >
              {part}
            </a>
          );
        }

        return part;
      })}
    </span>
  );
}
