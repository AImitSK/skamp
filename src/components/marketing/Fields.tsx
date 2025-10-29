import { useId } from 'react'
import clsx from 'clsx'

const formClasses =
  'block w-full appearance-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-primary-500 focus:bg-white focus:outline-hidden focus:ring-primary-500 sm:text-sm'

function Label({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={id}
      className="mb-3 block text-sm font-medium text-zinc-700"
    >
      {children}
    </label>
  )
}

export function TextField({
  label,
  type = 'text',
  className,
  ...props
}: Omit<React.ComponentPropsWithoutRef<'input'>, 'id'> & { label: string }) {
  let id = useId()

  return (
    <div className={className}>
      {label && <Label id={id}>{label}</Label>}
      <input id={id} type={type} {...props} className={formClasses} />
    </div>
  )
}

export function SelectField({
  label,
  className,
  ...props
}: Omit<React.ComponentPropsWithoutRef<'select'>, 'id'> & { label: string }) {
  let id = useId()

  return (
    <div className={className}>
      {label && <Label id={id}>{label}</Label>}
      <select id={id} {...props} className={clsx(formClasses, 'pr-8')} />
    </div>
  )
}
