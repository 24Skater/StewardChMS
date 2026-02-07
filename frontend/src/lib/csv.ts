/**
 * CSV Export Utilities
 * 
 * Provides secure, type-safe CSV generation and download functionality.
 * Properly handles special characters, escaping, and data sanitization.
 */

/**
 * Sanitize a cell value for CSV output
 * - Handles null/undefined
 * - Escapes quotes
 * - Wraps in quotes if contains special characters
 * - Prevents CSV injection attacks by escaping leading formula characters
 */
function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  
  let str = String(value)
  
  // Prevent CSV injection: escape leading characters that could be interpreted as formulas
  // This includes =, +, -, @, tab, carriage return
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`  // Prefix with single quote to neutralize
  }
  
  // Escape quotes and wrap in quotes if contains comma, quote, newline, or was sanitized
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str.startsWith("'")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  
  return str
}

/**
 * Convert data to CSV format and trigger download
 * @param filename - Name of the file to download (without path)
 * @param headers - Array of header strings
 * @param rows - 2D array of row data
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  // Sanitize filename to prevent path traversal
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  
  const csvContent = [
    headers.map(sanitizeCell).join(','),
    ...rows.map(row => row.map(sanitizeCell).join(','))
  ].join('\n')

  // Add BOM for Excel compatibility with UTF-8
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', safeFilename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Generate timestamped filename for exports
 * @param prefix - Prefix for the filename (e.g., 'members', 'donations')
 * @param extension - File extension (default: 'csv')
 */
export function generateExportFilename(prefix: string, extension: string = 'csv'): string {
  const now = new Date()
  const timestamp = now.toISOString().split('T')[0] // YYYY-MM-DD
  return `${prefix}-export-${timestamp}.${extension}`
}

/**
 * Format cents to dollars string for export
 */
export function formatCentsToDollars(cents: number): string {
  return (cents / 100).toFixed(2)
}

/**
 * Format date string for display/export
 * Returns empty string for null/undefined
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString()
  } catch {
    return ''
  }
}

/**
 * Format date-time string for export
 * Returns empty string for null/undefined
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleString()
  } catch {
    return ''
  }
}

/**
 * Format boolean for export
 */
export function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value ? 'Yes' : 'No'
}

/**
 * Generic export function that handles common patterns
 * @param data - Array of objects to export
 * @param columns - Array of column definitions
 * @param filename - Name of the export file
 */
export interface ExportColumn<T> {
  header: string
  accessor: keyof T | ((item: T) => string | number | null | undefined)
}

export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const headers = columns.map(col => col.header)
  const rows = data.map(item =>
    columns.map(col => {
      if (typeof col.accessor === 'function') {
        return col.accessor(item)
      }
      return item[col.accessor] as string | number | null | undefined
    })
  )
  
  downloadCSV(filename, headers, rows)
}
