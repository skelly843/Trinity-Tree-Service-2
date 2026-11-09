/** Shared category lists for expenses, other income, reports and the AI import. */

export const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'Materials', label: 'Materials' },
  { value: 'Tools', label: 'Tools & Equipment' },
  { value: 'Equipment Rental', label: 'Equipment Rental' },
  { value: 'Subcontracting', label: 'Subcontracting' },
  { value: 'Fuel', label: 'Fuel & Transport' },
  { value: 'Vehicle', label: 'Vehicle Repairs & Maintenance' },
  { value: 'Permits', label: 'Permits & Licenses' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Payroll', label: 'Payroll & Contract Labor' },
  { value: 'Office & Software', label: 'Office, Phone & Software' },
  { value: 'Marketing', label: 'Marketing & Advertising' },
  { value: 'Utilities', label: 'Rent & Utilities' },
  { value: 'Meals', label: 'Meals & Travel' },
  { value: 'Bank Fees', label: 'Bank & Card Fees' },
  { value: 'Other', label: 'Other' }
]

export const INCOME_CATEGORIES: { value: string; label: string }[] = [
  { value: 'Service income', label: 'Service income (not invoiced here)' },
  { value: 'Cash sales', label: 'Cash & check sales' },
  { value: 'Refunds', label: 'Refunds & rebates' },
  { value: 'Other income', label: 'Other income' }
]

export const categoryLabel = (value: string, list = EXPENSE_CATEGORIES) =>
  list.find((c) => c.value === value)?.label || value || 'Uncategorized'

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
