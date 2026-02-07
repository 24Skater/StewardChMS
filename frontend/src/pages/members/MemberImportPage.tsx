import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useImportMembers } from '@/hooks/useMembers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download } from 'lucide-react'

interface ParsedRow {
  first_name: string
  last_name: string
  email: string
  phone: string
}

const CSV_TEMPLATE = `first_name,last_name,email,phone
John,Doe,john.doe@example.com,555-1234
Jane,Smith,jane.smith@example.com,555-5678
Bob,Johnson,,555-9012`

function MemberImportPage() {
  const navigate = useNavigate()
  const importMutation = useImportMembers()
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'members-import-template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      setParseError('CSV file must have a header row and at least one data row')
      return
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))
    
    // Check required columns
    if (!headers.includes('first_name') || !headers.includes('last_name')) {
      setParseError('CSV must have "first_name" and "last_name" columns')
      return
    }

    const rows: ParsedRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Simple CSV parsing (doesn't handle quoted commas)
      const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''))
      
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })

      rows.push({
        first_name: row['first_name'] || '',
        last_name: row['last_name'] || '',
        email: row['email'] || '',
        phone: row['phone'] || '',
      })
    }

    if (rows.length === 0) {
      setParseError('No valid data rows found in CSV')
      return
    }

    if (rows.length > 1000) {
      setParseError('Maximum 1000 rows per import')
      return
    }

    setParseError(null)
    setParsedData(rows)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      parseCSV(text)
    }
    reader.onerror = () => {
      setParseError('Failed to read file')
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return

    try {
      await importMutation.mutateAsync(parsedData as unknown as Array<Record<string, string>>)
    } catch {
      // Error handled by mutation
    }
  }

  const handleReset = () => {
    setParsedData([])
    setParseError(null)
    setFileName(null)
    importMutation.reset()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--st-fg)]">Import Members</h1>
          <p className="mt-1 text-[var(--st-muted)]">
            Upload a CSV file to bulk import members
          </p>
        </div>
        <Button
          variant="outline"
          onClick={downloadTemplate}
          className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Import Results */}
      {importMutation.isSuccess && (
        <Card className="border-emerald-500/50 bg-emerald-500/10">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-emerald-500">Import Complete!</h3>
            <p className="mt-2 text-[var(--st-fg)]">
              Successfully imported {importMutation.data.success} members.
              {importMutation.data.failed > 0 && (
                <span className="text-amber-500"> {importMutation.data.failed} failed.</span>
              )}
            </p>
            {importMutation.data.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-[var(--st-fg)]">Errors:</p>
                <ul className="mt-2 space-y-1">
                  {importMutation.data.errors.slice(0, 10).map((err, idx) => (
                    <li key={idx} className="text-sm text-red-500">
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                  {importMutation.data.errors.length > 10 && (
                    <li className="text-sm text-[var(--st-muted)]">
                      ...and {importMutation.data.errors.length - 10} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <Button
                onClick={() => navigate('/members')}
                className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]"
              >
                View Members
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
              >
                Import More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Card */}
      {!importMutation.isSuccess && (
        <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
          <CardHeader>
            <CardTitle className="text-[var(--st-fg)]">Upload CSV File</CardTitle>
            <CardDescription className="text-[var(--st-muted)]">
              The CSV file must have columns: first_name, last_name, email (optional), phone (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parseError && (
              <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                <p className="text-sm text-red-500">{parseError}</p>
              </div>
            )}

            {importMutation.isError && (
              <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                <p className="text-sm text-red-500">
                  {importMutation.error?.data?.error || 'Import failed'}
                </p>
              </div>
            )}

            {parsedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--st-border)] p-12">
                <svg
                  className="mb-4 h-12 w-12 text-[var(--st-muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mb-4 text-[var(--st-muted)]">
                  Select a CSV file to upload
                </p>
                <div className="flex gap-3">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload">
                    <Button asChild className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]">
                      <span>Choose File</span>
                    </Button>
                  </label>
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Get Template
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[var(--st-fg)]">
                    <span className="font-medium">{fileName}</span> - {parsedData.length} rows to import
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-[var(--st-muted)] hover:text-[var(--st-fg)]"
                  >
                    Clear
                  </Button>
                </div>

                {/* Preview Table */}
                <div className="mb-4 max-h-80 overflow-auto rounded-lg border border-[var(--st-border)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[var(--st-border)] hover:bg-transparent">
                        <TableHead className="text-[var(--st-muted)]">First Name</TableHead>
                        <TableHead className="text-[var(--st-muted)]">Last Name</TableHead>
                        <TableHead className="text-[var(--st-muted)]">Email</TableHead>
                        <TableHead className="text-[var(--st-muted)]">Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx} className="border-[var(--st-border)]">
                          <TableCell className="text-[var(--st-fg)]">{row.first_name}</TableCell>
                          <TableCell className="text-[var(--st-fg)]">{row.last_name}</TableCell>
                          <TableCell className="text-[var(--st-muted)]">{row.email || '—'}</TableCell>
                          <TableCell className="text-[var(--st-muted)]">{row.phone || '—'}</TableCell>
                        </TableRow>
                      ))}
                      {parsedData.length > 10 && (
                        <TableRow className="border-[var(--st-border)]">
                          <TableCell colSpan={4} className="text-center text-[var(--st-muted)]">
                            ...and {parsedData.length - 10} more rows
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                    className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]"
                  >
                    {importMutation.isPending ? 'Importing...' : `Import ${parsedData.length} Members`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/members')}
                    className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Example CSV */}
      <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[var(--st-fg)]">Example CSV Format</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadTemplate}
            className="text-[var(--st-muted)] hover:text-[var(--st-fg)]"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-[var(--st-surfaceMuted)] border border-[var(--st-border)] p-4 text-sm text-[var(--st-fg)]">
{CSV_TEMPLATE}
          </pre>
          <p className="mt-3 text-sm text-[var(--st-muted)]">
            <strong>Required columns:</strong> first_name, last_name<br />
            <strong>Optional columns:</strong> email, phone
          </p>
        </CardContent>
      </Card>

      {/* Back Link */}
      <div>
        <Link to="/members" className="text-[var(--st-link)] hover:underline">
          ← Back to members
        </Link>
      </div>
    </div>
  )
}

export default MemberImportPage
