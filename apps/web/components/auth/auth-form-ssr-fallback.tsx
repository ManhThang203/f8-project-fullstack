/** Shell tĩnh — khớp `login-form` outer layout, không gọi `useSession`. */
export function LoginFormSsrFallback() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
        <div className="h-7 w-40 rounded bg-muted/50" aria-hidden />
        <div className="mt-6 space-y-4">
          <div className="h-16 w-full rounded-lg bg-muted/40" aria-hidden />
          <div className="h-10 w-full rounded-lg bg-muted/40" aria-hidden />
          <div className="h-10 w-full rounded-lg bg-muted/40" aria-hidden />
          <div className="h-11 w-full rounded-full bg-muted/50" aria-hidden />
        </div>
        <div className="mx-auto mt-6 h-4 w-48 rounded bg-muted/40" aria-hidden />
      </div>
    </main>
  );
}

/** Shell tĩnh — khớp `register-form` outer layout. */
export function RegisterFormSsrFallback() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
        <div className="h-7 w-32 rounded bg-muted/50" aria-hidden />
        <div className="mt-2 h-12 w-full max-w-full rounded bg-muted/40" aria-hidden />
        <div className="mt-6 space-y-4">
          <div className="h-10 w-full rounded-lg bg-muted/40" aria-hidden />
          <div className="h-10 w-full rounded-lg bg-muted/40" aria-hidden />
          <div className="h-10 w-full rounded-lg bg-muted/40" aria-hidden />
          <div className="h-10 w-full rounded-lg bg-muted/40" aria-hidden />
          <div className="h-11 w-full rounded-full bg-muted/50" aria-hidden />
        </div>
        <div className="mx-auto mt-6 h-4 w-52 rounded bg-muted/40" aria-hidden />
      </div>
    </main>
  );
}

/** Shell — `forgot-password-form` (một ô email). */
export function ForgotPasswordSsrFallback() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
        <div className="h-7 w-48 rounded bg-muted/50" aria-hidden />
        <div className="mt-2 h-4 w-full max-w-sm rounded bg-muted/40" aria-hidden />
        <div className="mt-6 space-y-4">
          <div className="h-10 w-full rounded-lg bg-muted/40" aria-hidden />
          <div className="h-11 w-full rounded-full bg-muted/50" aria-hidden />
        </div>
        <div className="mx-auto mt-6 h-4 w-40 rounded bg-muted/40" aria-hidden />
      </div>
    </main>
  );
}

/** Shell — `reset-password-form` (hai ô mật khẩu). */
export function ResetPasswordSsrFallback() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
        <div className="h-7 w-56 rounded bg-muted/50" aria-hidden />
        <div className="mt-2 h-4 w-full max-w-sm rounded bg-muted/40" aria-hidden />
        <div className="mt-6 space-y-4">
          <div className="h-10 w-full rounded-lg bg-muted/40" aria-hidden />
          <div className="h-10 w-full rounded-lg bg-muted/40" aria-hidden />
          <div className="h-11 w-full rounded-full bg-muted/50" aria-hidden />
        </div>
        <div className="mx-auto mt-6 h-4 w-28 rounded bg-muted/40" aria-hidden />
      </div>
    </main>
  );
}
