import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle, Loader2, Utensils, User, Building2, Share2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { cn } from '@/lib/utils';
import { generateInvoicePDF } from '@/services/pdfService';
import { motion } from 'motion/react';
import { getApiUrl } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface FormData {
  to: string;
  attn: string;
  name: string;
  contact: string;
  email: string;
  date: Date | undefined;
  time: string;
  location: string;
  quantity: number | '';
  meals: string[];
  menu: string;
  notes: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

const MEAL_DROPDOWN_OPTIONS = [
  { value: 'breakfast', labelEn: 'Breakfast', labelBm: 'Sarapan' },
  { value: 'lunch', labelEn: 'Lunch', labelBm: 'Makan Tengahari' },
  { value: 'tea_break', labelEn: 'High Tea', labelBm: 'Minum Petang' },
  { value: 'dinner', labelEn: 'Dinner', labelBm: 'Makan Malam' },
];

const SAVED_COMPANIES = [
  'Putrajaya Holdings Sdn Bhd, Block A, Suasana PjH, Lot 2C5, Jalan Tun Abdul Razak, Presint 2, 62100 Putrajaya',
  'Putrajaya Holdings Sdn Bhd, Menara PjH, Precint 2, No. 2, Jalan Tun Abdul Razak, 62100 Putrajaya',
  'Putrajaya Management Sdn. Bhd (PMSB)',
  'Putrajaya Homes Sdn Bhd',
  'Gas District Cooling (Putrajaya) Sdn Bhd',
  'KLCC (Holdings) Sdn Bhd',
  'KLCC (Holdings) Sdn Bhd, Group Procurement, Level 34, Menara Dayabumi, Jalan Sultan Hishamuddin, Kuala Lumpur',
  'KLCC (Holdings) Sdn Bhd, Group Financial Services (GFS), Level 9, Menara Permata Sapura, Kuala Lumpur City Centre',
  'KLCC Property Holdings Sdn Bhd, Level 33 & 34, Menara Dayabumi, Jalan Sultan Hishamuddin, Kuala Lumpur',
  'KLCC Projects Services Sdn Bhd, Level 32, Kompleks Dayabumi, Jalan Sultan Hishamuddin, Kuala Lumpur',
  'KLCC Projeks Sdn Bhd, Level 4, Menara PjH, No 2 Jalan Tun Razak, Presint 2, 62100 Putrajaya',
];

export default function OrderForm() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [confirmEmail, setConfirmEmail] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: 'Restoran Wawasan Booking Form',
      text: 'Sila isi borang tempahan katering Restoran Wawasan di sini / Please fill in the Restoran Wawasan catering booking form here:',
      url: window.location.origin + window.location.pathname,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.warn('Share cancelled or failed:', err);
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.origin + window.location.pathname);
    setCopied(true);
    toast({
      title: t('link_copied'),
      description: t('link_copied_desc'),
      variant: 'success',
      duration: 3000
    });
    setTimeout(() => setCopied(false), 2000);
  };
  
  const [formData, setFormData] = useState<FormData>({
    to: '',
    attn: '',
    name: '',
    contact: '',
    email: '',
    date: undefined,
    time: '12:00',
    location: '',
    quantity: '',
    meals: ['breakfast'],
    menu: 'Set box Makanan & Minuman',
    notes: '',
  });

  const handleInputChange = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Deep validation of required fields to give a premium, animated toast warning feedback
    if (!formData.to) {
      const errMsg = t('select_company');
      setSubmitError(errMsg);
      toast({
        title: t('missing_details'),
        description: errMsg,
        variant: 'warning'
      });
      return;
    }

    if (!formData.menu) {
      const errMsg = t('enter_preferred_menu');
      setSubmitError(errMsg);
      toast({
        title: t('preferred_menu'),
        description: errMsg,
        variant: 'warning'
      });
      return;
    }

    if (formData.quantity === '' || formData.quantity <= 0) {
      const errMsg = t('invalid_quantity');
      setSubmitError(errMsg);
      toast({
        title: t('invalid_quantity'),
        description: errMsg,
        variant: 'warning'
      });
      return;
    }

    if (!formData.date) {
      const errMsg = t('select_event_date');
      setSubmitError(errMsg);
      toast({
        title: t('select_event_date'),
        description: errMsg,
        variant: 'warning'
      });
      return;
    }

    if (formData.meals.length === 0) {
      const errMsg = t('meal_for');
      setSubmitError(errMsg);
      toast({
        title: t('meal_for'),
        description: errMsg,
        variant: 'warning'
      });
      return;
    }

    if (!formData.location || formData.location.trim() === '') {
      const errMsg = t('venue_address');
      setSubmitError(errMsg);
      toast({
        title: t('missing_location'),
        description: errMsg,
        variant: 'warning'
      });
      return;
    }

    if (!formData.name || formData.name.trim() === '') {
      const errMsg = t('pic_name_required');
      setSubmitError(errMsg);
      toast({
        title: t('pic_name_required'),
        description: errMsg,
        variant: 'warning'
      });
      return;
    }

    if (!formData.contact || formData.contact.trim() === '') {
      const errMsg = t('contact_required');
      setSubmitError(errMsg);
      toast({
        title: t('contact_required'),
        description: errMsg,
        variant: 'warning'
      });
      return;
    }

    if (!formData.email || formData.email.trim() === '') {
      const errMsg = t('email_required');
      setSubmitError(errMsg);
      toast({
        title: t('email_required'),
        description: errMsg,
        variant: 'warning'
      });
      return;
    }

    if (formData.email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      const errMsg = t('email_mismatch');
      setSubmitError(errMsg);
      toast({
        title: t('email_mismatch_title'),
        description: errMsg,
        variant: 'warning'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedDateStr = format(formData.date, 'yyyy-MM-dd');
      
      // Map initial prices of all selected meals to 0
      const initialPrices: Record<string, number> = {};
      formData.meals.forEach(meal => {
        initialPrices[meal] = 0;
      });

      const orderData = {
        to: formData.to,
        attn: formData.attn,
        name: formData.name,
        contact: formData.contact,
        email: formData.email,
        date: formattedDateStr,
        time: formData.time,
        location: formData.location,
        quantity: Number(formData.quantity),
        meals: formData.meals,
        menu: formData.menu,
        notes: formData.notes,
        dateTime: new Date(`${formattedDateStr}T${formData.time || '12:00'}`).toISOString(),
        lang: language,
        status: 'pending',
        createdAt: serverTimestamp(),
        prices: initialPrices,
        totalAmount: 0,
      };

      let docRefId = '';
      try {
        const response = await fetch(getApiUrl('/api/orders'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        });
        if (!response.ok) {
          throw new Error(`Server submission failed with status code ${response.status}: ${response.statusText || 'No Status Text'}`);
        }
        const resData = await response.json();
        docRefId = resData.id;
      } catch (err) {
        console.warn('Backend order submission failed, falling back to direct Firestore write:', err);
        const fetchErrStr = err instanceof Error ? err.message : String(err);
        try {
          const docRef = await addDoc(collection(db, 'orders'), orderData);
          docRefId = docRef.id;
        } catch (dbErr) {
          const combinedErrorMessage = `Backend submission failed (${fetchErrStr}) and Firestore fallback failed (${dbErr instanceof Error ? dbErr.message : String(dbErr)})`;
          const customDbErr = new Error(combinedErrorMessage);
          handleFirestoreError(customDbErr, OperationType.WRITE, 'orders');
          return;
        }
      }
      
      console.log('Order submitted with ID:', docRefId);
      
      // Auto-respond with Preliminary Invoice
      try {
        setEmailStatus('sending');
        const invoiceNo = `RW${docRefId.substring(0, 6).toUpperCase()}-PRE`;
        
        // Construct the full order object expected by generateInvoicePDF
        const pdfData = {
          ...orderData,
          id: docRefId,
          invoiceNo,
          dateTime: orderData.dateTime,
        };
        
        // Generate PDF using existing logic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfDoc = generateInvoicePDF(pdfData as any, false, language);
        
        // Download PDF on the client-side directly
        pdfDoc.save(`Invois_Wawasan_${docRefId}.pdf`);

        const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];
        
        // Send it via our Express backend
        const response = await fetch(getApiUrl('/api/send-invoice'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: orderData.email,
            name: orderData.name,
            invoiceNo: invoiceNo,
            pdfBase64: pdfBase64,
            isFinal: false,
            lang: language,
            orderDetails: orderData
          })
        });
        
        if (!response.ok) {
          console.warn('Failed to send auto-response email. Ensure SMTP is configured in the backend (.env).');
          setEmailStatus('failed');
          toast({
            title: t('error'),
            description: t('email_failed').replace('{email}', orderData.email),
            variant: 'warning',
            duration: 6000
          });
        } else {
          console.log('Auto-response email sent to customer!');
          setEmailStatus('success');
          toast({
            title: t('invoice_emailed'),
            description: t('email_sent_to').replace('{email}', orderData.email),
            variant: 'success',
            duration: 5000
          });
        }
      } catch (emailError) {
        console.error('Error sending auto-response email:', emailError);
        setEmailStatus('failed');
        toast({
          title: t('error'),
          description: t('email_failed').replace('{email}', formData.email),
          variant: 'error'
        });
      }
      
      setIsSuccess(true);
      toast({
        title: t('order_submitted_title'),
        description: t('order_submitted_desc'),
        variant: 'success',
        duration: 5000
      });
    } catch (error) {
      console.error('Error submitting order:', error);
      let errorDetail = '';
      if (error instanceof Error) {
        errorDetail = error.message;
        // If the error message is a stringified JSON Firestore error, extract the nested error message
        try {
          if (errorDetail.startsWith('{') && errorDetail.endsWith('}')) {
            const parsed = JSON.parse(errorDetail);
            if (parsed && parsed.error) {
              errorDetail = parsed.error;
            }
          }
        } catch {
          // Fallback to raw error message
        }
      } else {
        errorDetail = String(error);
      }
      
      const errMsg = `${t('order_error')}: ${errorDetail}`;
      setSubmitError(errMsg);
      toast({
        title: t('error'),
        description: errMsg,
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setIsSuccess(false);
    setEmailStatus('idle');
    setConfirmEmail('');
    setSelectedCompany('');
    setFormData({
      to: '',
      attn: '',
      name: '',
      contact: '',
      email: '',
      date: undefined,
      time: '12:00',
      location: '',
      quantity: '',
      meals: ['breakfast'],
      menu: 'Set box Makanan & Minuman',
      notes: '',
    });
  };

  if (isSuccess) {
    return (
      <div className="py-12 text-center max-w-lg mx-auto bg-white p-8 rounded-2xl border border-charcoal/10 shadow-sm">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-display font-bold text-charcoal mb-2">
          {t('success')}!
        </h3>
        <p className="text-charcoal/70 mb-6 font-medium">
          {t('order_success')}
        </p>
        
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-left space-y-3">
          <p className="text-xs text-charcoal/40 font-bold uppercase tracking-wider">
            {t('invoice_status')}
          </p>
          <div className="text-sm text-charcoal/80 space-y-2">
            <p className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                {t('pdf_generated')}
              </span>
            </p>
            
            {emailStatus === 'sending' && (
              <p className="flex items-start gap-2 text-charcoal/60 animate-pulse">
                <span className="text-warm-gold font-bold">●</span>
                <span>
                  {t('sending_email')}
                </span>
              </p>
            )}

            {emailStatus === 'success' && (
              <p className="flex items-start gap-2 text-slate-700">
                <span className="text-green-600 font-bold">✓</span>
                <span>
                  {t('email_sent_to').replace('{email}', formData.email)}
                </span>
              </p>
            )}

            {emailStatus === 'failed' && (
              <p className="flex items-start gap-2 text-red-600">
                <span className="text-red-500 font-bold">⚠️</span>
                <span>
                  {t('email_failed').replace('{email}', formData.email)}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={handleResetForm}
            className="px-6 py-2.5 bg-warm-gold hover:bg-warm-gold/90 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            {t('create_another')}
          </button>

          <button
            onClick={handleShare}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-charcoal rounded-xl font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600 animate-bounce" />
                <span>{t('link_copied')}</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-[#A67C1E]" />
                <span>{t('share_link')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form Fields - Left Column */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-charcoal/10 shadow-sm space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Customer Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-charcoal/10 pb-2">
                <Building2 className="w-5 h-5 text-warm-gold" />
                <h3 className="text-lg font-semibold text-charcoal">
                  {t('billing_info')}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-select" className="text-charcoal/80">
                    {t('to')} <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="company-select"
                    value={selectedCompany}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCompany(val);
                      if (val === 'other') {
                        handleInputChange('to', '');
                      } else {
                        handleInputChange('to', val);
                      }
                    }}
                    required
                    className="w-full h-11 rounded-md border border-charcoal/20 bg-white px-3 py-2 text-base text-slate-900 focus:border-warm-gold focus:outline-none focus:ring-2 focus:ring-warm-gold/20 shadow-sm font-sans"
                  >
                    <option value="" className="text-slate-900 bg-white">-- {t('select_company')} --</option>
                    {SAVED_COMPANIES.map((company, idx) => (
                      <option key={idx} value={company} className="text-slate-900 bg-white">
                        {company}
                      </option>
                    ))}
                    <option value="other" className="text-slate-900 bg-white">{t('other_company')}</option>
                  </select>

                  {selectedCompany === 'other' && (
                    <Input
                      id="to"
                      value={formData.to}
                      onChange={(e) => handleInputChange('to', e.target.value)}
                      placeholder={t('specify_company')}
                      required
                      className="mt-2 border-charcoal/20 bg-white text-slate-900 placeholder:text-slate-400 focus:border-warm-gold focus:ring-warm-gold/20 animate-fade-in font-sans"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attn" className="text-charcoal/80">
                    {t('attn')} <span className="text-charcoal/40">({t('optional')})</span>
                  </Label>
                  <Input
                    id="attn"
                    value={formData.attn}
                    onChange={(e) => handleInputChange('attn', e.target.value)}
                    placeholder={t('dept_attn')}
                    className="border-charcoal/20 bg-white text-slate-900 placeholder:text-slate-400 focus:border-warm-gold focus:ring-warm-gold/20 font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Event Details Section */}
            <div className="space-y-4 pt-4 border-t border-charcoal/10">
              <div className="flex items-center gap-2 border-b border-charcoal/10 pb-2">
                <Utensils className="w-5 h-5 text-warm-gold" />
                <h3 className="text-lg font-semibold text-charcoal">
                  {t('event_details')}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="menu-custom-input" className="text-charcoal/80">
                    {t('preferred_menu')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="menu-custom-input"
                    value={formData.menu}
                    onChange={(e) => handleInputChange('menu', e.target.value)}
                    required
                    className="border-charcoal/20 bg-white text-slate-900 placeholder:text-slate-400 focus:border-warm-gold focus:ring-warm-gold/20 font-sans"
                    placeholder={t('enter_preferred_menu')}
                  />
                  <p className="text-[11px] text-charcoal/50 leading-relaxed italic">
                    {t('menu_hint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-charcoal/80">
                    {t('quantity')} (Pax) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleInputChange('quantity', val === '' ? '' : Math.max(1, parseInt(val) || 0));
                    }}
                    required
                    placeholder={t('quantity_placeholder')}
                    className="border-charcoal/20 bg-white text-slate-900 placeholder:text-slate-400 focus:border-warm-gold focus:ring-warm-gold/20 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-charcoal/80">
                    {t('datetime')} <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className={cn(
                            "flex-1 h-11 justify-start text-left font-normal border-charcoal/20 bg-white text-slate-900 hover:bg-cream/50",
                            !formData.date && "text-slate-400"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-warm-gold" />
                          {formData.date ? format(formData.date, 'PPP') : t('pick_a_date')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => handleInputChange('date', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => handleInputChange('time', e.target.value)}
                      className="w-32 h-11 border-charcoal/20 bg-white text-slate-900 focus:border-warm-gold focus:ring-warm-gold/20 font-sans"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-charcoal/80">
                    {t('meal_for')} <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {MEAL_DROPDOWN_OPTIONS.map((mealOpt) => {
                      const isSelected = formData.meals.includes(mealOpt.value);
                      return (
                        <button
                          key={mealOpt.value}
                          type="button"
                          onClick={() => {
                            const currentMeals = [...formData.meals];
                            if (currentMeals.includes(mealOpt.value)) {
                              handleInputChange('meals', currentMeals.filter(m => m !== mealOpt.value));
                            } else {
                              handleInputChange('meals', [...currentMeals, mealOpt.value]);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer h-11",
                            isSelected 
                              ? "border-warm-gold bg-warm-gold/5 text-slate-900 font-medium ring-1 ring-warm-gold/30" 
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0",
                            isSelected 
                              ? "border-warm-gold bg-warm-gold text-white" 
                              : "border-slate-300 bg-white"
                          )}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="text-xs font-sans truncate">
                            {t(mealOpt.value)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-charcoal/80">
                  {t('location')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder={t('venue_address')}
                  required
                  className="border-charcoal/20 bg-white text-slate-900 placeholder:text-slate-400 focus:border-warm-gold focus:ring-warm-gold/20 font-sans"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-charcoal/80">
                  {t('notes')} <span className="text-charcoal/40">({t('optional')})</span>
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder={t('special_reqs')}
                  rows={3}
                  className="border-charcoal/20 bg-white text-slate-900 placeholder:text-slate-400 focus:border-warm-gold focus:ring-warm-gold/20 font-sans resize-none"
                />
              </div>
            </div>

            {/* Customer Contact Details (Moved to the bottom) */}
            <div className="space-y-4 pt-4 border-t border-charcoal/10">
              <div className="flex items-center gap-2 border-b border-charcoal/10 pb-2">
                <User className="w-5 h-5 text-warm-gold" />
                <h3 className="text-lg font-semibold text-charcoal">
                  {t('contact_person')}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-charcoal/80">
                    {t('pic_label')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={t('full_name')}
                    required
                    className="border-charcoal/20 bg-white text-slate-900 placeholder:text-slate-400 focus:border-warm-gold focus:ring-warm-gold/20 font-sans"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact" className="text-charcoal/80">
                    {t('contact')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contact"
                    type="tel"
                    value={formData.contact}
                    onChange={(e) => handleInputChange('contact', e.target.value)}
                    placeholder="+60 XX-XXXX XXXX"
                    required
                    className="border-charcoal/20 bg-white text-slate-900 placeholder:text-slate-400 focus:border-warm-gold focus:ring-warm-gold/20 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-charcoal/80">
                    {t('email')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="border-charcoal/20 bg-white text-slate-900 placeholder:text-slate-400 focus:border-warm-gold focus:ring-warm-gold/20 font-sans"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmEmail" className="text-charcoal/80">
                    {t('confirm_email')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirmEmail"
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="border-charcoal/20 bg-white text-slate-900 placeholder:text-slate-400 focus:border-warm-gold focus:ring-warm-gold/20 font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-charcoal/10 space-y-4">
              {submitError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center font-medium animate-fade-in">
                  {submitError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-14 min-h-[56px] bg-warm-gold text-charcoal font-semibold text-base sm:text-lg hover:bg-[#E0BC74] active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('loading')}
                    </span>
                  ) : (
                    t('submit_order_download')
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleShare}
                  variant="outline"
                  className="h-14 min-h-[56px] px-5 border-2 border-warm-gold/30 hover:border-warm-gold hover:bg-warm-gold/5 text-charcoal font-semibold flex items-center justify-center gap-2 transition-all duration-300"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-green-600 animate-bounce" />
                      <span className="text-sm">{t('link_copied')}</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-5 h-5 text-[#A67C1E]" />
                      <span className="text-sm">{t('share_form')}</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-center text-xs text-charcoal/40 mt-4">
                {t('terms_agree')}
              </p>
            </div>
          </form>
        </div>

        {/* Live-Updating Invoice Preview - Right Column */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <div className="bg-slate-100 p-2 rounded-lg text-center text-xs text-slate-500 font-sans font-medium uppercase tracking-wider">
            {t('live_preview')}
          </div>
          
          <motion.div 
            layout
            className="bg-white border border-slate-200 shadow-xl rounded-lg p-6 sm:p-8 relative min-h-[1000px] flex flex-col justify-between font-sans text-xs text-[#1A1816]"
          >
            {/* PAGE 1 */}
            <div className="space-y-6">
              {/* Draft watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-3 pointer-events-none select-none">
                <span className="text-6xl font-black border-[12px] border-slate-900 p-6 rounded transform -rotate-12 tracking-widest">
                  {t('draft_preliminary')}
                </span>
              </div>

              {/* Header Section */}
              <div className="flex justify-between items-start">
                <div>
                  {/* Space for logo left blank for clean appearance */}
                  <h2 className="text-xl font-black text-[#A67C1E] tracking-tight">RESTORAN WAWASAN</h2>
                  <p className="text-[10px] text-slate-600 leading-tight">
                    Unit 3, Level B3, Menara PjH<br />
                    Jalan P2a, Presint 2, 62100 Putrajaya<br />
                    Est. 1996
                  </p>
                </div>
                <div className="text-right">
                  <h1 className="text-3xl font-black text-[#A67C1E] tracking-wider mb-1">INVOICE</h1>
                  <p className="text-[10px] text-[#1A1816]">
                    {t('date')}: {new Date().toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-MY')}
                  </p>
                </div>
              </div>

              {/* Cream Grid Boxes */}
              <div className="grid grid-cols-2 gap-3">
                {/* Invoice No */}
                <div className="bg-[#FAF7F0] border border-[#C2932D] p-2.5 rounded shadow-sm">
                  <span className="block text-[8px] font-black text-[#8C6510] uppercase mb-1">{t('invoice_no_label')}</span>
                  <span className="text-[10.5px] font-bold text-[#1A1816]">RW — PENDING</span>
                </div>

                {/* Event Date */}
                <div className="bg-[#FAF7F0] border border-[#C2932D] p-2.5 rounded shadow-sm">
                  <span className="block text-[8px] font-black text-[#8C6510] uppercase mb-1">{t('tarikh_acara')}</span>
                  <span className="text-[10.5px] font-bold text-[#1A1816]">
                    {formData.date ? format(formData.date, 'dd/MM/yyyy') : '—'}
                  </span>
                </div>
              </div>

              {/* Recipient Full Width Box */}
              <div className="bg-[#FAF7F0] border border-[#C2932D] p-2.5 rounded shadow-sm">
                <span className="block text-[8px] font-black text-[#8C6510] uppercase mb-1">{t('kepada')}</span>
                <span className="text-[10.5px] font-bold text-[#1A1816] break-words">
                  {formData.to || '—'} {formData.attn ? ` (Attn: ${formData.attn})` : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Event Location */}
                <div className="bg-[#FAF7F0] border border-[#C2932D] p-2.5 rounded shadow-sm">
                  <span className="block text-[8px] font-black text-[#8C6510] uppercase mb-1">{t('lokasi_acara')}</span>
                  <span className="text-[10.5px] font-bold text-[#1A1816] break-words">{formData.location || '—'}</span>
                </div>

                {/* Meal For */}
                <div className="bg-[#FAF7F0] border border-[#C2932D] p-2.5 rounded shadow-sm">
                  <span className="block text-[8px] font-black text-[#8C6510] uppercase mb-1">{t('jenis_hidangan')}</span>
                  <span className="text-[10.5px] font-bold text-[#1A1816]">
                    {formData.meals.length > 0 
                      ? formData.meals.map(m => t(m)).join(' / ')
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Quantity Full Width */}
              <div className="bg-[#FAF7F0] border border-[#C2932D] p-2 rounded shadow-sm">
                <span className="block text-[8px] font-black text-[#8C6510] uppercase mb-1">{t('bilangan_pax')}</span>
                <span className="text-[10.5px] font-bold text-[#1A1816]">{formData.quantity ? `${formData.quantity} PAX` : '—'}</span>
              </div>

              {/* Menu Section */}
              <div className="space-y-0.5">
                <div className="bg-[#A67C1E] text-white text-[8px] font-bold px-3 py-1 uppercase rounded-t tracking-wider">
                  MENU
                </div>
                <div className="bg-[#FAF7F0] border border-[#C2932D] p-3 rounded-b shadow-sm">
                  <span className="text-[10px] font-bold text-[#1A1816]">{formData.menu || 'Set box Makanan & Minuman'}</span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="space-y-0.5">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#604008] text-white">
                      <th className="p-2 text-left text-[8px] font-black uppercase tracking-wider">{t('meals')}</th>
                      <th className="p-2 text-center text-[8px] font-black uppercase tracking-wider w-28">{t('price_pax')}</th>
                      <th className="p-2 text-right text-[8px] font-black uppercase tracking-wider w-28">{t('amount_rm')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.meals.length === 0 ? (
                      <tr className="bg-[#FAF7F0] border border-[#C2932D]">
                        <td colSpan={3} className="p-4 text-center text-slate-400 italic text-xs">
                          {t('no_meals')}
                        </td>
                      </tr>
                    ) : (
                      formData.meals.map((mealVal) => {
                        return (
                          <tr key={mealVal} className="bg-[#FAF7F0] border border-[#C2932D]">
                            <td className="p-2 border-r border-[#C2932D] font-bold text-[10px] text-[#1A1816] uppercase">
                              {t(mealVal)}
                            </td>
                            <td className="p-2 border-r border-[#C2932D] text-center text-[10px] text-[#1A1816] font-medium italic">
                              {t('quote_pending')}
                            </td>
                            <td className="p-2 text-right text-[10px] font-bold text-[#1A1816] italic">
                              {t('pending')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                    {/* Grand Total Bar */}
                    <tr className="bg-[#604008] text-white">
                      <td colSpan={2} className="p-2 font-black text-[8px] uppercase tracking-wider">
                        {t('grand_total_preview')}
                      </td>
                      <td className="p-2 text-right font-black text-[9.5px]">
                        RM —
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Letter representation and disclaimers */}
              <div className="space-y-3.5">
                <div className="text-[10px] text-[#1A1816] font-bold italic">
                  RINGGIT MALAYSIA <span className="underline">____________________________________________________________________</span> SAHAJA
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="w-1 bg-[#A67C1E] h-8 shrink-0"></div>
                  <div className="text-[8.5px] text-[#1A1816] italic space-y-0.5 leading-snug">
                    <p>* Harga yang diberikan termasuk caj perkhidmatan & set pembungkusan biodegradable.</p>
                    <p>* The price given includes service charge & biodegradable packaging sets.</p>
                  </div>
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="bg-[#FAF7F0] border border-[#C2932D] p-3 rounded shadow-sm">
                <div className="text-[8.5px] font-black text-[#A67C1E] uppercase tracking-wider mb-2">
                  MAKLUMAT AKAUN BANK / BANK ACCOUNT DETAILS
                </div>
                <table className="w-full text-[9px] text-[#1A1816]">
                  <tbody>
                    <tr>
                      <td className="py-0.5 w-20 text-slate-500">Nama</td>
                      <td className="py-0.5 font-bold">RESTORAN WAWASAN</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 w-20 text-slate-500">Bank</td>
                      <td className="py-0.5 font-bold">BANK MUAMALAT</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 w-20 text-slate-500">No. Akaun</td>
                      <td className="py-0.5 font-bold">16010000-405710</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Page 1 Bottom Footer Line */}
              <div className="border-t border-[#C2932D] pt-2 text-center text-[8px] text-slate-500 font-medium">
                Restoran Wawasan | Unit 3, Level B3, Menara PjH, Putrajaya | Est. 1996
              </div>
            </div>

            {/* CUT LINE REPRESENTING PAGE BREAK */}
            <div className="my-8 border-t-2 border-dashed border-slate-300 relative">
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-100 px-3 py-1 rounded text-[8px] font-black text-slate-400 uppercase tracking-widest">
                PAGE BREAK / KERATAN DOKUMEN
              </span>
            </div>

            {/* PAGE 2 */}
            <div className="space-y-6">
              {/* Page 2 Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-black text-[#A67C1E] tracking-wider">RESTORAN WAWASAN — INVOICE</h3>
                  <p className="text-[8.5px] text-slate-500">Maklumat Pegawai Bertanggungjawab / Person in Charge Details</p>
                </div>
                <div className="text-right text-[8.5px] text-slate-600">
                  Invoice No: RW — PENDING
                </div>
              </div>

              {/* Person in Charge Box */}
              <div className="space-y-0.5">
                <div className="bg-[#A67C1E] text-white text-[8px] font-bold px-3 py-1 uppercase rounded-t tracking-wider">
                  PERSON IN CHARGE DETAILS
                </div>
                <div className="bg-[#FAF7F0] border border-[#C2932D] rounded-b shadow-sm overflow-hidden divide-y divide-[#C2932D]">
                  <div className="grid grid-cols-2 divide-x divide-[#C2932D]">
                    <div className="p-2.5">
                      <span className="block text-[7.5px] font-black text-[#8C6510] uppercase mb-0.5">NAMA / NAME</span>
                      <span className="text-[9.5px] font-bold text-[#1A1816]">{formData.name || '—'}</span>
                    </div>
                    <div className="p-2.5">
                      <span className="block text-[7.5px] font-black text-[#8C6510] uppercase mb-0.5">NO. TELEFON / CONTACT NUMBER</span>
                      <span className="text-[9.5px] font-bold text-[#1A1816]">{formData.contact || '—'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-[#C2932D]">
                    <div className="p-2.5">
                      <span className="block text-[7.5px] font-black text-[#8C6510] uppercase mb-0.5">E-MEL / EMAIL</span>
                      <span className="text-[9.5px] font-bold text-[#1A1816] break-all">{formData.email || '—'}</span>
                    </div>
                    <div className="p-2.5">
                      <span className="block text-[7.5px] font-black text-[#8C6510] uppercase mb-0.5">ATTN</span>
                      <span className="text-[9.5px] font-bold text-[#1A1816]">{formData.attn || '—'}</span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <span className="block text-[7.5px] font-black text-[#8C6510] uppercase mb-0.5">NOTA / NOTES</span>
                    <span className="text-[9px] text-[#1A1816] leading-relaxed block whitespace-pre-wrap">{formData.notes || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Signatures Row */}
              <div className="grid grid-cols-2 gap-10 pt-8 pb-4">
                <div className="space-y-12">
                  <div>
                    <span className="block text-[8px] font-black text-[#8C6510] uppercase mb-0.5">DISEDIAKAN OLEH / PREPARED BY</span>
                    <span className="text-[9px] font-medium text-slate-700">Restoran Wawasan</span>
                  </div>
                  <div className="border-b border-[#1A1816] w-full"></div>
                </div>
                {/* Empty right column since Received By was removed */}
                <div></div>
              </div>

              {/* Page 2 Bottom Footer */}
              <div className="border-t border-[#C2932D] pt-3 text-center space-y-0.5">
                <p className="text-[8px] font-bold text-[#1A1816]">
                  Terima kasih di atas kepercayaan anda | ON BEHALF OF RESTORAN WAWASAN
                </p>
                <p className="text-[7.5px] text-slate-400 italic">
                  * This file is computer generated — no company stamp required
                </p>
              </div>
            </div>

          </motion.div>
        </div>

      </div>
    </div>
  );
}
