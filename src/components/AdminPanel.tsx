import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Timestamp } from 'firebase/firestore';
import { 
  LogOut, 
  FileText, 
  CheckCircle, 
  Trash2, 
  Eye,
  Loader2,
  FileDown,
  Search,
  Utensils,
  ArrowLeft,
  Send,
  Mail,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { generateInvoicePDF } from '@/services/pdfService';
import { numberToWords } from '@/services/numberToWordsBM';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getApiUrl } from '@/lib/api';

interface Order {
  id: string;
  to: string;
  attn: string;
  name: string;
  contact: string;
  email: string;
  dateTime: string;
  location: string;
  quantity: number;
  meals: string[];
  menu: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  prices: Record<string, number>;
  totalAmount: number;
  lang: 'en' | 'bm';
  createdAt: Timestamp;
  invoiceNo?: string;
}

interface SerializedOrder extends Omit<Order, 'createdAt'> {
  createdAt: { seconds: number; nanoseconds: number } | null;
}

const MEAL_LABELS: Record<string, { en: string; bm: string }> = {
  breakfast: { en: 'Breakfast', bm: 'Sarapan' },
  lunch: { en: 'Lunch', bm: 'Makan Tengahari' },
  dinner: { en: 'Dinner', bm: 'Makan Malam' },
  tea_break: { en: 'Tea Break', bm: 'Minum Petang' },
  hi_tea: { en: 'Hi-Tea', bm: 'Minum Petang (Hi-Tea)' },
};

export default function AdminPanel({ adminPassword }: { adminPassword?: string }) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // PDF Preview States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');

  // Send Invoice Dialog States
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [sendOrder, setSendOrder] = useState<Order | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: adminPassword || '',
          action: 'fetch'
        })
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const formattedOrders = result.orders.map((order: SerializedOrder) => ({
            ...order,
            createdAt: order.createdAt ? new Timestamp(order.createdAt.seconds, order.createdAt.nanoseconds) : null
          }));
          setOrders(formattedOrders);
        }
      } else {
        console.error('Failed to fetch orders from admin endpoint');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders on load
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminPassword]);

  const handleApprove = async (orderId: string) => {
    setIsApproving(true);
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Calculate total from prices
      const mealPrices: Record<string, number> = {};
      let total = 0;
      
      order.meals.forEach(meal => {
        const price = parseFloat(prices[meal] || '0');
        const roundedPrice = Math.round(price * 100) / 100;
        mealPrices[meal] = roundedPrice;
        total += roundedPrice * order.quantity;
      });

      total = Math.round(total * 100) / 100;

      const invoiceNo = order.invoiceNo || `RW${orderId.substring(0, 6).toUpperCase()}`;

      // Update meal prices and invoiceNo on the order document via secure admin endpoint
      const updateResponse = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: adminPassword || '',
          action: 'update',
          orderId,
          data: {
            prices: mealPrices,
            invoiceNo,
            approvedAt: new Date().toISOString(),
          }
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update order details on server');
      }

      // Generate and download PDF
      const pdfData = {
        ...order,
        prices: mealPrices,
        totalAmount: total,
        invoiceNo,
      };
      
      const pdfDoc = generateInvoicePDF(pdfData, true, order.lang);
      const fileName = `Invoice_${invoiceNo}.pdf`;
      
      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = pdfDoc.output('datauristring').split(',')[1];
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
          });
          await Share.share({
            title: fileName,
            url: savedFile.uri,
          });
        } catch (shareErr) {
          console.error('Error sharing PDF on mobile:', shareErr);
        }
      } else {
        pdfDoc.save(fileName);
      }
      
      // Extract as a Base64 string and POST it to backend endpoint (/api/submissions/bill)
      try {
        const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];
        
        const response = await fetch(getApiUrl('/api/submissions/bill'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            submissionId: orderId,
            totalAmount: total,
            pdfBase64: pdfBase64,
            fileName: fileName,
            collectionName: 'orders'
          })
        });
        
        if (!response.ok) {
          console.warn('Could not send email or update status via server. Have you configured SMTP in .env?');
        } else {
          console.log('Invoice email sent and document billed successfully via backend!');
        }
      } catch (err) {
        console.error('Error triggering billing and email API:', err);
      }

      setPrices({});
      setSelectedOrder(null);
      setIsDetailOpen(false);
      // Refresh the orders list to show updated status/invoice immediately
      fetchOrders();
      
      toast({
        title: t('success'),
        description: t('order_approved'),
        variant: 'success',
        duration: 5000
      });
    } catch (error) {
      console.error('Error approving order:', error);
      toast({
        title: t('error'),
        description: t('error_approving'),
        variant: 'error'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm(t('delete_order_confirm'))) return;
    
    try {
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: adminPassword || '',
          action: 'delete',
          orderId
        })
      });
      if (response.ok) {
        toast({
          title: t('success'),
          description: t('order_deleted'),
          variant: 'success'
        });
        fetchOrders();
      } else {
        throw new Error('Failed to delete order via Admin API');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: t('error'),
        description: 'Failed to delete order.',
        variant: 'error'
      });
    }
  };

  const handlePreviewPDF = async (order: Order, isFinal: boolean) => {
    try {
      let pdfData = order;
      let invoiceNo = order.invoiceNo;
      
      if (!isFinal) {
        invoiceNo = `RW${order.id.substring(0, 6).toUpperCase()}-PRE`;
        pdfData = { ...order, invoiceNo };
      }

      const pdfDoc = generateInvoicePDF(pdfData, isFinal, order.lang);
      const fileName = `${isFinal ? 'Invoice' : 'Preliminary'}_${invoiceNo}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = pdfDoc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });
        await Share.share({
          title: fileName,
          url: savedFile.uri,
        });
      } else {
        const pdfDataUri = pdfDoc.output('datauristring');
        setPreviewPdfUrl(pdfDataUri);
        setPreviewFileName(fileName);
        setIsPreviewOpen(true);
      }
    } catch (error: unknown) {
      console.error('Error in preview:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: t('error'),
        description: 'Preview Error: ' + errorMessage,
        variant: 'error'
      });
    }
  };

  const handleDownloadPDF = (order: Order, isFinal: boolean) => {
    setGeneratingInvoice(order.id);
    
    setTimeout(async () => {
      try {
        let pdfData = order;
        let invoiceNo = order.invoiceNo;
        
        if (!isFinal) {
          invoiceNo = `RW${order.id.substring(0, 6).toUpperCase()}-PRE`;
          pdfData = { ...order, invoiceNo };
        }

        const pdfDoc = generateInvoicePDF(pdfData, isFinal, order.lang);
        const fileName = `${isFinal ? 'Invoice' : 'Preliminary'}_${invoiceNo}.pdf`;

        if (Capacitor.isNativePlatform()) {
          const base64Data = pdfDoc.output('datauristring').split(',')[1];
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
          });
          await Share.share({
            title: fileName,
            url: savedFile.uri,
          });
        } else {
          pdfDoc.save(fileName);
        }
      } catch (error: unknown) {
        console.error('Error in download:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast({
          title: t('error'),
          description: 'Download Error: ' + errorMessage,
          variant: 'error'
        });
      } finally {
        setGeneratingInvoice(null);
      }
    }, 500);
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    if (order.status === 'approved' && order.prices) {
      const priceStrings = Object.keys(order.prices).reduce((acc, key) => {
        acc[key] = order.prices[key].toString();
        return acc;
      }, {} as Record<string, string>);
      setPrices(priceStrings);
    } else {
      setPrices({});
    }
    setIsDetailOpen(true);
  };

  const openSendDialog = (order: Order) => {
    setSendOrder(order);
    setRecipientEmail(order.email || '');
    setRecipientPhone(order.contact || '');
    setIsSendDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!sendOrder) return;
    setSendingEmail(true);

    try {
      const invoiceNo = sendOrder.invoiceNo || `RW${sendOrder.id.substring(0, 6).toUpperCase()}`;
      
      // Generate the PDF
      const pdfDoc = generateInvoicePDF(sendOrder, sendOrder.status === 'approved', sendOrder.lang);
      const pdfBase64 = pdfDoc.output('datauristring');

      const response = await fetch(getApiUrl('/api/send-invoice'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: recipientEmail,
          name: sendOrder.name,
          invoiceNo,
          pdfBase64,
          isFinal: sendOrder.status === 'approved',
          lang: sendOrder.lang
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email. Please verify SMTP is configured.');
      }

      toast({
        title: t('invoice_emailed'),
        description: t('invoice_emailed_desc').replace('{email}', recipientEmail),
        variant: 'success',
        duration: 4000
      });
      setIsSendDialogOpen(false);
    } catch (err: unknown) {
      console.error('Error sending invoice email:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast({
        title: t('sending_failed'),
        description: errorMessage || t('sending_failed_desc'),
        variant: 'error'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '60' + clean.slice(1);
    } else if (!clean.startsWith('6')) {
      clean = '60' + clean;
    }
    return clean;
  };

  const handleSendWhatsApp = () => {
    if (!sendOrder) return;

    const invoiceNo = sendOrder.invoiceNo || `RW${sendOrder.id.substring(0, 6).toUpperCase()}`;
    const total = sendOrder.totalAmount || sendOrder.meals.reduce((sum, meal) => {
      const price = sendOrder.prices?.[meal] || 0;
      return sum + (price * sendOrder.quantity);
    }, 0);
    
    const eventDate = sendOrder.dateTime ? format(new Date(sendOrder.dateTime), 'PP') : '-';
    const formattedPhone = formatPhoneForWhatsApp(recipientPhone);

    const msgEn = `Hello *${sendOrder.name}*,\n\nThis is Restoran Wawasan. 🍽️\n\nHere is the invoice for your catering booking:\n- No. Invoice: *${invoiceNo}*\n- Event Date: *${eventDate}*\n- Quantity: *${sendOrder.quantity} pax*\n- Preferred Menu: *${sendOrder.menu || '-'}*\n- Total Amount: *RM ${total.toFixed(2)}*\n\nPlease check your email (${recipientEmail}) for the official PDF invoice attachment. If you have any questions, feel free to contact us.\n\nThank you for choosing Restoran Wawasan!`;
    
    const msgBm = `Salam *${sendOrder.name}*,\n\nIni daripada Restoran Wawasan. 🍽️\n\nBerikut adalah invois untuk tempahan katering anda:\n- No. Invois: *${invoiceNo}*\n- Tarikh Majlis: *${eventDate}*\n- Kuantiti: *${sendOrder.quantity} pax*\n- Menu Pilihan: *${sendOrder.menu || '-'}*\n- Jumlah Keseluruhan: *RM ${total.toFixed(2)}*\n\nSila semak emel anda (${recipientEmail}) untuk lampiran rasmi PDF invois. Jika ada sebarang pertanyaan, sila hubungi kami.\n\nTerima kasih kerana memilih Restoran Wawasan!`;

    const messageText = sendOrder.lang === 'bm' ? msgBm : msgEn;
    const encodedText = encodeURIComponent(messageText);
    
    window.open(`https://wa.me/${formattedPhone}?text=${encodedText}`, '_blank');

    toast({
      title: t('whatsapp_opened'),
      description: t('whatsapp_opened_desc'),
      variant: 'success',
      duration: 5000
    });
    setIsSendDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'billed':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Billed</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{t('approved')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{t('rejected')}</Badge>;
      default:
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{t('pending')}</Badge>;
    }
  };

  const filteredOrders = orders.filter(order => 
    order.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="flex items-center gap-3 text-cream/60">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center justify-between px-6 md:px-12 bg-charcoal/95 backdrop-blur-xl border-b border-warm-gold/10">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <Utensils className="w-4 h-4 text-warm-gold" strokeWidth={2} />
            <div>
              <span className="font-display font-semibold text-xl text-cream leading-none">
                Wawasan
              </span>
              <span className="block font-body text-xs text-cream/60 leading-tight">
                Admin
              </span>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" className="text-cream hover:text-warm-gold hover:bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            className="text-cream/60 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => window.location.reload()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('logout')}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-[72px]">
        <div className="p-6 md:p-8">
          {/* Page Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-cream mb-2">
                {t('orders')}
              </h1>
              <p className="text-cream/50">
                {t('orders_subtitle')}
              </p>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Calendar Auto-Synced</span>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/40" />
            <Input
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-deep-brown border-warm-gold/20 text-cream placeholder:text-cream/30 focus:border-warm-gold/50"
            />
          </div>

          {/* Orders Table */}
          <div className="bg-deep-brown rounded-xl border border-warm-gold/10 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-warm-gold/10 hover:bg-transparent">
                    <TableHead className="text-cream/60">{t('invoice_no')}</TableHead>
                    <TableHead className="text-cream/60">{t('to')}</TableHead>
                    <TableHead className="text-cream/60">{t('date')}</TableHead>
                    <TableHead className="text-cream/60">{t('quantity')}</TableHead>
                    <TableHead className="text-cream/60">{t('status')}</TableHead>
                    <TableHead className="text-cream/60 text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-cream/40 py-12">
                        {t('no_orders')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id} className="border-warm-gold/10 hover:bg-warm-gold/5">
                        <TableCell className="text-cream font-mono text-sm">
                          {order.invoiceNo || `RW${order.id.substring(0, 6).toUpperCase()}`}
                        </TableCell>
                        <TableCell className="text-cream">
                          <div className="font-medium">{order.to}</div>
                          <div className="text-sm text-cream/50">{order.name}</div>
                        </TableCell>
                        <TableCell className="text-cream/70">
                          {order.dateTime ? format(new Date(order.dateTime), 'PP') : '-'}
                        </TableCell>
                        <TableCell className="text-cream/70">
                          {order.quantity} pax
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t('view_edit_details')}
                              className="text-cream/60 hover:text-warm-gold hover:bg-warm-gold/10"
                              onClick={() => openOrderDetail(order)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t('preview_pdf')}
                              className="text-cream/60 hover:text-blue-400 hover:bg-blue-500/10"
                              onClick={() => handlePreviewPDF(order, order.status === 'approved')}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title={t('download_pdf')}
                              className="text-cream/60 hover:text-green-400 hover:bg-green-500/10"
                              onClick={() => handleDownloadPDF(order, order.status === 'approved')}
                              disabled={generatingInvoice === order.id}
                            >
                              {generatingInvoice === order.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <FileDown className="w-4 h-4" />
                              )}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t('send_pdf')}
                              className="text-cream/60 hover:text-warm-gold hover:bg-warm-gold/10"
                              onClick={() => openSendDialog(order)}
                            >
                              <Send className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title={t('delete_order')}
                              className="text-cream/60 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => handleDelete(order.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl bg-deep-brown border-warm-gold/20 text-cream max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              {t('order_details')}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-charcoal/50">
                <span className="text-cream/60">Status</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Customer Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-warm-gold">{t('customer_info')}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-cream/50">{t('to')}:</span>
                    <p className="text-cream">{selectedOrder.to}</p>
                  </div>
                  <div>
                    <span className="text-cream/50">{t('attn')}:</span>
                    <p className="text-cream">{selectedOrder.attn || '-'}</p>
                  </div>
                  <div>
                    <span className="text-cream/50">{t('name')}:</span>
                    <p className="text-cream">{selectedOrder.name}</p>
                  </div>
                  <div>
                    <span className="text-cream/50">{t('contact')}:</span>
                    <p className="text-cream">{selectedOrder.contact}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-cream/50">{t('email')}:</span>
                    <p className="text-cream">{selectedOrder.email}</p>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-warm-gold">{t('event_details')}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-cream/50">{t('datetime')}:</span>
                    <p className="text-cream">
                      {selectedOrder.dateTime 
                        ? format(new Date(selectedOrder.dateTime), 'PPp')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-cream/50">{t('quantity')}:</span>
                    <p className="text-cream">{selectedOrder.quantity} pax</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-cream/50">{t('location')}:</span>
                    <p className="text-cream">{selectedOrder.location}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-cream/50">{t('meals')}:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedOrder.meals.map((meal) => (
                        <Badge 
                          key={meal} 
                          variant="outline" 
                          className="border-warm-gold/30 text-cream"
                        >
                          {MEAL_LABELS[meal]?.[selectedOrder.lang] || meal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {selectedOrder.menu && (
                    <div className="col-span-2">
                      <span className="text-cream/50">{t('menu')}:</span>
                      <p className="text-cream mt-1">{selectedOrder.menu}</p>
                    </div>
                  )}
                  {selectedOrder.notes && (
                    <div className="col-span-2">
                      <span className="text-cream/50">{t('notes')}:</span>
                      <p className="text-cream mt-1">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Section */}
              <div className="space-y-4 pt-4 border-t border-warm-gold/10">
                <h4 className="font-semibold text-warm-gold">{t('price_pax')}</h4>
                <div className="space-y-3">
                  {selectedOrder.meals.map((meal) => (
                    <div key={meal} className="flex items-center gap-4">
                      <Label className="w-32 text-cream/70">
                        {MEAL_LABELS[meal]?.[selectedOrder.lang] || meal}
                      </Label>
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/50">RM</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={prices[meal] || ''}
                          onChange={(e) => setPrices(prev => ({ 
                            ...prev, 
                            [meal]: e.target.value 
                          }))}
                          className="pl-10 bg-charcoal/50 border-warm-gold/20 text-cream"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Preview */}
                <div className="p-4 bg-charcoal/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-cream/60">{t('grand_total')}:</span>
                    <span className="text-2xl font-bold text-warm-gold">
                      RM {selectedOrder.meals.reduce((total, meal) => {
                        const price = parseFloat(prices[meal] || '0');
                        return total + (price * selectedOrder.quantity);
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-cream/50 italic">
                    {numberToWords(selectedOrder.meals.reduce((total, meal) => {
                      const price = parseFloat(prices[meal] || '0');
                      return total + (price * selectedOrder.quantity);
                    }, 0), selectedOrder.lang)}
                  </p>
                </div>
              </div>

            </div>
          )}

          <DialogFooter className="gap-2 mt-6">
            <Button
              onClick={() => handleApprove(selectedOrder?.id || '')}
              disabled={isApproving || !selectedOrder || selectedOrder.meals.some(m => !prices[m] || parseFloat(prices[m]) <= 0)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              {selectedOrder?.status === 'approved' || selectedOrder?.status === 'billed' ? t('update_invoice') || 'Update Invoice' : t('approve')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDetailOpen(false)}
              className="border-warm-gold/30 text-cream hover:bg-warm-gold/10"
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invoice Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="max-w-md bg-deep-brown border-warm-gold/20 text-cream">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold text-warm-gold flex items-center gap-2">
              <Send className="w-5 h-5 text-warm-gold" />
              {t('send_invoice_pdf')}
            </DialogTitle>
          </DialogHeader>

          {sendOrder && (
            <div className="space-y-6 py-4">
              {/* Summary Box */}
              <div className="p-4 bg-charcoal/50 rounded-xl border border-warm-gold/10 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-cream/50">{t('invoice_no_label')}</span>
                  <span className="font-mono font-medium text-cream">
                    {sendOrder.invoiceNo || `RW${sendOrder.id.substring(0, 6).toUpperCase()}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cream/50">{t('customer_label')}</span>
                  <span className="font-medium text-cream">{sendOrder.to}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cream/50">{t('grand_total_label')}</span>
                  <span className="font-bold text-warm-gold">
                    RM {(sendOrder.totalAmount || sendOrder.meals.reduce((sum, meal) => {
                      const price = sendOrder.prices?.[meal] || 0;
                      return sum + (price * sendOrder.quantity);
                    }, 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-5">
                {/* Email Option */}
                <div className="p-4 rounded-xl border border-warm-gold/10 bg-charcoal/20 space-y-4">
                  <div className="flex items-center gap-2 font-semibold text-cream">
                    <Mail className="w-4 h-4 text-warm-gold" />
                    <span>{t('option_email')}</span>
                  </div>
                  <p className="text-xs text-cream/60">
                    {t('email_desc')}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="send-email-input" className="text-xs text-cream/50">
                      {t('recipient_email')}
                    </Label>
                    <Input
                      id="send-email-input"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="bg-charcoal/50 border-warm-gold/20 text-cream focus:border-warm-gold/50 h-10 text-sm"
                      placeholder="customer@email.com"
                    />
                  </div>
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !recipientEmail}
                    className="w-full bg-warm-gold text-charcoal font-semibold hover:bg-[#E0BC74] transition-all duration-200 h-10 text-sm"
                  >
                    {sendingEmail ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('sending')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 justify-center">
                        <Mail className="w-4 h-4" />
                        {t('send_invoice_email')}
                      </span>
                    )}
                  </Button>
                </div>

                {/* WhatsApp Option */}
                <div className="p-4 rounded-xl border border-warm-gold/10 bg-charcoal/20 space-y-4">
                  <div className="flex items-center gap-2 font-semibold text-cream">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span>{t('option_whatsapp')}</span>
                  </div>
                  <p className="text-xs text-cream/60">
                    {t('whatsapp_desc')}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="send-phone-input" className="text-xs text-cream/50">
                      {t('recipient_phone')}
                    </Label>
                    <Input
                      id="send-phone-input"
                      type="text"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="bg-charcoal/50 border-warm-gold/20 text-cream focus:border-warm-gold/50 h-10 text-sm"
                      placeholder="e.g. 0123456789"
                    />
                  </div>
                  <Button
                    onClick={handleSendWhatsApp}
                    disabled={!recipientPhone}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all duration-200 h-10 text-sm"
                  >
                    <span className="flex items-center gap-2 justify-center">
                      <MessageSquare className="w-4 h-4" />
                      {t('open_whatsapp')}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsSendDialogOpen(false)}
              className="border-warm-gold/30 text-cream hover:bg-warm-gold/10 w-full md:w-auto text-sm"
            >
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl w-[90vw] h-[85vh] bg-deep-brown border-warm-gold/20 text-cream flex flex-col p-6">
          <DialogHeader className="pb-2 border-b border-warm-gold/10 flex-shrink-0">
            <DialogTitle className="text-xl font-display font-bold text-warm-gold">
              {previewFileName || 'PDF Preview'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 bg-charcoal/50 rounded-lg overflow-hidden relative my-4 border border-warm-gold/10">
            {previewPdfUrl ? (
              <iframe
                src={previewPdfUrl}
                title="PDF Preview Frame"
                className="w-full h-full border-0"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-cream/40">
                {t('loading') || 'Loading preview...'}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-warm-gold/10 justify-end flex-shrink-0">
            <Button
              onClick={() => {
                const link = document.createElement('a');
                link.href = previewPdfUrl;
                link.download = previewFileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="bg-warm-gold text-charcoal font-semibold hover:bg-[#E0BC74]"
            >
              <FileDown className="w-4 h-4 mr-2" />
              {t('download')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsPreviewOpen(false);
                setPreviewPdfUrl('');
              }}
              className="border-warm-gold/30 text-cream hover:bg-warm-gold/10"
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
