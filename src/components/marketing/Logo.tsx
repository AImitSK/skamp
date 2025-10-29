import Image from 'next/image'

export function Logo(props: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div {...props}>
      <Image
        src="/logo_skamp.svg"
        alt="CeleroPress"
        width={134}
        height={42}
        priority
        style={{ height: 'auto', width: '100%' }}
      />
    </div>
  )
}
