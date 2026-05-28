import { useState, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  useChildren,
  useOccurrences,
  useCheckedIn,
  useCheckinStats,
  useCheckIn,
  useCheckOutByCode,
  useCheckOutById,
  type Child,
  type CheckInResponse,
} from '@/hooks/useKidsCheckin'

function CheckinLabel({ data }: { data: CheckInResponse['label'] }) {
  return (
    <div className="p-4 border-2 border-dashed border-gray-400 bg-white text-black font-mono text-sm">
      <div className="text-center border-b pb-2 mb-2">
        <div className="text-lg font-bold">KIDS CHECK-IN</div>
        <div className="text-xs">{data.eventName}</div>
      </div>
      <div className="space-y-1">
        <div className="text-xl font-bold text-center">{data.childName}</div>
        <div className="text-3xl font-bold text-center tracking-widest bg-gray-100 py-2 rounded">
          {data.securityCode}
        </div>
        {data.allergies && (
          <div className="bg-red-100 text-red-800 p-2 rounded text-xs">
            <strong>ALLERGIES:</strong> {data.allergies}
          </div>
        )}
        {data.medicalNotes && (
          <div className="bg-yellow-100 text-yellow-800 p-2 rounded text-xs">
            <strong>MEDICAL:</strong> {data.medicalNotes}
          </div>
        )}
        <div className="text-xs text-gray-600 text-center pt-2">
          {new Date(data.checkedInAt).toLocaleString()}
        </div>
        {data.parentGuardianName && (
          <div className="text-xs text-center">
            Picked up by: {data.parentGuardianName}
          </div>
        )}
      </div>
    </div>
  )
}

export default function KidsCheckinPage() {
  const [selectedOccurrence, setSelectedOccurrence] = useState<string>('')
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [checkoutCode, setCheckoutCode] = useState('')
  const [showLabelDialog, setShowLabelDialog] = useState(false)
  const [labelData, setLabelData] = useState<CheckInResponse['label'] | null>(null)
  const [parentGuardianName, setParentGuardianName] = useState('')
  
  const labelRef = useRef<HTMLDivElement>(null)

  const { data: children = [], isLoading: loadingChildren } = useChildren()
  const { data: occurrences = [], isLoading: loadingOccurrences } = useOccurrences()
  const { data: checkedIn = [], isLoading: loadingCheckedIn } = useCheckedIn(selectedOccurrence || undefined)
  const { data: stats } = useCheckinStats()

  const checkInMutation = useCheckIn()
  const checkOutByCodeMutation = useCheckOutByCode()
  const checkOutByIdMutation = useCheckOutById()

  const handlePrint = useReactToPrint({
    contentRef: labelRef,
    documentTitle: 'Check-in Label',
  })

  const handleCheckIn = async () => {
    if (!selectedChild || !selectedOccurrence) return

    try {
      const result = await checkInMutation.mutateAsync({
        memberId: selectedChild.id,
        occurrenceId: selectedOccurrence,
        parentGuardianName: parentGuardianName || undefined,
      })
      setLabelData(result.label)
      setShowLabelDialog(true)
      setSelectedChild(null)
      setParentGuardianName('')
    } catch (error) {
      console.error('Check-in failed:', error)
    }
  }

  const handleCheckOutByCode = async () => {
    if (!checkoutCode) return

    try {
      await checkOutByCodeMutation.mutateAsync(checkoutCode)
      setCheckoutCode('')
    } catch (error) {
      console.error('Check-out failed:', error)
    }
  }

  const handleCheckOutById = async (checkInId: string) => {
    try {
      await checkOutByIdMutation.mutateAsync(checkInId)
    } catch (error) {
      console.error('Check-out failed:', error)
    }
  }

  const filteredChildren = children.filter(
    (child) =>
      !checkedIn.some(
        (ci) => ci.memberId === child.id && ci.occurrenceId === selectedOccurrence
      )
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--st-fg)]">Kids Check-In</h1>
          <p className="text-[var(--st-muted)]">Manage children's check-in and check-out</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[var(--st-muted)]">Total Children</CardDescription>
            <CardTitle className="text-3xl text-[var(--st-fg)]">{stats?.totalChildren ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[var(--st-muted)]">Checked In Today</CardDescription>
            <CardTitle className="text-3xl text-[var(--st-fg)]">{stats?.checkedInToday ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[var(--st-muted)]">Currently Here</CardDescription>
            <CardTitle className="text-3xl text-[var(--st-color-success)]">{stats?.currentlyCheckedIn ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[var(--st-muted)]">Checked Out</CardDescription>
            <CardTitle className="text-3xl text-[var(--st-fg)]">{stats?.checkedOutToday ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Check-In Section */}
        <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <CardHeader>
            <CardTitle className="text-[var(--st-fg)]">Check In</CardTitle>
            <CardDescription className="text-[var(--st-muted)]">Select an event and child to check in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--st-fg)]">Event</Label>
              <Select
                value={selectedOccurrence}
                onValueChange={setSelectedOccurrence}
                disabled={loadingOccurrences}
              >
                <SelectTrigger className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                  <SelectValue placeholder="Select an event..." />
                </SelectTrigger>
                <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
                  {occurrences.map((occ) => (
                    <SelectItem key={occ.id} value={occ.id} className="text-[var(--st-fg)]">
                      {occ.event.title} - {new Date(occ.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {occurrences.length === 0 && !loadingOccurrences && (
                <p className="text-sm text-[var(--st-muted)]">No events scheduled for today</p>
              )}
            </div>

            {selectedOccurrence && (
              <>
                <div className="space-y-2">
                  <Label className="text-[var(--st-fg)]">Child</Label>
                  <Select
                    value={selectedChild?.id ?? ''}
                    onValueChange={(id) => setSelectedChild(children.find((c) => c.id === id) ?? null)}
                    disabled={loadingChildren}
                  >
                    <SelectTrigger className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                      <SelectValue placeholder="Select a child..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
                      {filteredChildren.map((child) => (
                        <SelectItem key={child.id} value={child.id} className="text-[var(--st-fg)]">
                          {child.firstName} {child.lastName}
                          {child.allergies && ' *'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedChild && (
                  <div className="space-y-4">
                    {/* Child Info Card */}
                    <div className="p-4 bg-[var(--st-surface-muted)] border border-[var(--st-border)] rounded-lg space-y-2">
                      <div className="font-medium text-[var(--st-fg)]">
                        {selectedChild.firstName} {selectedChild.lastName}
                      </div>
                      {selectedChild.dateOfBirth && (
                        <div className="text-sm text-[var(--st-muted)]">
                          DOB: {new Date(selectedChild.dateOfBirth).toLocaleDateString()}
                        </div>
                      )}
                      {selectedChild.allergies && (
                        <div className="text-sm text-[var(--st-color-danger)]">
                          Allergies: {selectedChild.allergies}
                        </div>
                      )}
                      {selectedChild.medicalNotes && (
                        <div className="text-sm text-[var(--st-color-warning)]">
                          Medical: {selectedChild.medicalNotes}
                        </div>
                      )}
                      {selectedChild.parents.length > 0 && (
                        <div className="text-sm text-[var(--st-fg)]">
                          <strong>Parents:</strong>{' '}
                          {selectedChild.parents.map((p) => `${p.firstName} ${p.lastName}`).join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="parentGuardianName" className="text-[var(--st-fg)]">Picking Up (optional)</Label>
                      <Input
                        id="parentGuardianName"
                        value={parentGuardianName}
                        onChange={(e) => setParentGuardianName(e.target.value)}
                        placeholder="Name of person picking up"
                        className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                      />
                    </div>

                    <Button
                      onClick={handleCheckIn}
                      disabled={checkInMutation.isPending}
                      className="w-full bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]"
                    >
                      {checkInMutation.isPending ? 'Checking In...' : 'Check In & Print Label'}
                    </Button>

                    {checkInMutation.isError && (
                      <p className="text-sm text-[var(--st-color-danger)]">
                        {(checkInMutation.error as Error).message || 'Check-in failed'}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Check-Out Section */}
        <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <CardHeader>
            <CardTitle className="text-[var(--st-fg)]">Check Out</CardTitle>
            <CardDescription className="text-[var(--st-muted)]">Enter security code to check out</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={checkoutCode}
                onChange={(e) => setCheckoutCode(e.target.value.toUpperCase())}
                placeholder="Enter security code..."
                maxLength={4}
                className="text-2xl text-center tracking-widest font-mono bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
              />
              <Button
                onClick={handleCheckOutByCode}
                disabled={!checkoutCode || checkOutByCodeMutation.isPending}
                className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]"
              >
                {checkOutByCodeMutation.isPending ? 'Processing...' : 'Check Out'}
              </Button>
            </div>

            {checkOutByCodeMutation.isError && (
              <p className="text-sm text-[var(--st-color-danger)]">
                {(checkOutByCodeMutation.error as Error).message || 'Invalid security code'}
              </p>
            )}

            {checkOutByCodeMutation.isSuccess && (
              <p className="text-sm text-[var(--st-color-success)]">✓ Check-out successful!</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Currently Checked In */}
      <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
        <CardHeader>
          <CardTitle className="text-[var(--st-fg)]">Currently Checked In</CardTitle>
          <CardDescription className="text-[var(--st-muted)]">
            {selectedOccurrence
              ? `Showing children checked in to selected event`
              : 'Showing all children checked in today'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCheckedIn ? (
            <p className="text-[var(--st-muted)]">Loading...</p>
          ) : checkedIn.length === 0 ? (
            <p className="text-[var(--st-muted)]">No children currently checked in</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)]">
                  <TableHead className="text-[var(--st-muted)]">Name</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Event</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Security Code</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Checked In</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Alerts</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkedIn.map((ci) => (
                  <TableRow key={ci.id} className="border-[var(--st-border)]">
                    <TableCell className="font-medium text-[var(--st-fg)]">
                      {ci.member.firstName} {ci.member.lastName}
                    </TableCell>
                    <TableCell className="text-[var(--st-fg)]">{ci.occurrence.event.title}</TableCell>
                    <TableCell>
                      <code className="bg-[var(--st-surface-muted)] px-2 py-1 rounded font-mono text-[var(--st-fg)]">
                        {ci.member.securityCode}
                      </code>
                    </TableCell>
                    <TableCell className="text-[var(--st-fg)]">
                      {new Date(ci.checkedInAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      {ci.member.allergies && (
                        <Badge variant="destructive" className="mr-1 bg-[var(--st-color-danger)] text-white">
                          Allergies
                        </Badge>
                      )}
                      {ci.member.medicalNotes && (
                        <Badge variant="secondary" className="bg-[var(--st-color-warning)] text-black">Medical</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckOutById(ci.id)}
                        disabled={checkOutByIdMutation.isPending}
                        className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                      >
                        Check Out
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Print Label Dialog */}
      <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
        <DialogContent className="max-w-md bg-[var(--st-surface)] border-[var(--st-border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--st-fg)]">Check-In Complete</DialogTitle>
            <DialogDescription className="text-[var(--st-muted)]">
              Print the label and give it to the parent/guardian
            </DialogDescription>
          </DialogHeader>
          <div ref={labelRef} className="my-4">
            {labelData && <CheckinLabel data={labelData} />}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowLabelDialog(false)} className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]">
              Close
            </Button>
            <Button onClick={() => handlePrint()} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">Print Label</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

