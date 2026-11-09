'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, Loader2, Plus, Printer, Sparkles, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { FileUpload } from '@/components/admin/FileUpload'
import { StoredFileLink } from '@/components/StoredFileLink'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryLabel, money } from '@/utils/finance'

type Tab = 'report' | 'import' | 'income'

interface Line {
  kind: 'Income' | 'Expense'
  date: string
  party: string
  category: string
  description: string
  amount: number
  file?: string | null
}

interface ImportRow {
  include: boolean
  date: string
  description: string
  party: string
  amount: string
  direction: 'expense' | 'income' | 'transfer'
  category: string
  confidence: 'high' | 'medium' | 'low'
  duplicate: boolean
}

const today = () => new Date().toISOString().slice(0, 10)

function presetRange(preset: string): [string, string] {
  const now = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (preset) {
    case 'last-month':
      return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))]
    case 'this-quarter': {
      const q = Math.floor(m / 3) * 3
      return [iso(new Date(y, q, 1)), iso(new Date(y, q + 3, 0))]
    }
    case 'this-year':
      return [`${y}-01-01`, `${y}-12-31`]
    case 'last-year':
      return [`${y - 1}-01-01`, `${y - 1}-12-31`]
    default:
      return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))]
  }
}

const input = 'w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white'

export default function FinancesPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('report')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ---------- report ----------
  const [preset, setPreset] = useState('this-month')
  const [[from, to], setRange] = useState(presetRange('this-month'))
  const [lines, setLines] = useState<Line[]>([])
  const [loadingReport, setLoadingReport] = useState(true)

  const loadReport = async () => {
    setLoadingReport(true)
    setError(null)
    const [pays, other, exps] = await Promise.all([
      supabase
        .from('payments')
        .select('payment_date, amount, payment_method, reference_number, customers(first_name, last_name), invoices(invoice_number)')
        .eq('status', 'confirmed')
        .gte('payment_date', from)
        .lte('payment_date', to),
      supabase.from('income_entries').select('*').gte('entry_date', from).lte('entry_date', to),
      supabase.from('expenses').select('*').gte('expense_date', from).lte('expense_date', to)
    ])
    const firstError = pays.error || other.error || exps.error
    if (firstError) setError(firstError.message)

    setLines([
      ...(pays.data || []).map((p: any): Line => ({
        kind: 'Income',
        date: p.payment_date,
        party: p.customers ? `${p.customers.first_name} ${p.customers.last_name}` : 'Customer',
        category: 'Invoice payments',
        description: `Invoice ${p.invoices?.invoice_number ? `INV-${p.invoices.invoice_number}` : ''} (${p.payment_method})`.trim(),
        amount: Number(p.amount)
      })),
      ...(other.data || []).map((i: any): Line => ({
        kind: 'Income',
        date: i.entry_date,
        party: i.source,
        category: categoryLabel(i.category, INCOME_CATEGORIES),
        description: i.description || '',
        amount: Number(i.amount),
        file: i.file_ref
      })),
      ...(exps.data || []).map((e: any): Line => ({
        kind: 'Expense',
        date: e.expense_date,
        party: e.vendor,
        category: categoryLabel(e.category),
        description: e.description || '',
        amount: Number(e.amount),
        file: e.receipt_file_url
      }))
    ].sort((a, b) => (a.date < b.date ? 1 : -1)))
    setLoadingReport(false)
  }

  useEffect(() => {
    if (tab === 'report') loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, from, to])

  const totals = useMemo(() => {
    const byCategory = (kind: Line['kind']) => {
      const map = new Map<string, number>()
      for (const l of lines.filter((x) => x.kind === kind)) map.set(l.category, (map.get(l.category) || 0) + l.amount)
      return [...map.entries()].sort((a, b) => b[1] - a[1])
    }
    const income = lines.filter((l) => l.kind === 'Income').reduce((s, l) => s + l.amount, 0)
    const expenses = lines.filter((l) => l.kind === 'Expense').reduce((s, l) => s + l.amount, 0)
    return { income, expenses, net: income - expenses, incomeBy: byCategory('Income'), expenseBy: byCategory('Expense') }
  }, [lines])

  const downloadCsv = () => {
    const quote = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows = [
      ['Type', 'Date', 'From / To', 'Category', 'Description', 'Amount'],
      ...lines.map((l) => [l.kind, l.date, l.party, l.category, l.description, (l.kind === 'Expense' ? -l.amount : l.amount).toFixed(2)])
    ]
    const blob = new Blob([rows.map((r) => r.map(quote).join(',')).join('\n')], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `income-and-expenses-${from}-to-${to}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // ---------- AI import ----------
  const [importFile, setImportFile] = useState('')
  const [reading, setReading] = useState(false)
  const [summary, setSummary] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [savingImport, setSavingImport] = useState(false)

  const readWithAi = async () => {
    setReading(true)
    setError(null)
    setSuccess(null)
    setRows([])
    try {
      const res = await fetch('/api/admin/ai-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileRef: importFile })
      })
      const body = await res.json().catch(() => ({ error: `The import failed (${res.status}).` }))
      if (!res.ok) throw new Error(body.error || 'The import failed.')

      // Flag entries that already exist with the same date and amount
      const found: any[] = body.transactions || []
      const dates = [...new Set(found.map((t) => t.date).filter(Boolean))]
      const [exps, inc] = dates.length
        ? await Promise.all([
            supabase.from('expenses').select('expense_date, amount').in('expense_date', dates),
            supabase.from('income_entries').select('entry_date, amount').in('entry_date', dates)
          ])
        : [{ data: [] as any[] }, { data: [] as any[] }]
      const existing = new Set([
        ...(exps.data || []).map((e: any) => `expense|${e.expense_date}|${Number(e.amount).toFixed(2)}`),
        ...(inc.data || []).map((i: any) => `income|${i.entry_date}|${Number(i.amount).toFixed(2)}`)
      ])

      setSummary(body.summary || '')
      setRows(
        found.map((t) => {
          const duplicate = existing.has(`${t.direction}|${t.date}|${Number(t.amount).toFixed(2)}`)
          return {
            include: t.direction !== 'transfer' && !duplicate,
            date: t.date || today(),
            description: t.description || '',
            party: t.party || '',
            amount: String(t.amount ?? ''),
            direction: t.direction,
            category: t.category,
            confidence: t.confidence,
            duplicate
          }
        })
      )
      if (found.length === 0) setError('No entries were found in this document.')
    } catch (err: any) {
      setError(err?.message || 'The import failed.')
    } finally {
      setReading(false)
    }
  }

  const updateRow = (index: number, patch: Partial<ImportRow>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  const saveImport = async () => {
    const chosen = rows.filter((r) => r.include && r.direction !== 'transfer')
    const invalid = chosen.find((r) => !(Number(r.amount) > 0) || !r.date)
    if (invalid) {
      setError('Every included row needs a date and an amount above zero.')
      return
    }
    setSavingImport(true)
    setError(null)
    const expenseRows = chosen
      .filter((r) => r.direction === 'expense')
      .map((r) => ({
        expense_date: r.date,
        vendor: r.party || 'Unknown',
        amount: Number(r.amount),
        category: EXPENSE_CATEGORIES.some((c) => c.value === r.category) ? r.category : 'Other',
        description: r.description,
        receipt_file_url: importFile
      }))
    const incomeRows = chosen
      .filter((r) => r.direction === 'income')
      .map((r) => ({
        entry_date: r.date,
        source: r.party || 'Unknown',
        amount: Number(r.amount),
        category: INCOME_CATEGORIES.some((c) => c.value === r.category) ? r.category : 'Other income',
        description: r.description,
        file_ref: importFile
      }))
    const results = await Promise.all([
      expenseRows.length ? supabase.from('expenses').insert(expenseRows) : Promise.resolve({ error: null }),
      incomeRows.length ? supabase.from('income_entries').insert(incomeRows) : Promise.resolve({ error: null })
    ])
    setSavingImport(false)
    const failed = results.find((r) => r.error)?.error
    if (failed) {
      setError(failed.message)
      return
    }
    setSuccess(`Saved ${expenseRows.length} expense${expenseRows.length === 1 ? '' : 's'} and ${incomeRows.length} income entr${incomeRows.length === 1 ? 'y' : 'ies'}.`)
    setRows([])
    setSummary('')
    setImportFile('')
  }

  // ---------- other income ----------
  const [incomeList, setIncomeList] = useState<any[]>([])
  const [incomeForm, setIncomeForm] = useState<null | { date: string; source: string; amount: string; category: string; description: string; file: string }>(null)

  const loadIncome = async () => {
    const { data, error: incErr } = await supabase.from('income_entries').select('*').order('entry_date', { ascending: false }).limit(200)
    if (incErr) setError(incErr.message)
    setIncomeList(data || [])
  }

  useEffect(() => {
    if (tab === 'income') loadIncome()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const saveIncome = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!incomeForm) return
    setError(null)
    const { error: insErr } = await supabase.from('income_entries').insert([
      {
        entry_date: incomeForm.date,
        source: incomeForm.source,
        amount: Number(incomeForm.amount),
        category: incomeForm.category,
        description: incomeForm.description,
        file_ref: incomeForm.file || null
      }
    ])
    if (insErr) {
      setError(insErr.message)
      return
    }
    setSuccess('Income recorded.')
    setIncomeForm(null)
    loadIncome()
  }

  const deleteIncome = async (id: string) => {
    if (!confirm('Delete this income entry?')) return
    const { error: delErr } = await supabase.from('income_entries').delete().eq('id', id)
    if (delErr) setError(delErr.message)
    else loadIncome()
  }

  const tabButton = (value: Tab, label: string) => (
    <button
      key={value}
      onClick={() => {
        setTab(value)
        setError(null)
        setSuccess(null)
      }}
      className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
        tab === value ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Finances</h1>
        <p className="text-slate-500 mt-1">Income and expense reports, AI import of receipts and statements, and income outside invoices.</p>
      </div>

      <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 print:hidden">
        {tabButton('report', 'Income & Expense Report')}
        {tabButton('import', 'Import with AI')}
        {tabButton('income', 'Other Income')}
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm font-semibold text-green-700 flex items-center print:hidden">
          <CheckCircle2 size={16} className="mr-2" /> {success}
        </div>
      )}
      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-700 flex items-center print:hidden">
          <AlertCircle size={16} className="mr-2 shrink-0" /> {error}
        </div>
      )}

      {tab === 'report' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-3 print:hidden">
            <label className="space-y-1">
              <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Period</span>
              <select
                value={preset}
                onChange={(e) => {
                  setPreset(e.target.value)
                  if (e.target.value !== 'custom') setRange(presetRange(e.target.value))
                }}
                className={input}
              >
                <option value="this-month">This month</option>
                <option value="last-month">Last month</option>
                <option value="this-quarter">This quarter</option>
                <option value="this-year">This year</option>
                <option value="last-year">Last year</option>
                <option value="custom">Custom dates</option>
              </select>
            </label>
            {preset === 'custom' && (
              <>
                <label className="space-y-1">
                  <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider">From</span>
                  <input type="date" value={from} onChange={(e) => setRange([e.target.value, to])} className={input} />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider">To</span>
                  <input type="date" value={to} onChange={(e) => setRange([from, e.target.value])} className={input} />
                </label>
              </>
            )}
            <button onClick={downloadCsv} disabled={lines.length === 0} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-700 disabled:opacity-40">
              <Download size={16} /> Download CSV
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-700">
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>

          <p className="hidden print:block text-sm text-slate-600">Period: {from} to {to}</p>

          {loadingReport ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Income', value: totals.income, color: 'text-green-700' },
                  { label: 'Expenses', value: totals.expenses, color: 'text-red-600' },
                  { label: 'Net profit', value: totals.net, color: totals.net >= 0 ? 'text-slate-900' : 'text-red-600' }
                ].map((card) => (
                  <div key={card.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">{card.label}</p>
                    <p className={`text-3xl font-black mt-1 ${card.color}`}>{money(card.value)}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[
                  { title: 'Income by category', items: totals.incomeBy, total: totals.income },
                  { title: 'Expenses by category', items: totals.expenseBy, total: totals.expenses }
                ].map((section) => (
                  <div key={section.title} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <p className="p-4 border-b border-slate-100 bg-slate-50 text-sm font-bold text-slate-800">{section.title}</p>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-50">
                        {section.items.map(([name, amount]) => (
                          <tr key={name}>
                            <td className="px-4 py-2.5 text-slate-700">{name}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">{money(amount)}</td>
                          </tr>
                        ))}
                        {section.items.length === 0 && (
                          <tr><td className="px-4 py-6 text-center text-slate-400 italic">Nothing in this period</td></tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200">
                          <td className="px-4 py-2.5 font-bold">Total</td>
                          <td className="px-4 py-2.5 text-right font-black">{money(section.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                <p className="p-4 border-b border-slate-100 bg-slate-50 text-sm font-bold text-slate-800">All entries ({lines.length})</p>
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">From / To</th>
                      <th className="px-4 py-2">Category</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {lines.map((l, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 whitespace-nowrap">{l.date}</td>
                        <td className="px-4 py-2">{l.party}</td>
                        <td className="px-4 py-2 text-slate-500">{l.category}</td>
                        <td className="px-4 py-2 text-slate-500">{l.description}</td>
                        <td className={`px-4 py-2 text-right font-semibold whitespace-nowrap ${l.kind === 'Income' ? 'text-green-700' : 'text-red-600'}`}>
                          {l.kind === 'Income' ? '+' : '-'}{money(l.amount)}
                        </td>
                        <td className="px-4 py-2 text-right print:hidden">{l.file && <StoredFileLink value={l.file} label="File" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 print:hidden">
                Income counts confirmed invoice payments plus Other Income. Payments still waiting for review are not counted.
              </p>
            </>
          )}
        </div>
      )}

      {tab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="text-blue-600" size={20} />
              <h2 className="font-bold text-slate-900">Read a receipt, invoice or statement</h2>
            </div>
            <p className="text-sm text-slate-500">
              Upload a photo or PDF. AI reads it and lists each entry for you to check. Nothing is saved until you click Save.
            </p>
            <FileUpload bucket="receipts" label="Receipt, invoice or statement" accept="image/*,application/pdf" value={importFile} onChange={(ref) => { setImportFile(ref); setRows([]); setSummary('') }} />
            <button
              onClick={readWithAi}
              disabled={!importFile || reading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
            >
              {reading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {reading ? 'Reading… this can take up to a minute' : 'Read with AI'}
            </button>
          </div>

          {rows.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <p className="text-sm font-bold text-slate-800">Check these entries</p>
                {summary && <p className="text-xs text-slate-500 mt-0.5">{summary}</p>}
                <p className="text-xs text-slate-500 mt-0.5">
                  Rows marked <strong>Check</strong> were hard to read. Transfers and possible duplicates start unticked.
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 uppercase text-left">
                  <tr>
                    <th className="px-3 py-2">Save</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">From / To</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 align-top">
                  {rows.map((r, i) => {
                    const categories = r.direction === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
                    return (
                      <tr key={i} className={r.include ? '' : 'opacity-50'}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={r.include} disabled={r.direction === 'transfer'} onChange={(e) => updateRow(i, { include: e.target.checked })} aria-label="Save this row" />
                        </td>
                        <td className="px-3 py-2"><input type="date" value={r.date} onChange={(e) => updateRow(i, { date: e.target.value })} className={input} /></td>
                        <td className="px-3 py-2">
                          <select
                            value={r.direction}
                            onChange={(e) => {
                              const direction = e.target.value as ImportRow['direction']
                              const list = direction === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
                              updateRow(i, {
                                direction,
                                include: direction !== 'transfer' && r.include,
                                category: list.some((c) => c.value === r.category) ? r.category : list[list.length - 1].value
                              })
                            }}
                            className={input}
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                            <option value="transfer">Transfer (skip)</option>
                          </select>
                        </td>
                        <td className="px-3 py-2"><input value={r.party} onChange={(e) => updateRow(i, { party: e.target.value })} className={input} /></td>
                        <td className="px-3 py-2"><input value={r.description} onChange={(e) => updateRow(i, { description: e.target.value })} className={input} /></td>
                        <td className="px-3 py-2">
                          <select value={r.category} onChange={(e) => updateRow(i, { category: e.target.value })} className={input} disabled={r.direction === 'transfer'}>
                            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2"><input type="number" step="0.01" min="0" value={r.amount} onChange={(e) => updateRow(i, { amount: e.target.value })} className={`${input} w-28`} /></td>
                        <td className="px-3 py-2 space-y-1 whitespace-nowrap">
                          {r.confidence === 'low' && <span className="block text-[11px] font-bold text-amber-700">Check</span>}
                          {r.duplicate && <span className="block text-[11px] font-bold text-red-600">Possible duplicate</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="p-4 border-t border-slate-100 flex justify-end">
                <button onClick={saveImport} disabled={savingImport || !rows.some((r) => r.include)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                  {savingImport && <Loader2 className="animate-spin" size={16} />}
                  Save {rows.filter((r) => r.include).length} ticked entries
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'income' && (
        <div className="space-y-4">
          <button
            onClick={() => setIncomeForm({ date: today(), source: '', amount: '', category: 'Service income', description: '', file: '' })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-1.5 shadow-md"
          >
            <Plus size={16} /> Record Income
          </button>
          <p className="text-sm text-slate-500">For money that did not come through an invoice in this system. Invoice payments are counted automatically.</p>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {incomeList.map((i) => (
              <div key={i.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800">{i.source} <span className="font-normal text-slate-500">• {categoryLabel(i.category, INCOME_CATEGORIES)}</span></p>
                  <p className="text-xs text-slate-500">{i.entry_date}{i.description ? ` • ${i.description}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-green-700">+{money(Number(i.amount))}</span>
                  {i.file_ref && <StoredFileLink value={i.file_ref} label="File" />}
                  <button onClick={() => deleteIncome(i.id)} className="p-1.5 text-slate-400 hover:text-red-600" aria-label="Delete income entry"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {incomeList.length === 0 && <p className="p-10 text-center text-slate-400 italic text-sm">No other income recorded yet.</p>}
          </div>
        </div>
      )}

      {incomeForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto">
          <form onSubmit={saveIncome} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 my-8">
            <h2 className="text-xl font-bold text-slate-900">Record Income</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Date</span>
                <input type="date" required value={incomeForm.date} onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })} className={input} />
              </label>
              <label className="space-y-1">
                <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Amount ($)</span>
                <input type="number" step="0.01" min="0.01" required value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} className={input} />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider">From</span>
              <input required value={incomeForm.source} onChange={(e) => setIncomeForm({ ...incomeForm, source: e.target.value })} className={input} placeholder="Customer or payer" />
            </label>
            <label className="block space-y-1">
              <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Category</span>
              <select value={incomeForm.category} onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })} className={input}>
                {INCOME_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Description</span>
              <input value={incomeForm.description} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} className={input} />
            </label>
            <FileUpload bucket="receipts" label="Deposit slip or proof (optional)" value={incomeForm.file} onChange={(file) => setIncomeForm({ ...incomeForm, file })} />
            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setIncomeForm(null)} className="px-5 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-sm">Cancel</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold text-sm">Save Income</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
