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
    if (onHand <= 0) return 'text-red-600 bg-red-50'
    if (onHand <= 5) return 'text-amber-600 bg-amber-50'
    return 'text-green-600 bg-green-50'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive products
          </label>
          <Button onClick={() => openAdjustDialog()}>
            <Plus className="h-4 w-4 mr-2" /> Adjust Inventory
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-8">Loading...</div>}

      {inventoryData && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryData.inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                inventoryData.inventory.map((item) => (
                  <TableRow key={item.productId} className={!item.isActive ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{item.sku || '-'}</TableCell>
                    <TableCell className="text-right">{formatCents(item.priceCents)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-1 rounded ${getStockStatusColor(item.onHand)}`}>
                        {item.onHand}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openHistoryDialog(item.productId)}
                          title="History"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Inventory</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjust}>
            <div className="space-y-4 py-4">
              <div>
                <Label>Product *</Label>
                <Select
                  value={adjustForm.productId}
                  onValueChange={(value) => setAdjustForm({ ...adjustForm, productId: value })}
                >
                  <SelectTrigger>
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
                <Label htmlFor="quantityDelta">Quantity Change *</Label>
                <Input
                  id="quantityDelta"
                  type="number"
                  value={adjustForm.quantityDelta}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantityDelta: parseInt(e.target.value) || 0 })}
                  placeholder="Use negative for decrease"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use positive numbers to add stock, negative to remove
                </p>
              </div>
              <div>
                <Label htmlFor="note">Note</Label>
                <Input
                  id="note"
                  value={adjustForm.note}
                  onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                  placeholder="Reason for adjustment"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={adjustMutation.isPending || !adjustForm.productId || adjustForm.quantityDelta === 0}
              >
                Adjust
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty Change</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData?.transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  historyData?.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          tx.type === 'sale' ? 'bg-blue-100 text-blue-800' :
                          tx.type === 'return' ? 'bg-green-100 text-green-800' :
                          tx.type === 'purchase' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {tx.type}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        tx.quantityDelta > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.quantityDelta > 0 ? '+' : ''}{tx.quantityDelta}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{tx.note || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


