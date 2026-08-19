// src/lib/pdf-utils.ts
export interface InvoicePrintData {
  reference: string
  period: string
  merchantName: string
  merchantEmail: string
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>
  subtotal: number
  tax: number
  total: number
  dueDate: string
  createdAt: string
  status: string
}

export interface PackingSlipPrintData {
  orderNumber: string
  customerName: string
  shippingAddress: string
  shippingMethod: string
  merchantName: string
  items: Array<{ name: string; sku?: string; quantity: number }>
  date: string
}

export function printInvoicePDF(data: InvoicePrintData): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>فاتورة ${data.reference}</title>
      <style>
        body { font-family: 'Cairo', sans-serif, system-ui; padding: 40px; color: #111; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: 900; }
        .badge { background: #f3f4f6; padding: 4px 12px; border-radius: 6px; font-weight: bold; }
        .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #e5e7eb; padding: 10px; text-align: right; }
        .table th { background-color: #f9fafb; font-weight: 800; }
        .totals { margin-top: 20px; text-align: left; }
        .totals div { margin-bottom: 5px; font-size: 14px; }
        .grand-total { font-size: 18px; font-weight: 900; color: #000; border-top: 2px solid #000; padding-top: 5px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">نظام دعم WMS — الفاتورة الشهرية</div>
          <p>المرجع: <b>${data.reference}</b></p>
        </div>
        <div>
          <span class="badge">حالة الفاتورة: ${data.status}</span>
        </div>
      </div>

      <div class="grid">
        <div>
          <h3>بيانات التاجر:</h3>
          <p><b>اسم التاجر:</b> ${data.merchantName}</p>
          <p><b>البريد الإلكتروني:</b> ${data.merchantEmail}</p>
        </div>
        <div style="text-align: left;" dir="ltr">
          <p><b>Date:</b> ${data.createdAt}</p>
          <p><b>Period:</b> ${data.period}</p>
          <p><b>Due Date:</b> ${data.dueDate}</p>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>الوصف / بند الخدمة</th>
            <th>الكمية</th>
            <th>سعر الوحدة</th>
            <th>المبلغ الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>${item.unitPrice.toFixed(2)} ر.س</td>
              <td>${item.total.toFixed(2)} ر.س</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals" dir="rtl">
        <div>المجموع الفرعي: <b>${data.subtotal.toFixed(2)} ر.س</b></div>
        <div>ضريبة القيمة المضافة (15%): <b>${data.tax.toFixed(2)} ر.س</b></div>
        <div class="grand-total">الإجمالي المستحق: ${data.total.toFixed(2)} ر.س</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}

export function printPackingSlipPDF(data: PackingSlipPrintData): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>قائمة التجميع — ${data.orderNumber}</title>
      <style>
        body { font-family: 'Cairo', sans-serif, system-ui; padding: 30px; color: #111; }
        .header { border-bottom: 2px dashed #ccc; padding-bottom: 15px; margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px 12px; text-align: right; }
        .table th { background: #f3f4f6; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>قائمة التجميع والتجهيز (Packing Slip)</h2>
        <p>رقم الطلب: <b>${data.orderNumber}</b> — التاريخ: ${data.date}</p>
        <p>التاجر: <b>${data.merchantName}</b></p>
      </div>

      <div>
        <h3>معلومات العميل والشحن:</h3>
        <p>العميل: ${data.customerName}</p>
        <p>عنوان الشحن: ${data.shippingAddress}</p>
        <p>طريقة الشحن: ${data.shippingMethod}</p>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>اسم المنتج</th>
            <th>الرمز المرجعي (SKU)</th>
            <th>الكمية المطلوبة</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.sku ?? '—'}</td>
              <td><b>${item.quantity}</b></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}

export interface ShippingLabelPrintData {
  orderNumber: string
  customerName: string
  shippingAddress: string
  merchantName: string
  trackingNumber: string
  date: string
  carrier?: string
}

export function printShippingLabelPDF(data: ShippingLabelPrintData): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false
  const carrierName = data.carrier || 'أرامكس / Aramex'

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>بوليصة شحن — ${data.orderNumber}</title>
      <style>
        body { font-family: 'Cairo', sans-serif, system-ui; padding: 20px; color: #111; display: flex; justify-content: center; }
        .label-container { width: 380px; border: 3px solid #000; padding: 15px; box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
        .logo { font-size: 16px; font-weight: 900; }
        .carrier { font-size: 15px; font-weight: 900; border: 2px solid #000; padding: 2px 8px; text-transform: uppercase; background: #f9fafb; }
        .section { border-bottom: 1px solid #000; padding: 8px 0; font-size: 12px; }
        .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #666; margin-bottom: 4px; }
        .barcode-container { display: flex; flex-direction: column; align-items: center; padding: 15px 0; border-bottom: 1px solid #000; }
        .barcode { height: 50px; width: 80%; background: repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 6px); }
        .tracking-num { font-size: 14px; font-weight: 900; margin-top: 5px; letter-spacing: 2px; }
        .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; padding-top: 8px; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="label-container">
        <div class="header">
          <div class="logo">المنصة الداعمة WMS</div>
          <div class="carrier">${carrierName}</div>
        </div>
        
        <div class="barcode-container">
          <div class="barcode"></div>
          <div class="tracking-num">${data.trackingNumber}</div>
        </div>

        <div class="section">
          <div class="section-title">المرسل (Sender):</div>
          <p style="margin: 0; font-weight: bold;">${data.merchantName}</p>
          <p style="margin: 3px 0 0 0; font-size: 11px;">مستودع المنصة الرئيسي — الرياض، المملكة العربية السعودية</p>
        </div>

        <div class="section">
          <div class="section-title">المرسل إليه (Receiver):</div>
          <p style="margin: 0; font-weight: bold;">${data.customerName}</p>
          <p style="margin: 3px 0 0 0; font-size: 11px;">${data.shippingAddress}</p>
        </div>

        <div class="meta-grid">
          <div>رقم الطلب: <b>${data.orderNumber}</b></div>
          <div style="text-align: left;">التاريخ: <b>${data.date}</b></div>
          <div>الوزن: <b>1.5 كجم</b></div>
          <div style="text-align: left;">الخدمة: <b>شحن محلي سريع</b></div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}

export interface MerchantDashboardPrintData {
  merchantName: string
  storeName: string
  date: string
  from?: string
  to?: string
  lang?: 'ar' | 'en'
  metrics: {
    storagePct: number
    storageUsed: number
    storageLimit: number
    storageUnit: string
    storageStatus: string
    totalProducts: number
    activeOrders: number
    completedOrders: number
    pendingReturns: number
    walletBalance: number
    lowStock: number
    outStock: number
    currentInvoiceAmount: number
    platformProducts: number
  }
  topProducts?: Array<{ label: string; value: number }>
  orderStatusDist?: Array<{ label: string; value: number }>
  stockByWarehouse?: Array<{ warehouse: string; available: number; reserved: number }>
}

export function printMerchantDashboardPDF(data: MerchantDashboardPrintData): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false

  const isAr = (data.lang ?? 'ar') === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'
  const currency = isAr ? 'ر.س' : 'SAR'

  const html = `
    <!DOCTYPE html>
    <html dir="${dir}" lang="${isAr ? 'ar' : 'en'}">
    <head>
      <meta charset="utf-8">
      <title>${isAr ? 'تقرير لوحة تحكم التاجر' : 'Merchant Dashboard Report'} — ${data.storeName}</title>
      <style>
        body { font-family: 'Cairo', 'Segoe UI', system-ui, sans-serif; padding: 30px; color: #111; line-height: 1.5; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
        .title { font-size: 22px; font-weight: 900; margin: 0; }
        .sub { font-size: 13px; color: #666; margin-top: 4px; }
        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; font-size: 12px; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .kpi-card { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; }
        .kpi-title { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
        .kpi-value { font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px; }
        
        .section-title { font-size: 15px; font-weight: 900; margin: 20px 0 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
        .table th, .table td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: ${isAr ? 'right' : 'left'}; }
        .table th { background: #f1f5f9; font-weight: 800; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #e2e8f0; }

        .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">${isAr ? 'تقرير الأداء ولوحة تحكم التاجر' : 'Merchant Performance & Dashboard Report'}</h1>
          <p class="sub">${isAr ? 'منصة دعم الرائدة للخدمات اللوجستية والتخزين' : 'Daam Leading Logistics & Fulfillment WMS Platform'}</p>
        </div>
        <div class="meta-box">
          <p style="margin: 0 0 4px 0;"><b>${isAr ? 'المتجر:' : 'Store:'}</b> ${data.storeName}</p>
          <p style="margin: 0 0 4px 0;"><b>${isAr ? 'التاجر:' : 'Merchant:'}</b> ${data.merchantName}</p>
          <p style="margin: 0;"><b>${isAr ? 'تاريخ التقرير:' : 'Date:'}</b> ${data.date}</p>
          ${data.from || data.to ? `<p style="margin: 4px 0 0 0; color: #3b82f6;"><b>${isAr ? 'الفترة:' : 'Range:'}</b> ${data.from || '—'} ${isAr ? 'إلى' : 'to'} ${data.to || '—'}</p>` : ''}
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-title">${isAr ? 'استخدام التخزين' : 'Storage Usage'}</div>
          <div class="kpi-value">${data.metrics.storagePct}%</div>
          <small style="font-size: 10px; color: #64748b;">${data.metrics.storageUsed} / ${data.metrics.storageLimit} ${data.metrics.storageUnit}</small>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">${isAr ? 'إجمالي المنتجات' : 'Total Products'}</div>
          <div class="kpi-value">${data.metrics.totalProducts}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">${isAr ? 'الطلبات النشطة' : 'Active Orders'}</div>
          <div class="kpi-value">${data.metrics.activeOrders}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">${isAr ? 'الطلبات المكتملة' : 'Completed Orders'}</div>
          <div class="kpi-value">${data.metrics.completedOrders}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">${isAr ? 'رصيد المحفظة' : 'Wallet Balance'}</div>
          <div class="kpi-value" style="color: #059669;">${data.metrics.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">${isAr ? 'مرتجعات معلقة' : 'Pending Returns'}</div>
          <div class="kpi-value" style="color: #d97706;">${data.metrics.pendingReturns}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">${isAr ? 'منخفض المخزون' : 'Low Stock Items'}</div>
          <div class="kpi-value" style="color: #dc2626;">${data.metrics.lowStock}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">${isAr ? 'فاتورة الشهر الحالي' : 'Current Month Invoice'}</div>
          <div class="kpi-value">${data.metrics.currentInvoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}</div>
        </div>
      </div>

      ${data.topProducts && data.topProducts.length > 0 ? `
        <h2 class="section-title">${isAr ? 'المنتجات الأكثر مبيعًا والنشاط التجاري' : 'Top Selling Products & Sales Activity'}</h2>
        <table class="table">
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>${isAr ? 'اسم المنتج' : 'Product Name'}</th>
              <th style="width: 140px; text-align: center;">${isAr ? 'عدد المبيعات / الطلبات' : 'Sales / Orders'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.topProducts.map((p, idx) => `
              <tr>
                <td style="text-align: center;"><b>${idx + 1}</b></td>
                <td><b>${p.label}</b></td>
                <td style="text-align: center; font-weight: bold;">${p.value}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${data.orderStatusDist && data.orderStatusDist.length > 0 ? `
        <h2 class="section-title">${isAr ? 'توزيع حالات الطلبات' : 'Order Status Distribution'}</h2>
        <table class="table">
          <thead>
            <tr>
              <th>${isAr ? 'الحالة' : 'Status'}</th>
              <th style="width: 140px; text-align: center;">${isAr ? 'عدد الطلبات' : 'Orders Count'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.orderStatusDist.map(s => `
              <tr>
                <td><span class="badge">${s.label}</span></td>
                <td style="text-align: center; font-weight: bold;">${s.value}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${data.stockByWarehouse && data.stockByWarehouse.length > 0 ? `
        <h2 class="section-title">${isAr ? 'المخزون حسب موقع المستودع' : 'Stock by Warehouse Location'}</h2>
        <table class="table">
          <thead>
            <tr>
              <th>${isAr ? 'المستودع' : 'Warehouse'}</th>
              <th style="text-align: center;">${isAr ? 'الكمية المتاحة' : 'Available Stock'}</th>
              <th style="text-align: center;">${isAr ? 'الكمية المحجوزة' : 'Reserved Stock'}</th>
              <th style="text-align: center;">${isAr ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.stockByWarehouse.map(w => `
              <tr>
                <td><b>${w.warehouse}</b></td>
                <td style="text-align: center; font-weight: bold; color: #059669;">${w.available}</td>
                <td style="text-align: center; font-weight: bold; color: #d97706;">${w.reserved}</td>
                <td style="text-align: center; font-weight: 900;">${w.available + w.reserved}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div class="footer">
        <div>${isAr ? 'تم توليد هذا التقرير آلياً عبر نظام إدارة المستودعات والعمليات' : 'Generated automatically via Daam WMS Portal'}</div>
        <div>${new Date().toLocaleString()}</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}

export interface GeneralReportPrintData {
  title: string
  subtitle?: string
  date: string
  period?: string
  lang?: 'ar' | 'en'
  metrics?: Array<{ label: string; value: string | number }>
  tableHeaders?: string[]
  tableRows?: Array<Array<string | number>>
}

export function printReportPDF(data: GeneralReportPrintData): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false

  const isAr = (data.lang ?? 'ar') === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'

  const html = `
    <!DOCTYPE html>
    <html dir="${dir}" lang="${isAr ? 'ar' : 'en'}">
    <head>
      <meta charset="utf-8">
      <title>${data.title}</title>
      <style>
        body { font-family: 'Cairo', 'Segoe UI', system-ui, sans-serif; padding: 30px; color: #111; line-height: 1.5; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
        .title { font-size: 22px; font-weight: 900; margin: 0; }
        .sub { font-size: 13px; color: #666; margin-top: 4px; }
        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; font-size: 12px; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .kpi-card { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; }
        .kpi-title { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
        .kpi-value { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px; }
        
        .table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
        .table th, .table td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: ${isAr ? 'right' : 'left'}; }
        .table th { background: #f1f5f9; font-weight: 800; }

        .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">${data.title}</h1>
          <p class="sub">${data.subtitle || (isAr ? 'منصة دعم الرائدة للخدمات اللوجستية والتخزين' : 'Daam Leading Logistics & Fulfillment Platform')}</p>
        </div>
        <div class="meta-box">
          <p style="margin: 0 0 4px 0;"><b>${isAr ? 'تاريخ التقرير:' : 'Report Date:'}</b> ${data.date}</p>
          ${data.period ? `<p style="margin: 0; color: #3b82f6;"><b>${isAr ? 'الفترة:' : 'Period:'}</b> ${data.period}</p>` : ''}
        </div>
      </div>

      ${data.metrics && data.metrics.length > 0 ? `
        <div class="kpi-grid">
          ${data.metrics.map(m => `
            <div class="kpi-card">
              <div class="kpi-title">${m.label}</div>
              <div class="kpi-value">${m.value}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${data.tableHeaders && data.tableRows ? `
        <table class="table">
          <thead>
            <tr>
              ${data.tableHeaders.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.tableRows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div class="footer">
        <div>${isAr ? 'تم توليد هذا التقرير آلياً عبر نظام إدارة المستودعات والعمليات' : 'Generated automatically via Daam WMS Portal'}</div>
        <div>${new Date().toLocaleString()}</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}


