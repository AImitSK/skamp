import { clsx } from 'clsx'

export function LogoCloud({
  className,
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={clsx(
        className,
        'flex items-center justify-center gap-x-8 gap-y-4 flex-wrap sm:gap-x-12 lg:gap-x-16',
      )}
    >
      <img
        alt="SavvyCal"
        src="/logo-cloud/savvycal.svg"
        className="h-8 w-auto object-contain lg:h-10"
      />
      <img
        alt="Laravel"
        src="/logo-cloud/laravel.svg"
        className="h-8 w-auto object-contain lg:h-10"
      />
      <img
        alt="Tuple"
        src="/logo-cloud/tuple.svg"
        className="h-8 w-auto object-contain lg:h-10"
      />
      <img
        alt="Transistor"
        src="/logo-cloud/transistor.svg"
        className="h-8 w-auto object-contain lg:h-10"
      />
      <img
        alt="Statamic"
        src="/logo-cloud/statamic.svg"
        className="h-8 w-auto object-contain lg:h-10"
      />
    </div>
  )
}
