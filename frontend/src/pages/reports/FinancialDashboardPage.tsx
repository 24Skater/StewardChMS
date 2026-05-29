import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { apiRequest } from '../../lib/api'
import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react'

// ── types ────────────────────────────────────────────────────────────────────

interface MonthlyRow {
  month: string
  givingCents: number
  expensesCents: number
  netCents: number
}

interface FundRow {
  fundName: string
  totalCents: number
  percentage: number
}

interface FinancialOverview {
  year: number
  monthly: MonthlyRow[]
  givingByFund: FundRow[]
  summary: {
    ytdGivingCents: number
    ytdExpensesCents: number
    ytdNetCents: number
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

function fmtShort(cents: number) {
  const n = cents / 100
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

const FUND_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#6b7280', '#ec4899']

// ── custom tooltip ────────────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-3 shadow-lg text-xs">
      <p className="font-semibold text-[var(--st-fg)] mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: p.fill }} />
          <span className="text-[var(--st-muted)]">{p.name}:</span>
          <span className="font-medium text-[var(--st-fg)]">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-3 shadow-lg text-xs">
      <p className="font-semibold text-[var(--st-fg)]">{d.name}</p>
      <p className="text-[var(--st-muted)]">{fmt(d.value)} · {d.payload.percentage}%</p>
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, cents, icon: Icon, color, subLabel }: { label: string; cents: number; icon: any; color: string; subLabel?: string }) {
  const isNegative = cents < 0
  return (
    <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/60 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-[var(--st-muted)]">{label}</p>
        <span className={`p-2 rounded-lg ${color}`}><Icon size={18} /></span>
      </div>
      <p className={`text-2xl font-bold ${isNegative ? 'text-red-400' : 'text-[var(--st-fg)]'}`}>
        {fmt(Math.abs(cents))}{isNegative ? ' deficit' : ''}
      </p>
      {subLabel && <p className="text-xs text-[var(--st-muted)] mt-1">{subLabel}</p>}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function FinancialDashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear())

  const { data, isLoading, isError } = useQuery<FinancialOverview>({
    queryKey: ['reports', 'financial-overview', year],
    queryFn: () => apiRequest<FinancialOverview>(`/reports/financial-overview?year=${year}`),
  })

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  // Trim trailing zero-months so the chart isn't mostly empty for current year
  const currentMonth = new Date().getMonth()
  const chartData = data
    ? (year === new Date().getFullYear()
        ? data.monthly.slice(0, currentMonth + 1)
        : data.monthly)
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">Financial Dashboard</h1>
          <p className="text-sm text-[var(--st-muted)] mt-0.5">Giving, expenses, and fund breakdown at a glance</p>
        </div>
        <select
          value={year}
          onChange={e => setYear(parseInt(e.target.value, 10))}
          className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--st-primary)]"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-[var(--st-muted)]">
          Loading financial data…
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Failed to load financial overview. Please try again.
        </div>
      )}

      {data && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="YTD Total Giving"
              cents={data.summary.ytdGivingCents}
              icon={TrendingUp}
              color="bg-emerald-500/20 text-emerald-400"
              subLabel={`${data.givingByFund.length} fund${data.givingByFund.length !== 1 ? 's' : ''} receiving contributions`}
            />
            <KpiCard
              label="YTD Total Expenses"
              cents={data.summary.ytdExpensesCents}
              icon={TrendingDown}
              color="bg-red-500/20 text-red-400"
              subLabel="Vendor payments and operational costs"
            />
            <KpiCard
              label={data.summary.ytdNetCents >= 0 ? 'YTD Net Surplus' : 'YTD Net Deficit'}
              cents={data.summary.ytdNetCents}
              icon={data.summary.ytdNetCents >= 0 ? DollarSign : BarChart2}
              color={data.summary.ytdNetCents >= 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}
              subLabel="Giving minus expenses year-to-date"
            />
          </div>

          {/* Income vs Expenses — grouped bar chart */}
          <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/60 p-5 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-[var(--st-fg)] mb-4">Monthly Giving vs. Expenses — {year}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--st-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--st-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fill: 'var(--st-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--st-muted)' }} />
                <Bar dataKey="givingCents"   name="Giving"   fill="#10b981" radius={[3,3,0,0]} />
                <Bar dataKey="expensesCents" name="Expenses" fill="#ef4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Net surplus bar + Giving by Fund donut — side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Net bar chart */}
            <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/60 p-5 backdrop-blur-sm">
              <h2 className="text-sm font-semibold text-[var(--st-fg)] mb-4">Monthly Net (Surplus / Deficit) — {year}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--st-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--st-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fill: 'var(--st-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="netCents" name="Net" radius={[3,3,0,0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.netCents >= 0 ? '#3b82f6' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-[var(--st-muted)] mt-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1" />Surplus&nbsp;&nbsp;
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500 mr-1" />Deficit
              </p>
            </div>

            {/* Giving by fund donut */}
            <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/60 p-5 backdrop-blur-sm">
              <h2 className="text-sm font-semibold text-[var(--st-fg)] mb-4">Giving by Fund — {year}</h2>
              {data.givingByFund.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-sm text-[var(--st-muted)]">
                  No giving data for {year}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.givingByFund}
                        dataKey="totalCents"
                        nameKey="fundName"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={2}
                      >
                        {data.givingByFund.map((_, i) => (
                          <Cell key={i} fill={FUND_COLORS[i % FUND_COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex-1 space-y-2">
                    {data.givingByFund.map((f, i) => (
                      <div key={f.fundName} className="flex items-center gap-2 text-xs">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: FUND_COLORS[i % FUND_COLORS.length] }} />
                        <span className="text-[var(--st-muted)] truncate flex-1">{f.fundName}</span>
                        <span className="font-medium text-[var(--st-fg)] whitespace-nowrap">{f.percentage}%</span>
                      </div>
                    ))}
                    <div className="mt-3 pt-2 border-t border-[var(--st-border)] text-xs">
                      <span className="text-[var(--st-muted)]">Total: </span>
                      <span className="font-semibold text-emerald-400">{fmt(data.summary.ytdGivingCents)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
