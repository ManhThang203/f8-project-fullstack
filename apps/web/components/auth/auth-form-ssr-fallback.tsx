/** Shell tĩnh — khớp `login-form` (responsive), không gọi `useSession`. */
export function LoginFormSsrFallback() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-muted/40">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-10 md:flex-row md:items-center md:gap-10 md:py-12 lg:gap-12 lg:px-8 lg:py-16">
        <section className="hidden min-w-0 flex-1 flex-col justify-center md:flex md:pr-2 lg:pr-6">
          <div className="h-8 w-full max-w-md rounded bg-muted/50 sm:h-10" aria-hidden />
          <div className="mt-3 h-4 w-full max-w-sm rounded bg-muted/40" aria-hidden />
          <div className="mx-auto mt-6 hidden h-48 w-full max-w-lg rounded-2xl border border-border/60 bg-card md:block md:h-64 lg:mt-6 lg:h-72">
            <div className="h-full w-full rounded-xl bg-muted/30" aria-hidden />
          </div>
        </section>
        <section className="flex shrink-0 flex-col md:hidden">
          <div className="h-7 w-full max-w-md rounded bg-muted/50" aria-hidden />
          <div className="mt-2 h-3 w-full max-w-sm rounded bg-muted/40" aria-hidden />
        </section>
        <section className="flex w-full min-w-0 flex-1 justify-center md:justify-end">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-md sm:p-8">
            <div className="h-6 w-32 rounded bg-muted/50 sm:h-7 sm:w-40" aria-hidden />
            <div className="mt-6 space-y-4 sm:mt-8">
              <div className="h-11 w-full rounded-xl bg-muted/40" aria-hidden />
              <div className="h-11 w-full rounded-xl bg-muted/40" aria-hidden />
              <div className="h-11 w-full rounded-xl bg-muted/50" aria-hidden />
            </div>
            <div className="relative my-6 sm:my-8">
              <div className="mx-auto h-px w-full bg-border" aria-hidden />
            </div>
            <div className="h-11 w-full rounded-xl bg-muted/40" aria-hidden />
            <div className="mx-auto mt-6 h-4 w-48 rounded bg-muted/40 sm:mt-8" aria-hidden />
          </div>
        </section>
      </div>
    </main>
  );
}

/** Shell tĩnh — khớp `register-form` (responsive, giống login), không gọi `useSession`. */
export function RegisterFormSsrFallback() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-muted/40">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-10 md:flex-row md:items-center md:gap-10 md:py-12 lg:gap-12 lg:px-8 lg:py-16">
        <section className="hidden min-w-0 flex-1 flex-col justify-center md:flex md:pr-2 lg:pr-6">
          <div className="h-8 w-full max-w-md rounded bg-muted/50 sm:h-10" aria-hidden />
          <div className="mt-3 h-4 w-full max-w-sm rounded bg-muted/40" aria-hidden />
          <div className="mx-auto mt-6 hidden h-48 w-full max-w-lg rounded-2xl border border-border/60 bg-card md:block md:h-64 lg:mt-6 lg:h-72">
            <div className="h-full w-full rounded-xl bg-muted/30" aria-hidden />
          </div>
        </section>
        <section className="flex shrink-0 flex-col md:hidden">
          <div className="h-7 w-full max-w-md rounded bg-muted/50" aria-hidden />
          <div className="mt-2 h-3 w-full max-w-sm rounded bg-muted/40" aria-hidden />
        </section>
        <section className="flex w-full min-w-0 flex-1 justify-center md:justify-end">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-md sm:p-8">
            <div className="mx-auto h-6 w-28 rounded bg-muted/50 sm:h-7 sm:w-32" aria-hidden />
            <div className="mt-6 space-y-4 sm:mt-8">
              <div className="h-11 w-full rounded-xl bg-muted/40" aria-hidden />
              <div className="h-11 w-full rounded-xl bg-muted/40" aria-hidden />
              <div className="h-11 w-full rounded-xl bg-muted/40" aria-hidden />
              <div className="h-11 w-full rounded-xl bg-muted/40" aria-hidden />
              <div className="h-11 w-full rounded-xl bg-muted/50" aria-hidden />
            </div>
            <div className="relative my-6 sm:my-8">
              <div className="mx-auto h-px w-full bg-border" aria-hidden />
            </div>
            <div className="h-11 w-full rounded-xl bg-muted/40" aria-hidden />
            <div className="mx-auto mt-6 h-4 w-52 rounded bg-muted/40 sm:mt-8" aria-hidden />
          </div>
        </section>
      </div>
    </main>
  );
}

/** Shell — `forgot-password-form` (responsive, giống login/register). */
export function ForgotPasswordSsrFallback() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-muted/40">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-10 md:flex-row md:items-center md:gap-10 md:py-12 lg:gap-12 lg:px-8 lg:py-16">
        <section className="hidden min-w-0 flex-1 flex-col justify-center md:flex md:pr-2 lg:pr-6">
          <div className="h-8 w-full max-w-md rounded bg-muted/50 sm:h-10" aria-hidden />
          <div className="mt-3 h-4 w-full max-w-sm rounded bg-muted/40" aria-hidden />
          <div className="mx-auto mt-6 hidden h-48 w-full max-w-lg rounded-2xl border border-border/60 bg-card md:block md:h-64 lg:mt-6 lg:h-72">
            <div className="h-full w-full rounded-xl bg-muted/30" aria-hidden />
          </div>
        </section>
        <section className="flex shrink-0 flex-col md:hidden">
          <div className="h-7 w-full max-w-md rounded bg-muted/50" aria-hidden />
          <div className="mt-2 h-3 w-full max-w-sm rounded bg-muted/40" aria-hidden />
        </section>
        <section className="flex w-full min-w-0 flex-1 justify-center md:justify-end">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-md sm:p-8">
            <div className="mx-auto h-6 max-w-xs rounded bg-muted/50 sm:h-7" aria-hidden />
            <div className="mx-auto mt-3 h-10 w-full max-w-sm rounded bg-muted/40" aria-hidden />
            <div className="mt-6 space-y-4 sm:mt-8">
              <div className="h-11 w-full rounded-xl bg-muted/40" aria-hidden />
              <div className="h-11 w-full rounded-xl bg-muted/50" aria-hidden />
            </div>
            <div className="mx-auto mt-6 h-4 w-40 rounded bg-muted/40 sm:mt-8" aria-hidden />
          </div>
        </section>
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
