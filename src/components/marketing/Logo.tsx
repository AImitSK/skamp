import Image from 'next/image'
import { clsx } from 'clsx'

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo_skamp.svg"
      alt="CeleroPress"
      width={134}
      height={42}
      className={clsx(className)}
      priority
    />
  )
}

export function Mark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo_skamp.svg"
      alt="CeleroPress"
      width={40}
      height={40}
      className={clsx(className)}
    />
  )
}
