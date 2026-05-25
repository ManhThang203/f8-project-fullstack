export function ProfileSkeleton() {

  return (

    <div className="mx-auto w-full max-w-[600px] px-4 py-6 md:px-0 md:py-8">

      <div className="flex flex-col gap-4 md:flex-row md:gap-8">

        <div className="bg-muted h-[5.5rem] w-[5.5rem] shrink-0 animate-pulse rounded-full md:h-24 md:w-24" />

        <div className="flex-1 space-y-3">

          <div className="bg-muted h-6 w-40 animate-pulse rounded" />

          <div className="bg-muted h-4 w-28 animate-pulse rounded" />

          <div className="bg-muted h-4 w-full max-w-sm animate-pulse rounded" />

        </div>

      </div>

      <div className="mt-6 flex justify-around gap-4 md:justify-start">

        {Array.from({ length: 3 }).map((_, i) => (

          <div key={i} className="bg-muted h-10 w-16 animate-pulse rounded" />

        ))}

      </div>

      <div className="mt-8 grid grid-cols-3 gap-px md:gap-1">

        {Array.from({ length: 9 }).map((_, i) => (

          <div key={i} className="bg-muted aspect-square animate-pulse" />

        ))}

      </div>

    </div>

  );

}

