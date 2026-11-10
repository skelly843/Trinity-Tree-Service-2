/**
 * Conversion tracking for Google Analytics 4 and Google Ads. Turned on by setting these in
 * Netlify (Site configuration > Environment variables), then redeploying:
 *   NEXT_PUBLIC_GA_ID                  e.g. G-XXXXXXX (Google Analytics)
 *   NEXT_PUBLIC_GOOGLE_ADS_ID          e.g. AW-123456789 (Google Ads)
 *   NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL  conversion label for service requests and contact forms
 *   NEXT_PUBLIC_GOOGLE_ADS_CALL_LABEL  conversion label for taps on the phone number
 * Without them nothing is loaded and these functions do nothing.
 * No names, emails or phone numbers are ever sent, only that a lead happened.
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || ''
export const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || ''
const LEAD_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || ''
const CALL_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CALL_LABEL || ''

type Gtag = (...args: unknown[]) => void

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return
  const g = (window as unknown as { gtag?: Gtag }).gtag
  if (g) g(...args)
}

/** A service request or contact form was sent. */
export function trackLead(form: 'service_request' | 'contact' | 'signup', emergency = false) {
  gtag('event', 'generate_lead', { form, emergency })
  if (ADS_ID && LEAD_LABEL) gtag('event', 'conversion', { send_to: `${ADS_ID}/${LEAD_LABEL}` })
}

/** Someone tapped the phone number. */
export function trackCall(where: string) {
  gtag('event', 'phone_call_click', { where })
  if (ADS_ID && CALL_LABEL) gtag('event', 'conversion', { send_to: `${ADS_ID}/${CALL_LABEL}` })
}
