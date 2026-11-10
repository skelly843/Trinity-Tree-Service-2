/**
 * What the help assistant knows about this website, per kind of user, and the short tips
 * it shows. Keep this in step with the site: it's the assistant's only source of truth.
 */

export type AssistantAudience = 'customer' | 'employee' | 'office'

export function audienceFor(role?: string | null): AssistantAudience | null {
  if (role === 'customer') return 'customer'
  if (role === 'employee') return 'employee'
  if (role === 'admin' || role === 'global_admin') return 'office'
  return null
}

const CUSTOMER_GUIDE = `
The customer portal (menu "Dashboard" in the top bar, or /portal) has six sections in a bar at the top:
- Home: "Needs your attention" (estimates waiting for an answer, money due, new messages from the office), upcoming visits, and "Your arborist" (who to expect).
- Services: Appointments (upcoming and past visits, with the arborist's name), Jobs (work in progress and finished), Requests (service requests you sent).
- Billing: Estimates (open one, untick any line you don't want, then press Approve; unticked lines are declined), Invoices (see what's owed; "Pay by Card" appears when card payments are turned on), Payments (payments received), Receipts (receipts the office shared).
- Files: Documents the office shared with you (open with "Open Document"), and Project Photos.
- Messages: write to the office and read their replies. Use it for questions about your job.
- Account: Profile (name, phone, photo) and Properties (add the addresses where work is done; add gate codes or access notes).
To ask for new work: the "Request Service" button on Home, or Request Service in the site menu.
Forgot password: Log In, then "Forgot password", then use the newest email.
New accounts wait for the office to approve them before the portal opens.`

const EMPLOYEE_GUIDE = `
The employee area (/employee) has five buttons at the top:
- Today: this week's visits (time, customer, address with a map link, a Call button and visit notes), your open jobs with "Start" and "Mark completed" buttons, and how much you're owed. Marking a job completed makes its pay owed to you.
- Schedule: pick a day on the calendar to see that day's visits.
- Customers: the customers assigned to you or that you have a visit or job with. Tap one to see contact details, Directions, upcoming and past visits, jobs, property addresses and access notes, photos (tap to enlarge), team notes and messages with the customer, and files. You can add team notes there (customers don't see team notes).
- Estimates: write an estimate for one of your customers with line items, then "Send to Customer". The customer approves the lines they want.
- My Pay: owed now, what you'll earn when current jobs finish, money paid to you this year, every payment, and an "I received this" button to confirm each payment arrived. If a payment is wrong or missing, tell the office instead of confirming.
Employees can't see billing, website leads or other customers, and can't delete records; ask the office for those.`

const OFFICE_GUIDE = `
The admin area (/admin) has a menu on the left. Owner-only items are marked (owner).
- Overview: summary of the business.
- Calendar & Scheduling: add or edit appointments. Choose the customer, property, time, and "Assigned" staff member; that person sees it in their employee area and the customer sees who's coming.
- Service Requests: requests from the website form. Change status as you contact and schedule them.
- Customers & CRM: "Add customer" (tick "Email them an invitation" to send a portal invite), the Customer Portal Access panel (invite, see who accepted, Approve logins), and the user list. Open a person for their page: Assigned arborist, tabs for Service History, Invoices, Private Notes (staff only) and Messages (the customer sees these in their portal), and buttons for Create Appointment, Create Invoice and Message Customer. Update Role (owner) makes someone a customer, employee or admin.
- Jobs & Projects: create jobs, set status, and choose the "Assigned arborist". When a job is marked completed, that worker's pending pay for it becomes owed.
- Estimates: itemized estimates; "Send to Customer"; customers approve some or all lines; "Convert approved items" makes a job.
- Invoices, Payments, Receipts: bill customers, record payments, and upload receipts (tick "Show in portal" to share one).
- Expenses: business costs with receipt photos.
- Customer Documents: upload files for a customer; tick "Show in portal" so they can see it. Photos uploaded here also show to the assigned arborist.
- Notes: all notes across customers.
- Services Manager and Gallery Manager: the services list and before/after gallery on the public site, with filters.
- Finances & Reports (owner): income and expense report with CSV and print, "Import with AI" to read receipts and bank statements, and Other Income.
- Worker Pay (owner): add earnings per job for each worker (owed now, or pending until the job is completed). To pay: send the money in Zelle, Cash App or by check first, then tick the earnings being paid, enter the confirmation or check number, and press Record. The amount is added up for you. A recorded payment can't be edited or deleted; use Void with a reason if it was wrong. Workers confirm each payment. "Year totals (CSV)" gives yearly totals per worker for 1099s.
- Website Editor (owner) and "Edit this page" on public pages: change text and photos, then Publish. Service cards can be edited right on the page.
- Business Settings (owner): phone, email, address, service radius map, main cities, seasonal or storm areas, listing links (Google, Facebook, Yelp and others) and the search engine title and description.
- Admin Accounts (owner): staff and customer logins, approvals. Audit Log (owner): who did what.
Customers must be approved before their portal opens. To give a worker a customer: set the Assigned arborist on the customer's page, or assign them to an appointment or job.`

export const ASSISTANT_GUIDE: Record<AssistantAudience, string> = {
  customer: CUSTOMER_GUIDE,
  employee: EMPLOYEE_GUIDE,
  office: OFFICE_GUIDE
}

export const ASSISTANT_TIPS: Record<AssistantAudience, string[]> = {
  customer: [
    'Home shows anything waiting on you, like an estimate to approve or a bill that is due.',
    'On an estimate you can untick lines you don\'t want before pressing Approve.',
    'Add gate codes or "beware of dog" notes to your property under Account, then Properties.',
    'Questions about your job? Use Messages and the office will reply there.',
    'See who\'s coming: your arborist\'s name is on Home and on each upcoming visit.'
  ],
  employee: [
    'Today shows your visits with a Directions link and a Call button.',
    'Press "Mark completed" when a job is done; that makes its pay owed to you.',
    'Tap a customer to see their photos, notes, gate codes and files before you arrive.',
    'Add a team note on the customer\'s page so the next person knows what you found.',
    'Confirm each payment under My Pay once it arrives in your account.'
  ],
  office: [
    'Set an "Assigned arborist" on a customer\'s page so the worker sees them and the customer knows who to expect.',
    'In Worker Pay, send the money first, then record it with the Zelle confirmation or check number.',
    'Tick "Show in portal" when uploading a document or receipt you want the customer to see.',
    'Use "Edit this page" on any public page to change text and photos, then Publish.',
    'Finances & Reports, then Import with AI, reads a receipt or bank statement photo into expenses for you.',
    'Approve new customer logins in Customers & CRM under Customer Portal Access.'
  ]
}

export const ASSISTANT_STARTERS: Record<AssistantAudience, string[]> = {
  customer: ['How do I approve an estimate?', 'Where do I see what I owe?', 'How do I message the office?'],
  employee: ['Where is my next job?', 'How do I mark a job done?', 'How do I see what I\'m owed?'],
  office: ['How do I assign a customer to an arborist?', 'How do I record a Zelle payment to a worker?', 'How do I invite a customer to the portal?']
}
