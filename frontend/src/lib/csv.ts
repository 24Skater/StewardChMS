/**
 * CSV Export Utilities
 */

/**
 * Convert data to CSV format and trigger download
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        const str = String(cell)
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Format cents to dollars string
 */
export function formatCentsToDollars(cents: number): string {
  return (cents / 100).toFixed(2)
}

/**
 * Format date string for display
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}


