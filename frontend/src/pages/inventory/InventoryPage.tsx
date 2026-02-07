import { useState } from 'react'
import { useInventorySummary, useInventoryTransactions, useAdjustInventory } from '../../hooks/useInventory'
import { useProducts } from '../../hooks/useProducts'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog'
import { Plus, History } from 'lucide-react'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}

export default function InventoryPage() {
  const [showInactive, setShowInactive] = useState(false)
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    quantityDelta: 0,
    note: '',
  })

  const { data: inventoryData, isLoading } = useInventorySummary(showInactive ? undefined : true)
  const { data: productsData } = useProducts(true)
  const { data: historyData } = useInventoryTransactions(selectedProductId || undefined, 50)
  const adjustMutation = useAdjustInventory()

  const openAdjustDialog = (productId?: string) => {
    setAdjustForm({
      productId: productId || '',
      quantityDelta: 0,
      note: '',
    })
    setIsAdjustDialogOpen(true)
  }

  const openHistoryDialog = (productId: string) => {
    setSelectedProductId(productId)
    setIsHistoryDialogOpen(true)
  }

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustForm.productId || adjustForm.quantityDelta === 0) return

    try {
      await adjustMutation.mutateAsync({
        productId: adjustForm.productId,
        quantityDelta: adjustForm.quantityDelta,
        note: adjustForm.note || undefined,
      })
      setIsAdjustDialogOpen(false)
    } catch {
      // Error handled by mutation
    }
  }

  const getStockStatusColor = (onHand: number) => {
    if (onHand <= 0) return 'text-red-400 bg-red-500/20'
    if (onHand <= 5) return 'text-amber-400 bg-amber-500/20'
    return 'text-emerald-400 bg-emerald-500/20'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Inventory</h1>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 text-sm text-[var(--st-muted)]">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="accent-[var(--st-primary)]"
            />
            Show inactive products
          </label>
          <Button onClick={() => openAdjustDialog()} className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]">
            <Plus className="h-4 w-4 mr-2" /> Adjust Inventory
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-[var(--st-muted)]">Loading...</div>}

      {inventoryData && (
        <div className="border border-[var(--st-border)] rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--st-border)]">
                <TableHead className="text-[var(--st-muted)]">Product</TableHead>
                <TableHead className="text-[var(--st-muted)]">SKU</TableHead>
                <TableHead className="text-right text-[var(--st-muted)]">Price</TableHead>
                <TableHead className="text-right text-[var(--st-muted)]">On Hand</TableHead>
                <TableHead className="text-[var(--st-muted)]">Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryData.inventory.length === 0 ? (
                <TableRow className="border-[var(--st-border)]">
                  <TableCell colSpan={6} className="text-center py-8 text-[var(--st-muted)]">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                inventoryData.inventory.map((item) => (
                  <TableRow key={item.productId} className={`border-[var(--st-border)] ${!item.isActive ? 'opacity-50' : ''}`}>
                    <TableCell className="font-medium text-[var(--st-fg)]">{item.productName}</TableCell>
                    <TableCell className="text-[var(--st-muted)]">{item.sku || '-'}</TableCell>
                    <TableCell className="text-right text-emerald-500 font-medium">{formatCents(item.priceCents)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-1 rounded font-medium ${getStockStatusColor(item.onHand)}`}>
                        {item.onHand}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--st-muted)]/20 text-[var(--st-muted)]'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAdjustDialog(item.productId)}
                          title="Adjust"
                          className="text-[var(--st-muted)] hover:text-[var(--st-fg)]"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openHistoryDialog(item.productId)}
                          title="History"
                          className="text-[var(--st-muted)] hover:text-[var(--st-fg)]"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Adjust Inventory Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--st-fg)]">Adjust Inventory</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjust}>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-[var(--st-fg)]">Product *</Label>
                <Select
                  value={adjustForm.productId}
                  onValueChange={(value) => setAdjustForm({ ...adjustForm, productId: value })}
                >
                  <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productsData?.products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantityDelta" className="text-[var(--st-fg)]">Quantity Change *</Label>
                <Input
                  id="quantityDelta"
                  type="number"
                  value={adjustForm.quantityDelta}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantityDelta: parseInt(e.target.value) || 0 })}
                  placeholder="Use negative for decrease"
                  className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                />
                <p className="text-sm text-[var(--st-muted)] mt-1">
                  Use positive numbers to add stock, negative to remove
                </p>
              </div>
              <div>
                <Label htmlFor="note" className="text-[var(--st-fg)]">Note</Label>
                <Input
                  id="note"
                  value={adjustForm.note}
                  onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                  placeholder="Reason for adjustment"
                  className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdjustDialogOpen(false)} className="border-[var(--st-border)] text-[var(--st-fg)]">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={adjustMutation.isPending || !adjustForm.productId || adjustForm.quantityDelta === 0}
                className="bg-[var(--st-primary)] text-white"
              >
                Adjust
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl bg-[var(--st-surface)] border-[var(--st-border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--st-fg)]">Transaction History</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)]">
                  <TableHead className="text-[var(--st-muted)]">Date</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Type</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Qty Change</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData?.transactions.length === 0 ? (
                  <TableRow className="border-[var(--st-border)]">
                    <TableCell colSpan={4} className="text-center py-8 text-[var(--st-muted)]">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  historyData?.transactions.map((tx) => (
                    <TableRow key={tx.id} className="border-[var(--st-border)]">
                      <TableCell className="text-sm text-[var(--st-fg)]">{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          tx.type === 'sale' ? 'bg-blue-500/20 text-blue-400' :
                          tx.type === 'return' ? 'bg-emerald-500/20 text-emerald-400' :
                          tx.type === 'purchase' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-[var(--st-muted)]/20 text-[var(--st-muted)]'
                        }`}>
                          {tx.type}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        tx.quantityDelta > 0 ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {tx.quantityDelta > 0 ? '+' : ''}{tx.quantityDelta}
                      </TableCell>
                      <TableCell className="text-sm text-[var(--st-muted)]">{tx.note || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)} className="border-[var(--st-border)] text-[var(--st-fg)]">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
