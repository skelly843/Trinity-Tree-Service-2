import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, contactLine } from '@/components/LegalPage'
import { loadCompanyDetails } from '@/utils/seo'
import { loadSiteBrand } from '@/utils/supabase/loadSiteBrand'

export const revalidate = 3600

const UPDATED = 'November 11, 2026'

export async function generateMetadata(): Promise<Metadata> {
  const [company, brand] = await Promise.all([loadCompanyDetails(), loadSiteBrand()])
  const name = company?.company_name || brand.site_name
  return {
    title: { absolute: `Terms of Service | ${name}` },
    description: `The terms for using ${name}'s website, customer portal, estimates and online payments.`,
    alternates: { canonical: '/terms' }
  }
}

/** Plain-language terms for the website, portal, estimates and payments. */
export default async function TermsPage() {
  const [company, brand] = await Promise.all([loadCompanyDetails(), loadSiteBrand()])
  const name = company?.company_name || brand.site_name

  return (
    <LegalPage title="Terms of Service" updated={UPDATED}>
      <p>
        These terms apply when you use the {name} website and customer portal, request service, approve an estimate or pay online. By doing any of
        those, you agree to them. The written estimate or agreement for your specific job also applies; if it conflicts with these terms, the job
        estimate or agreement wins.
      </p>

      <h2>Requests and information on this website</h2>
      <ul>
        <li>Sending a service request asks us to contact you. It is not a booking or a price until we confirm it.</li>
        <li>
          Prices, ranges and descriptions on this website are general information, not a quote. Your price is the one on your written estimate after we
          see the job.
        </li>
        <li>
          The website&apos;s Help assistant uses AI to answer questions about using the site. Its answers can be wrong and are not a quote, a promise or
          professional advice. For anything important, contact us directly.
        </li>
      </ul>

      <h2>Your portal account</h2>
      <ul>
        <li>Accounts are for our customers and are approved by our office. One account per person; don&apos;t share your login.</li>
        <li>You are responsible for keeping your password private and for activity on your account. Tell us right away if it may have been misused.</li>
        <li>We may suspend an account that is misused or used to harass our staff.</li>
      </ul>

      <h2>Estimates and approvals</h2>
      <ul>
        <li>Estimates are valid for 30 days unless the estimate says otherwise.</li>
        <li>
          Each line on an estimate is a separate piece of work. Approving lines in the portal, in writing or by signature is your agreement to have that
          work done at the listed price, under the estimate&apos;s terms.
        </li>
        <li>
          If we find conditions on site that weren&apos;t visible when we estimated (for example hidden hazards, rot or access problems), we will tell
          you before doing extra work and agree any change in price with you first.
        </li>
        <li>Please tell us before work starts about anything we should know, such as buried lines, septic systems, irrigation or property lines.</li>
      </ul>

      <h2>Scheduling, weather and safety</h2>
      <p>
        Dates and arrival times are estimates. We may reschedule for weather, emergencies, equipment problems or safety reasons, and will let you know
        as soon as we can. Our crew may stop or decline any work they judge unsafe.
      </p>

      <h2>Payments</h2>
      <ul>
        <li>Payment is due as stated on your invoice. Unless agreed otherwise, invoices are due on completion of the work.</li>
        <li>Online card payments are processed by Stripe. Your payment is recorded once the processor confirms it.</li>
        <li>
          If your insurance company is paying for storm or damage work, you remain responsible for payment of the invoice, including any amount your
          insurer does not cover.
        </li>
        <li>Unpaid balances may be referred for collection after reasonable notice, as allowed by Texas law.</li>
      </ul>

      <h2>Property and permits</h2>
      <p>
        You confirm that you own the property or have the owner&apos;s permission for the work. Unless your estimate says we will obtain them, you are
        responsible for any permits, HOA approvals or city approvals needed for the work, including for protected trees.
      </p>

      <h2>Limits of liability</h2>
      <p>
        We carry out work with reasonable care. To the extent the law allows, we are not responsible for: damage to buried or unmarked items you didn&apos;t
        tell us about (such as irrigation, cables or septic lines); normal wear to lawns, driveways or landscaping from equipment needed for the job;
        delays caused by weather or events outside our control; or indirect losses. Nothing in these terms limits rights you have under Texas consumer
        protection law that cannot be limited by agreement.
      </p>

      <h2>Website content</h2>
      <p>
        The text, photos and design of this website belong to {name} or are used with permission. Please don&apos;t copy them for commercial use without
        asking. Photos you upload to your portal stay yours; you allow us to use them to do your job and keep records.
      </p>

      <h2>Privacy</h2>
      <p>
        How we handle your information is explained in our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the State of Texas.</p>

      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version. Work already agreed stays under the terms that applied when you approved it.</p>

      <h2>Contact us</h2>
      <p>{contactLine(company, name)}</p>
    </LegalPage>
  )
}
