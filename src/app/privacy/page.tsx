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
    title: { absolute: `Privacy Policy | ${name}` },
    description: `How ${name} collects, uses and protects your information.`,
    alternates: { canonical: '/privacy' }
  }
}

/** Plain-language privacy policy. Business details come from Business Settings. */
export default async function PrivacyPage() {
  const [company, brand] = await Promise.all([loadCompanyDetails(), loadSiteBrand()])
  const name = company?.company_name || brand.site_name
  const email = company?.email
  const phone = company?.phone

  return (
    <LegalPage title="Privacy Policy" updated={UPDATED}>
      <p>
        This policy explains what information {name} (&quot;we&quot;, &quot;us&quot;) collects through this website and our customer portal, how we use it,
        and the choices you have. We keep it short and plain on purpose. If anything is unclear, contact us using the details at the bottom.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Contact and request details</strong> you give us in a service request, contact form or estimate: name, phone, email, property address,
          a description of the work and any photos you send.
        </li>
        <li>
          <strong>Account details</strong> if you use the customer portal: your login email, and the properties, appointments, estimates, invoices,
          documents and messages connected to your account.
        </li>
        <li>
          <strong>Payment records</strong>: what you paid, when and how. Card payments are handled by our payment processor (Stripe); we never see or
          store your full card number.
        </li>
        <li>
          <strong>Job records and photos</strong> our crew takes before, during and after work on your property.
        </li>
        <li>
          <strong>Website usage</strong>: basic technical information such as your browser, device and the pages you visit, collected through cookies and
          similar tools (see Advertising and analytics).
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To respond to your request, schedule visits, prepare estimates and invoices, do the work and take payment.</li>
        <li>To contact you about your request or job by phone, text or email.</li>
        <li>To run the customer portal and keep your account secure.</li>
        <li>To keep business, tax and insurance records as required by law.</li>
        <li>To understand which advertising and pages bring us customers, so we can improve them.</li>
      </ul>
      <p>
        <strong>We do not sell your personal information</strong>, and we do not share it with other companies for their own marketing.
      </p>

      <h2>Who we share it with</h2>
      <p>Only with service providers that help us run the business, and only as needed for that purpose:</p>
      <ul>
        <li>Website hosting and our customer database (Netlify and Supabase).</li>
        <li>Email delivery (Resend) for account, estimate and job emails.</li>
        <li>Payment processing (Stripe), if you pay by card online.</li>
        <li>
          Our AI provider (Anthropic), which processes questions typed into the website&apos;s Help assistant, and photos or files our staff attach when
          preparing estimates, to produce answers. It is not used to train AI models on your information.
        </li>
        <li>Google, for advertising and website analytics (below).</li>
        <li>Map tiles from OpenStreetMap, shown on our service area map.</li>
        <li>Our insurance company, lawyers or authorities when required by law or to protect our rights.</li>
      </ul>

      <h2>Advertising and analytics</h2>
      <p>
        We use Google Ads and Google Analytics to measure how people find us, for example whether someone who clicked one of our ads later sent a
        service request or tapped our phone number. These tools use cookies. We do not send them your name, email, phone number or address. The
        customer portal and staff areas are not tracked. You can limit ad tracking at{' '}
        <a href="https://adssettings.google.com" target="_blank" rel="noreferrer">
          Google&apos;s ad settings
        </a>{' '}
        or by blocking cookies in your browser.
      </p>

      <h2>Calls, texts and emails</h2>
      <p>
        If you check the box on our request form, you agree that we may call or text you about your request and job. Message and data rates may apply.
        Reply <strong>STOP</strong> to any text to stop texts, or tell us by phone or email. We send only messages about your work, not marketing lists,
        unless you ask for them.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep job, estimate, invoice and payment records for as long as tax and business laws require (typically up to seven years). Other
        information is kept while you are a customer, and you can ask us to delete it sooner where the law allows.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Ask for a copy of the information we hold about you.</li>
        <li>Ask us to correct or delete it (some records must be kept for legal reasons).</li>
        <li>Stop texts or emails at any time.</li>
      </ul>
      <p>To make a request, contact us using the details below. We will respond within 45 days.</p>

      <h2>Security</h2>
      <p>
        Portal accounts are password protected, private files are only shared with you through links that expire, and our staff can only see the
        customers they work with. No system is perfectly secure, so please keep your password private and tell us right away if you think your account
        has been misused.
      </p>

      <h2>Children</h2>
      <p>Our services are for adults. We do not knowingly collect information from children under 13.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we will update the date at the top of this page.</p>

      <h2>Contact us</h2>
      <p>
        {contactLine(company, name)}
        {!email && !phone ? '. Use the Contact page to reach us.' : ''}
      </p>
      <p>
        See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  )
}
