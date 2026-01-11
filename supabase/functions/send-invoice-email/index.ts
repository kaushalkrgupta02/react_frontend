import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceEmailRequest {
  type: 'bill' | 'receipt';
  recipientEmail: string;
  recipientName?: string;
  invoiceNumber: string;
  venueName: string;
  venueAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  discountAmount?: number;
  depositCredit?: number;
  totalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentMethod?: string;
  paidAt?: string;
  sessionDate: string;
  tableName?: string;
}

function generateBillHtml(data: InvoiceEmailRequest): string {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">IDR ${item.unitPrice.toLocaleString()}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">IDR ${item.total.toLocaleString()}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bill - ${data.invoiceNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 24px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px;">${data.venueName}</h1>
      ${data.venueAddress ? `<p style="margin: 0; opacity: 0.8; font-size: 14px;">${data.venueAddress}</p>` : ''}
    </div>
    
    <!-- Invoice Details -->
    <div style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
        <div>
          <p style="margin: 0; color: #666; font-size: 14px;">Bill To</p>
          <p style="margin: 4px 0 0 0; font-weight: 600;">${data.recipientName || 'Guest'}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; color: #666; font-size: 14px;">Invoice #</p>
          <p style="margin: 4px 0 0 0; font-weight: 600;">${data.invoiceNumber}</p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px; padding: 12px; background: #f9f9f9; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px;">
          <strong>Date:</strong> ${data.sessionDate}
          ${data.tableName ? ` | <strong>Table:</strong> ${data.tableName}` : ''}
        </p>
      </div>
      
      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="border-bottom: 2px solid #333;">
            <th style="padding: 12px 0; text-align: left;">Item</th>
            <th style="padding: 12px 0; text-align: center;">Qty</th>
            <th style="padding: 12px 0; text-align: right;">Price</th>
            <th style="padding: 12px 0; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <!-- Totals -->
      <div style="border-top: 2px solid #333; padding-top: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span>Subtotal</span>
          <span>IDR ${data.subtotal.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #666;">
          <span>Tax</span>
          <span>IDR ${data.taxAmount.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #666;">
          <span>Service Charge</span>
          <span>IDR ${data.serviceCharge.toLocaleString()}</span>
        </div>
        ${data.discountAmount && data.discountAmount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #10b981;">
          <span>Discount</span>
          <span>-IDR ${data.discountAmount.toLocaleString()}</span>
        </div>
        ` : ''}
        ${data.depositCredit && data.depositCredit > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #3b82f6;">
          <span>Deposit Credit</span>
          <span>-IDR ${data.depositCredit.toLocaleString()}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
          <span>Total</span>
          <span>IDR ${data.totalAmount.toLocaleString()}</span>
        </div>
        ${data.amountPaid && data.amountPaid > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-top: 8px; color: #666;">
          <span>Amount Paid</span>
          <span>-IDR ${data.amountPaid.toLocaleString()}</span>
        </div>
        ` : ''}
        ${data.balanceDue && data.balanceDue > 0 ? `
        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin-top: 8px; color: #dc2626;">
          <span>Balance Due</span>
          <span>IDR ${data.balanceDue.toLocaleString()}</span>
        </div>
        ` : ''}
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0; color: #666; font-size: 12px;">Thank you for dining with us!</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateReceiptHtml(data: InvoiceEmailRequest): string {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">IDR ${item.total.toLocaleString()}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${data.invoiceNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; text-align: center;">
      <div style="width: 48px; height: 48px; background: white; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
        <span style="color: #10b981; font-size: 24px;">✓</span>
      </div>
      <h1 style="margin: 0 0 4px 0; font-size: 24px;">Payment Received</h1>
      <p style="margin: 0; opacity: 0.9; font-size: 14px;">Thank you for your payment</p>
    </div>
    
    <!-- Receipt Details -->
    <div style="padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="margin: 0 0 4px 0;">${data.venueName}</h2>
        ${data.venueAddress ? `<p style="margin: 0; color: #666; font-size: 14px;">${data.venueAddress}</p>` : ''}
      </div>
      
      <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #666;">Receipt #</span>
          <span style="font-weight: 600;">${data.invoiceNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #666;">Date</span>
          <span>${data.sessionDate}</span>
        </div>
        ${data.tableName ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #666;">Table</span>
          <span>${data.tableName}</span>
        </div>
        ` : ''}
        ${data.paymentMethod ? `
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #666;">Payment Method</span>
          <span style="text-transform: capitalize;">${data.paymentMethod}</span>
        </div>
        ` : ''}
      </div>
      
      <!-- Items -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="border-bottom: 2px solid #333;">
            <th style="padding: 12px 0; text-align: left;">Item</th>
            <th style="padding: 12px 0; text-align: center;">Qty</th>
            <th style="padding: 12px 0; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <!-- Totals -->
      <div style="border-top: 2px solid #333; padding-top: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span>Subtotal</span>
          <span>IDR ${data.subtotal.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #666;">
          <span>Tax</span>
          <span>IDR ${data.taxAmount.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #666;">
          <span>Service Charge</span>
          <span>IDR ${data.serviceCharge.toLocaleString()}</span>
        </div>
        ${data.discountAmount && data.discountAmount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #10b981;">
          <span>Discount</span>
          <span>-IDR ${data.discountAmount.toLocaleString()}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
          <span>Total Paid</span>
          <span style="color: #10b981;">IDR ${data.totalAmount.toLocaleString()}</span>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Thank you for dining with us!</p>
      <p style="margin: 0; color: #999; font-size: 12px;">Keep this receipt for your records</p>
    </div>
  </div>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: InvoiceEmailRequest = await req.json();

    console.log('Sending invoice email:', {
      type: data.type,
      to: data.recipientEmail,
      invoice: data.invoiceNumber
    });

    // Get Resend API key - use dummy key if not set
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "re_dummy_key_update_in_admin";
    
    if (resendApiKey === "re_dummy_key_update_in_admin") {
      console.warn('Using dummy Resend API key - emails will not be sent. Configure RESEND_API_KEY in admin settings.');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service not configured. Please add Resend API key in admin settings.',
          needsConfiguration: true
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send email via Resend API directly
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${data.venueName} <onboarding@resend.dev>`,
        to: [data.recipientEmail],
        subject: data.type === 'receipt'
          ? `Payment Receipt - ${data.invoiceNumber} | ${data.venueName}`
          : `Your Bill - ${data.invoiceNumber} | ${data.venueName}`,
        html: data.type === 'receipt' ? generateReceiptHtml(data) : generateBillHtml(data),
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult);
      throw new Error(resendResult.message || 'Failed to send email');
    }

    console.log('Email sent successfully:', resendResult);

    return new Response(
      JSON.stringify({ success: true, emailId: resendResult.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
