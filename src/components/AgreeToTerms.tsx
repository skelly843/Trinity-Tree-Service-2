import Link from 'next/link'

/** "By submitting, you agree to our Terms of Service and Privacy Policy." under a form button. */
export function AgreeToTerms({ action = 'submitting' }: { action?: string }) {
  return (
    <p className="text-xs text-slate-500">
      By {action}, you agree to our{' '}
      <Link href="/terms" target="_blank" className="underline hover:text-slate-700">
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link href="/privacy" target="_blank" className="underline hover:text-slate-700">
        Privacy Policy
      </Link>
      .
    </p>
  )
}
