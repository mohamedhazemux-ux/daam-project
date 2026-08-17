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
}

export function printShippingLabelPDF(data: ShippingLabelPrintData): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false

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
        .carrier { font-size: 18px; font-weight: 900; border: 2px solid #000; padding: 2px 8px; text-transform: uppercase; }
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
          <div class="carrier">أرامكس / Aramex</div>
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
