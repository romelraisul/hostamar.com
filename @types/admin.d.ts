declare module '@/components/admin/OrdersSection' {
  import { type FC } from 'react'
  const component: FC<{ orders: any[] }>
  export default component
}
declare module '@/components/admin/PaymentsSection' {
  import { type FC } from 'react'
  const component: FC<{ payments: any[] }>
  export default component
}
declare module '@/components/admin/ServicesSection' {
  import { type FC } from 'react'
  const component: FC<{ services: any[] }>
  export default component
}
declare module '@/components/admin/SubscriptionsSection' {
  import { type FC } from 'react'
  const component: FC<{ subscriptions: any[] }>
  export default component
}
declare module '@/components/admin/AnalyticsSection' {
  import { type FC } from 'react'
  const component: FC<{ analytics: any }>
  export default component
}
declare module '@/components/admin/SettingsSection' {
  import { type FC } from 'react'
  const component: FC<Record<string, unknown>>
  export default component
}
