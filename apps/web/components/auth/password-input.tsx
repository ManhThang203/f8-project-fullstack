'use client';

import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState } from 'react';

import { cn } from '@/lib/utils';

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  wrapperClassName?: string;
};

/** Input mật khẩu có nút bật/tắt hiển thị ký tự. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, wrapperClassName, id, ...props }, ref) {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className={cn('relative w-full', wrapperClassName)}>
        <input
          ref={ref}
          id={id}
          type={showPassword ? 'text' : 'password'}
          className={cn('w-full pr-11', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-lg transition-colors duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2"
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={showPassword}
        >
          {showPassword ? (
            <EyeOff className="size-5" aria-hidden />
          ) : (
            <Eye className="size-5" aria-hidden />
          )}
        </button>
      </div>
    );
  },
);
