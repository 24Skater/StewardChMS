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

interface ParsedRow {
  first_name: string
  last_name: string
  email: string
  phone: string
}

function MemberImportPage() {
  const navigate = useNavigate()
  const importMutation = useImportMembers()
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Import Members</h1>
          <p className="mt-1 text-slate-400">
            Upload a CSV file to bulk import members
          </p>
        </div>

        {/* Import Results */}
        {importMutation.isSuccess && (
          <Card className="mb-6 border-emerald-500/50 bg-emerald-500/10">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-emerald-400">Import Complete!</h3>
              <p className="mt-2 text-slate-300">
                Successfully imported {importMutation.data.success} members.
                {importMutation.data.failed > 0 && (
                  <span className="text-amber-400"> {importMutation.data.failed} failed.</span>
                )}
              </p>
              {importMutation.data.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-300">Errors:</p>
                  <ul className="mt-2 space-y-1">
                    {importMutation.data.errors.slice(0, 10).map((err, idx) => (
                      <li key={idx} className="text-sm text-red-400">
                        Row {err.row}: {err.message}
                      </li>
                    ))}
                    {importMutation.data.errors.length > 10 && (
                      <li className="text-sm text-slate-400">
                        ...and {importMutation.data.errors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={() => navigate('/members')}
                  className="bg-amber-500 text-slate-900 hover:bg-amber-400"
                >
                  View Members
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700"
                >
                  Import More
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Card */}
        {!importMutation.isSuccess && (
          <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Upload CSV File</CardTitle>
              <CardDescription className="text-slate-400">
                The CSV file must have columns: first_name, last_name, email (optional), phone (optional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parseError && (
                <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                  <p className="text-sm text-red-400">{parseError}</p>
                </div>
              )}

              {importMutation.isError && (
                <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                  <p className="text-sm text-red-400">
                    {importMutation.error?.data?.error || 'Import failed'}
                  </p>
                </div>
              )}

              {parsedData.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-600 p-12">
                  <svg
                    className="mb-4 h-12 w-12 text-slate-500"
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
                  <p className="mb-4 text-slate-400">
                    Select a CSV file to upload
                  </p>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload">
                    <Button asChild className="bg-amber-500 text-slate-900 hover:bg-amber-400">
                      <span>Choose File</span>
                    </Button>
                  </label>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-slate-300">
                      <span className="font-medium">{fileName}</span> - {parsedData.length} rows to import
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="text-slate-400 hover:text-white"
                    >
                      Clear
                    </Button>
                  </div>

                  {/* Preview Table */}
                  <div className="mb-4 max-h-80 overflow-auto rounded-lg border border-slate-700">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-transparent">
                          <TableHead className="text-slate-300">First Name</TableHead>
                          <TableHead className="text-slate-300">Last Name</TableHead>
                          <TableHead className="text-slate-300">Email</TableHead>
                          <TableHead className="text-slate-300">Phone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.slice(0, 10).map((row, idx) => (
                          <TableRow key={idx} className="border-slate-700">
                            <TableCell className="text-white">{row.first_name}</TableCell>
                            <TableCell className="text-white">{row.last_name}</TableCell>
                            <TableCell className="text-slate-400">{row.email || '—'}</TableCell>
                            <TableCell className="text-slate-400">{row.phone || '—'}</TableCell>
                          </TableRow>
                        ))}
                        {parsedData.length > 10 && (
                          <TableRow className="border-slate-700">
                            <TableCell colSpan={4} className="text-center text-slate-400">
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
                      className="bg-amber-500 text-slate-900 hover:bg-amber-400"
                    >
                      {importMutation.isPending ? 'Importing...' : `Import ${parsedData.length} Members`}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/members')}
                      className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700"
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
        <Card className="mt-6 border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Example CSV Format</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-300">
{`first_name,last_name,email,phone
John,Doe,john.doe@example.com,555-1234
Jane,Smith,jane.smith@example.com,555-5678
Bob,Johnson,,555-9012`}
            </pre>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="mt-8">
          <Link to="/members" className="text-amber-400 hover:underline">
            ← Back to members
          </Link>
        </div>
      </div>
    </div>
  )
}

export default MemberImportPage

