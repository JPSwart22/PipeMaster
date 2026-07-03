import { Capacitor } from '@capacitor/core'

const ENTITLEMENT_ID = 'pro'

let _initialized = false

export async function initPurchases(userId) {
  if (!Capacitor.isNativePlatform()) return
  if (_initialized) return
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    await Purchases.configure({
      apiKey: import.meta.env.VITE_REVENUECAT_ANDROID_KEY,
      appUserID: userId,
    })
    _initialized = true
  } catch (e) {
    console.warn('RevenueCat init failed', e)
  }
}

export async function purchaseSubscription() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  const { offerings } = await Purchases.getOfferings()
  const pkg = offerings?.current?.availablePackages?.[0]
  if (!pkg) throw new Error('No subscription package available. Check Play Console product setup.')
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
  return _isEntitled(customerInfo)
}

export async function restoreSubscription() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  const { customerInfo } = await Purchases.restorePurchases()
  return _isEntitled(customerInfo)
}

export async function checkSubscription() {
  if (!Capacitor.isNativePlatform()) return true // always allow on web (dev/preview)
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    const { customerInfo } = await Purchases.getCustomerInfo()
    return _isEntitled(customerInfo)
  } catch {
    return null // null = couldn't verify (offline) — let caller decide
  }
}

function _isEntitled(customerInfo) {
  const active = customerInfo?.entitlements?.active
  return !!(active && active[ENTITLEMENT_ID])
}
