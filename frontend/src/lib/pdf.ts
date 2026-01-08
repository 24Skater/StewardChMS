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

interface Organization {
  name: string
  address?: string
  phone?: string
  email?: string
}

// Default organization info - should be configurable
const DEFAULT_ORG: Organization = {
  name: 'StewardChMS Church',
  address: '123 Main Street, City, ST 12345',
  phone: '(555) 123-4567',
  email: 'office@church.org',
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

// Add organization header to PDF
function addOrgHeader(doc: jsPDF, org: Organization = DEFAULT_ORG): number {
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(org.name, 20, 25)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  let y = 32
  if (org.address) {
    doc.text(org.address, 20, y)
    y += 5
  }
  if (org.phone) {
    doc.text(`Phone: ${org.phone}`, 20, y)
    y += 5
  }
  if (org.email) {
    doc.text(`Email: ${org.email}`, 20, y)
    y += 5
  }

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
  }
  year: number
  donations: DonorStatementDonation[]
  totalCents: number
}

/**
 * Generate a PDF donor statement
 */
export function generateDonorStatementPDF(statement: DonorStatement, org?: Organization): void {
  const doc = new jsPDF()

  // Header
  const y = addOrgHeader(doc, org)

  // Statement title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('CONTRIBUTION STATEMENT', 105, y + 10, { align: 'center' })

  // Donor info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Donor:', 20, y + 25)
  doc.setFont('helvetica', 'normal')
  doc.text(`${statement.member.firstName} ${statement.member.lastName}`, 50, y + 25)

  // Period
  doc.setFont('helvetica', 'bold')
  doc.text('Year:', 20, y + 32)
  doc.setFont('helvetica', 'normal')
  doc.text(statement.year.toString(), 50, y + 32)

  // Donations table
  const tableStartY = y + 45
  autoTable(doc, {
    startY: tableStartY,
    head: [['Date', 'Amount', 'Method', 'Fund']],
    body: statement.donations.map((d) => [
      formatDate(d.receivedAt),
      formatMoney(d.amountCents),
      d.method,
      d.fundName || 'General',
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246], // Blue
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 55 },
    },
    styles: {
      fontSize: 9,
    },
  })

  // Total
  const finalY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Total Contributions:', 20, finalY)
  doc.setFontSize(14)
  doc.text(formatMoney(statement.totalCents), 80, finalY)

  // Tax deductibility notice
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  const notice =
    'This statement is provided for your records. No goods or services were provided in exchange for these contributions unless otherwise noted. Please retain this statement for your tax records.'
  const splitNotice = doc.splitTextToSize(notice, 170)
  doc.text(splitNotice, 20, finalY + 15)

  // Thank you
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Thank you for your generous support!', 105, 270, { align: 'center' })

  // Save
  const donorName = `${statement.member.firstName}-${statement.member.lastName}`.replace(/\s+/g, '-')
  doc.save(`Contribution-Statement-${donorName}-${statement.year}.pdf`)
}

