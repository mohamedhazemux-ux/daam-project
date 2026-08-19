// src/constants/shipping.ts
export interface ShippingCarrier {
  id: string
  nameAr: string
  nameEn: string
  trackingPrefix: string
}

export const SHIPPING_CARRIERS: ShippingCarrier[] = [
  { id: 'aramex', nameAr: 'أرامكس (Aramex)', nameEn: 'Aramex', trackingPrefix: 'ARM' },
  { id: 'smsa', nameAr: 'سمسا إكسبريس (SMSA Express)', nameEn: 'SMSA Express', trackingPrefix: 'SMSA' },
  { id: 'dhl', nameAr: 'دي إتش إل (DHL Express)', nameEn: 'DHL Express', trackingPrefix: 'DHL' },
  { id: 'fedex', nameAr: 'فيديكس (FedEx)', nameEn: 'FedEx', trackingPrefix: 'FDX' },
  { id: 'spl', nameAr: 'سبل - البريد السعودي (SPL)', nameEn: 'SPL (Saudi Post)', trackingPrefix: 'SPL' },
  { id: 'naqel', nameAr: 'ناقل إكسبريس (Naqel)', nameEn: 'Naqel Express', trackingPrefix: 'NQL' },
  { id: 'redbox', nameAr: 'ريد بوكس (RedBox)', nameEn: 'RedBox', trackingPrefix: 'RBX' },
  { id: 'jt', nameAr: 'جي آند تي إكسبريس (J&T Express)', nameEn: 'J&T Express', trackingPrefix: 'JT' },
]

export const DEFAULT_CARRIER = SHIPPING_CARRIERS[0]
