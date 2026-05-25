'use client'

import { useEffect, useState } from 'react'
import { Users, Search, Filter, MoreVertical, Eye, Ban, CheckCircle } from 'lucide-react'

interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: string
  _count: {
    videos: number
    services: number
    subscriptions: number
  }
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    try {
      const res = await fetch('/api/admin/customers')
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers)
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">Manage customer accounts</p>
        </div>
        <div className="text-sm text-gray-500">
          Total: {customers.length} customers
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{customer.phone || 'No phone'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{customer._count.videos} videos</span>
                      <span className="text-gray-500">{customer._count.services} services</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-500">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setSelectedCustomer(customer)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        title="Activate"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Suspend"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No customers found</p>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal 
          customer={selectedCustomer} 
          onClose={() => setSelectedCustomer(null)} 
        />
      )}
    </div>
  )
}

function CustomerDetailModal({ 
  customer, 
  onClose 
}: { 
  customer: Customer
  onClose: () => void 
}) {
  const [customerDetails, setCustomerDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/admin/customers/${customer.id}`)
        if (res.ok) {
          const data = await res.json()
          setCustomerDetails(data)
        }
      } catch (error) {
        console.error('Failed to fetch customer details:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [customer.id])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Customer Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-2xl text-blue-600 font-bold">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold">{customer.name}</h3>
                <p className="text-gray-500">{customer.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Videos</p>
                <p className="text-2xl font-bold">{customer._count.videos}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Services</p>
                <p className="text-2xl font-bold">{customer._count.services}</p>
              </div>
            </div>

            {customerDetails?.business && (
              <div>
                <h4 className="font-semibold mb-2">Business Info</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p><strong>Name:</strong> {customerDetails.business.name || 'Not set'}</p>
                  <p><strong>Industry:</strong> {customerDetails.business.industry || 'Not set'}</p>
                  <p><strong>Website:</strong> {customerDetails.business.website || 'Not set'}</p>
                </div>
              </div>
            )}

            {customerDetails?.subscriptions?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Active Subscription</h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="font-medium capitalize">{customerDetails.subscriptions[0].plan} Plan</p>
                  <p className="text-sm text-gray-600">৳{customerDetails.subscriptions[0].price}/month</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Next billing: {new Date(customerDetails.subscriptions[0].nextBillingDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}