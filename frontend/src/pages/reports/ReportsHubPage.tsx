import { Link } from 'react-router-dom'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  ShoppingCart,
  FileText
} from 'lucide-react'

const reportCards = [
  {
    title: 'Membership Summary',
    description: 'Total members by status, new members, and missing contact info',
    icon: Users,
    href: '/reports/membership',
    color: 'bg-blue-500',
  },
  {
    title: 'Attendance Summary',
    description: 'Check-ins per event, top events by attendance',
    icon: Calendar,
    href: '/reports/attendance',
    color: 'bg-green-500',
  },
  {
    title: 'Giving Summary',
    description: 'Donations by fund, total giving in period',
    icon: DollarSign,
    href: '/reports/giving',
    color: 'bg-purple-500',
  },
  {
    title: 'Sales Summary',
    description: 'Sales totals, top products, revenue breakdown',
    icon: ShoppingCart,
    href: '/reports/sales',
    color: 'bg-orange-500',
  },
  {
    title: 'Finance Reports',
    description: 'Fund balances, donor statements, and financial summaries',
    icon: FileText,
    href: '/reports/finance',
    color: 'bg-teal-500',
  },
]

export default function ReportsHubPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Reports</h1>
      <p className="text-gray-600 mb-8">
        Generate and export reports for membership, attendance, giving, and sales.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCards.map((card) => (
          <Link
            key={card.href}
            to={card.href}
            className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">{card.title}</h2>
                <p className="text-gray-600 text-sm">{card.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}


