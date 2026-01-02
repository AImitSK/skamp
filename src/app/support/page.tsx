import { redirect } from 'next/navigation'

// Redirect zur deutschen Version als Default
export default function SupportPage() {
  redirect('/support/de')
}
