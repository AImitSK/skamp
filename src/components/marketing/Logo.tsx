import Image from 'next/image'

export function Logo({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={className} {...props}>
      <Image
        src="/logo_skamp.svg"
        alt="CeleroPress"
        width={134}
        height={42}
        priority
        className="h-10 w-auto"
      />
    </div>
  )
}
