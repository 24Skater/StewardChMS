import { allIconNames, Icon } from '@/lib/icons'

const sizes = [12, 14, 16, 18, 24, 48] as const

export function IconTestPage() {
  return (
    <div className="p-8 bg-white min-h-screen">
      <h1 className="text-xl font-bold mb-6">Icon Sprite — {allIconNames.length} icons</h1>
      {allIconNames.map(name => (
        <div key={name} className="flex items-center gap-4 mb-3 border-b pb-2">
          <span className="w-36 text-xs font-mono text-gray-500">{name}</span>
          {sizes.map(size => (
            <div key={size} className="flex flex-col items-center gap-1">
              <Icon name={name} size={size} />
              <Icon name={name} size={size} active className="text-blue-600" />
              <span className="text-xs text-gray-400">{size}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
