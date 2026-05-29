/**
 * PDF Generation utilities for StewardChMS
 * Uses jsPDF and jspdf-autotable for creating invoices, POs, and donor statements
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Type augmentation for jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number }
  }
}

export interface Organization {
  name: string
  legalName?: string
  ein?: string               // Federal Tax ID / EIN (XX-XXXXXXX)
  address?: string           // Street address
  city?: string
  state?: string
  zip?: string
  phone?: string
  email?: string
  website?: string
  authorizedOfficerName?: string
  authorizedOfficerTitle?: string
}

// Default organization info — overridden at runtime from /api/settings/organization
const DEFAULT_ORG: Organization = {
  name: 'Your Church Name',
  address: '123 Main Street',
  city: 'City',
  state: 'ST',
  zip: '00000',
  phone: '(555) 123-4567',
  email: 'office@church.org',
  authorizedOfficerName: 'Pastor',
  authorizedOfficerTitle: 'Senior Pastor',
}

// Format cents to dollars
function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

// Format date
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Add organization header to PDF (used by invoices and POs)
function addOrgHeader(doc: jsPDF, org: Organization = DEFAULT_ORG): number {
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(org.name, 20, 25)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  let y = 32
  const addressLine = [org.address, org.city && org.state ? `${org.city}, ${org.state} ${org.zip ?? ''}`.trim() : null]
    .filter(Boolean).join(', ')
  if (addressLine) { doc.text(addressLine, 20, y); y += 5 }
  if (org.phone) { doc.text(`Phone: ${org.phone}`, 20, y); y += 5 }
  if (org.email) { doc.text(`Email: ${org.email}`, 20, y); y += 5 }

  return y + 5
}

// Invoice types
interface InvoiceItem {
  description: string
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
}

interface Invoice {
  invoiceNumber: string
  billToName?: string | null
  vendor?: { name: string; email?: string | null } | null
  issueDate: string
  dueDate?: string | null
  status: string
  subtotalCents: number
  taxCents: number
  totalCents: number
  note?: string | null
  items?: InvoiceItem[]
}

/**
 * Generate a PDF invoice
 */
export function generateInvoicePDF(invoice: Invoice, org?: Organization): void {
  const doc = new jsPDF()

  // Header
  const y = addOrgHeader(doc, org)

  // Invoice title and number
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', 150, 25)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${invoice.invoiceNumber}`, 150, 32)

  // Bill To
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', 20, y + 10)
  doc.setFont('helvetica', 'normal')
  const billTo = invoice.billToName || invoice.vendor?.name || 'N/A'
  doc.text(billTo, 20, y + 17)
  if (invoice.vendor?.email) {
    doc.text(invoice.vendor.email, 20, y + 23)
  }

  // Invoice details on the right
  doc.setFont('helvetica', 'bold')
  doc.text('Issue Date:', 120, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(invoice.issueDate), 155, y + 10)

  if (invoice.dueDate) {
    doc.setFont('helvetica', 'bold')
    doc.text('Due Date:', 120, y + 17)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(invoice.dueDate), 155, y + 17)
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Status:', 120, y + 24)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.status.toUpperCase(), 155, y + 24)

  // Line items table
  const tableStartY = y + 40
  const items = invoice.items || []
  autoTable(doc, {
    startY: tableStartY,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: items.map((item) => [
      item.description,
      item.quantity.toString(),
      formatMoney(item.unitPriceCents),
      formatMoney(item.lineTotalCents),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
  })

  // Totals
  const finalY = doc.lastAutoTable.finalY + 10
  const totalsX = 130
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', totalsX, finalY)
  doc.text(formatMoney(invoice.subtotalCents), 175, finalY, { align: 'right' })

  doc.text('Tax:', totalsX, finalY + 7)
  doc.text(formatMoney(invoice.taxCents), 175, finalY + 7, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.text('Total:', totalsX, finalY + 16)
  doc.setFontSize(14)
  doc.text(formatMoney(invoice.totalCents), 175, finalY + 16, { align: 'right' })

  // Notes
  if (invoice.note) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes:', 20, finalY + 30)
    doc.setFont('helvetica', 'normal')
    const splitNote = doc.splitTextToSize(invoice.note, 170)
    doc.text(splitNote, 20, finalY + 37)
  }

  // Footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text('Thank you for your business!', 105, 280, { align: 'center' })

  // Save
  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`)
}

// Purchase Order types
interface POItem {
  description: string
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
}

interface PurchaseOrder {
  poNumber: string
  vendor?: { name: string; email?: string | null } | null
  requestorUser?: { username: string } | null
  issueDate: string
  status: string
  subtotalCents: number
  taxCents: number
  totalCents: number
  note?: string | null
  items?: POItem[]
}

/**
 * Generate a PDF purchase order
 */
export function generatePurchaseOrderPDF(po: PurchaseOrder, org?: Organization): void {
  const doc = new jsPDF()

  // Header
  const y = addOrgHeader(doc, org)

  // PO title and number
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('PURCHASE ORDER', 140, 25)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${po.poNumber}`, 140, 32)

  // Vendor
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Vendor:', 20, y + 10)
  doc.setFont('helvetica', 'normal')
  const vendorName = po.vendor?.name || 'N/A'
  doc.text(vendorName, 20, y + 17)
  if (po.vendor?.email) {
    doc.text(po.vendor.email, 20, y + 23)
  }

  // PO details on the right
  doc.setFont('helvetica', 'bold')
  doc.text('Issue Date:', 120, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(po.issueDate), 160, y + 10)

  doc.setFont('helvetica', 'bold')
  doc.text('Status:', 120, y + 17)
  doc.setFont('helvetica', 'normal')
  doc.text(po.status.toUpperCase(), 160, y + 17)

  if (po.requestorUser) {
    doc.setFont('helvetica', 'bold')
    doc.text('Requested By:', 120, y + 24)
    doc.setFont('helvetica', 'normal')
    doc.text(po.requestorUser.username, 160, y + 24)
  }

  // Line items table
  const tableStartY = y + 40
  const items = po.items || []
  autoTable(doc, {
    startY: tableStartY,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: items.map((item) => [
      item.description,
      item.quantity.toString(),
      formatMoney(item.unitPriceCents),
      formatMoney(item.lineTotalCents),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [34, 197, 94], // Green
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
  })

  // Totals
  const finalY = doc.lastAutoTable.finalY + 10
  const totalsX = 130
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', totalsX, finalY)
  doc.text(formatMoney(po.subtotalCents), 175, finalY, { align: 'right' })

  doc.text('Tax:', totalsX, finalY + 7)
  doc.text(formatMoney(po.taxCents), 175, finalY + 7, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.text('Total:', totalsX, finalY + 16)
  doc.setFontSize(14)
  doc.text(formatMoney(po.totalCents), 175, finalY + 16, { align: 'right' })

  // Notes
  if (po.note) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes:', 20, finalY + 30)
    doc.setFont('helvetica', 'normal')
    const splitNote = doc.splitTextToSize(po.note, 170)
    doc.text(splitNote, 20, finalY + 37)
  }

  // Save
  doc.save(`PO-${po.poNumber}.pdf`)
}

// Donor Statement types
interface DonorStatementDonation {
  receivedAt: string
  amountCents: number
  method: string
  fundName?: string | null
}

interface DonorStatement {
  member: {
    firstName: string
    lastName: string
    email?: string | null
    street?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
  }
  year: number
  donations: DonorStatementDonation[]
  totalCents: number
}

/**
 * Generate an IRS-compliant Charitable Contribution Acknowledgment PDF.
 *
 * Satisfies IRC §170(f)(8) contemporaneous written acknowledgment requirements.
 * Includes:
 *  - Church letterhead with EIN and 501(c)(3) status
 *  - Itemized contribution table with fund and payment method
 *  - Quid pro quo disclosure (no goods/services exchanged)
 *  - Authorized officer signature block for printing
 */
export function generateDonorStatementPDF(statement: DonorStatement, org?: Organization): void {
  const o = { ...DEFAULT_ORG, ...org }
  const doc = new jsPDF({ format: 'letter', unit: 'mm' })
  const pw = doc.internal.pageSize.getWidth()   // 215.9 mm
  const ph = doc.internal.pageSize.getHeight()  // 279.4 mm
  const ml = 20   // margin left
  const mr = pw - 20  // margin right
  const cw = mr - ml  // content width
  const statementDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── LETTERHEAD ───────────────────────────────────────────────────────────
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(o.legalName || o.name, pw / 2, 18, { align: 'center' })

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  let hy = 24
  const addrParts = [o.address, o.city && o.state ? `${o.city}, ${o.state}${o.zip ? ' ' + o.zip : ''}` : null]
    .filter(Boolean)
  if (addrParts.length) { doc.text(addrParts.join('  ·  '), pw / 2, hy, { align: 'center' }); hy += 4.5 }
  const contactParts = [o.phone, o.email, o.website].filter(Boolean)
  if (contactParts.length) { doc.text(contactParts.join('  ·  '), pw / 2, hy, { align: 'center' }); hy += 4.5 }

  if (o.ein) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(`Federal Tax ID (EIN): ${o.ein}   |   Recognized as tax-exempt under IRC Section 501(c)(3)`, pw / 2, hy, { align: 'center' })
    hy += 4.5
  }

  // Thick rule under letterhead
  doc.setLineWidth(0.8)
  doc.setDrawColor(30, 58, 138)
  doc.line(ml, hy + 1, mr, hy + 1)
  let y = hy + 8

  // ── DOCUMENT TITLE ───────────────────────────────────────────────────────
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 58, 138)
  doc.text('CHARITABLE CONTRIBUTION ACKNOWLEDGMENT', pw / 2, y, { align: 'center' })
  y += 5.5
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(`Tax Year ${statement.year}`, pw / 2, y, { align: 'center' })
  y += 3
  doc.setLineWidth(0.3)
  doc.setDrawColor(180, 180, 180)
  doc.line(ml, y + 1, mr, y + 1)
  y += 8

  // ── DONOR + DATE (two-column) ────────────────────────────────────────────
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('PREPARED FOR:', ml, y)
  doc.text('STATEMENT DATE:', pw / 2 + 8, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(`${statement.member.firstName} ${statement.member.lastName}`, ml, y)
  doc.text(statementDate, pw / 2 + 8, y)
  y += 4.5
  if (statement.member.street) {
    doc.text(statement.member.street, ml, y); y += 4.5
  }
  const cityLine = [statement.member.city, statement.member.state].filter(Boolean).join(', ')
    + (statement.member.zip ? ' ' + statement.member.zip : '')
  if (cityLine.trim()) { doc.text(cityLine, ml, y); y += 4.5 }
  if (statement.member.email) { doc.text(statement.member.email, ml, y); y += 4.5 }
  y += 4

  // ── OPENING STATEMENT ────────────────────────────────────────────────────
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  const opening = `This letter constitutes your Contemporaneous Written Acknowledgment as required by the Internal Revenue Service under Internal Revenue Code Section 170(f)(8) for charitable contributions made to ${o.name} during the ${statement.year} tax year. Please retain this document with your permanent tax records for use in preparing your federal income tax return.`
  const splitOpening = doc.splitTextToSize(opening, cw)
  doc.text(splitOpening, ml, y)
  y += splitOpening.length * 4.8 + 5

  // ── CONTRIBUTIONS TABLE ──────────────────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 58, 138)
  doc.text('CONTRIBUTION DETAIL', ml, y)
  doc.setTextColor(0, 0, 0)
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['DATE', 'FUND / DESIGNATION', 'PAYMENT METHOD', 'AMOUNT']],
    body: statement.donations.length > 0
      ? statement.donations.map((d) => [
          formatDate(d.receivedAt),
          d.fundName || 'General Fund',
          d.method.charAt(0).toUpperCase() + d.method.slice(1),
          formatMoney(d.amountCents),
        ])
      : [['—', 'No contributions recorded for this tax year', '—', '$0.00']],
    foot: [['', '', 'TOTAL CONTRIBUTIONS', formatMoney(statement.totalCents)]],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    footStyles: {
      fillColor: [239, 246, 255],
      textColor: [30, 58, 138],
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 3,
    },
    bodyStyles: { fontSize: 8.5, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 75 },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
    },
  })

  y = doc.lastAutoTable.finalY + 8

  // ── IRS DISCLOSURE BOX ───────────────────────────────────────────────────
  // Measure text first, then draw background
  doc.setFontSize(8.5)
  const para1 = `${o.name} is a religious nonprofit corporation recognized as tax-exempt under Internal Revenue Code Section 501(c)(3)${o.ein ? ` (EIN: ${o.ein})` : ''}. Contributions to ${o.name} are generally deductible for federal income tax purposes to the extent allowed by law under IRC Section 170, subject to applicable adjusted gross income limitations.`
  const para2 = `No goods or services were provided to the donor named above in exchange for the contributions listed herein, except as otherwise expressly noted. This written acknowledgment satisfies the contemporaneous written acknowledgment requirement of IRC Section 170(f)(8)(A) for all single contributions of $250.00 or more. IMPORTANT: Under IRC Section 170(f)(8)(A), no deduction is allowed for a contribution of $250 or more unless the taxpayer substantiates the contribution with a contemporaneous written acknowledgment from the organization. This document serves as that acknowledgment.`
  const para3 = `For further guidance on deducting charitable contributions, refer to IRS Publication 526, "Charitable Contributions," and IRS Publication 1771, "Charitable Contributions — Substantiation and Disclosure Requirements," available at www.irs.gov.`

  const sp1 = doc.splitTextToSize(para1, cw - 8)
  const sp2 = doc.splitTextToSize(para2, cw - 8)
  const sp3 = doc.splitTextToSize(para3, cw - 8)
  const boxH = 8 + (sp1.length + sp2.length + sp3.length) * 4.5 + 12

  // Check page break
  if (y + boxH > ph - 55) { doc.addPage(); y = 20 }

  // Draw shaded box
  doc.setFillColor(239, 246, 255)
  doc.setDrawColor(30, 58, 138)
  doc.setLineWidth(0.4)
  doc.roundedRect(ml, y, cw, boxH, 2, 2, 'FD')

  let by = y + 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 58, 138)
  doc.text('TAX DEDUCTIBILITY DISCLOSURE — IRC §170', ml + 4, by)
  by += 5.5

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)
  doc.text(sp1, ml + 4, by); by += sp1.length * 4.5 + 3
  doc.text(sp2, ml + 4, by); by += sp2.length * 4.5 + 3
  doc.setFont('helvetica', 'italic')
  doc.text(sp3, ml + 4, by)

  y = y + boxH + 10

  // ── SIGNATURE BLOCK ──────────────────────────────────────────────────────
  if (y > ph - 50) { doc.addPage(); y = 20 }

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('AUTHORIZED SIGNATURE', ml, y)
  y += 3
  doc.setLineWidth(0.3)
  doc.setDrawColor(100, 100, 100)
  doc.line(ml, y + 1, mr, y + 1)
  y += 8

  // Left column: signature
  doc.setLineWidth(0.4)
  doc.setDrawColor(60, 60, 60)
  doc.line(ml, y + 8, ml + 75, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Signature', ml, y + 12)

  // Right column: date
  doc.line(mr - 55, y + 8, mr, y + 8)
  doc.text('Date', mr - 55, y + 12)
  y += 18

  // Printed name + title block
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text(o.authorizedOfficerName || '', ml, y)
  y += 4.5
  doc.setFont('helvetica', 'normal')
  doc.text(o.authorizedOfficerTitle || 'Senior Pastor', ml, y)
  y += 4.5
  doc.text(o.name, ml, y)

  // ── PAGE FOOTER ──────────────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(120, 120, 120)
  doc.text(
    `Thank you for your generous support of ${o.name}.  ·  Statement generated ${statementDate}  ·  ${o.name} — ${o.legalName || o.name}`,
    pw / 2, ph - 8, { align: 'center' }
  )

  const donorName = `${statement.member.firstName}-${statement.member.lastName}`.replace(/\s+/g, '-')
  doc.save(`Contribution-Statement-${donorName}-${statement.year}.pdf`)
}

