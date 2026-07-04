/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

type Language = 'en' | 'bm';

interface Translation {
  [key: string]: {
    en: string;
    bm: string;
  };
}

// Comprehensive dictionary for Restoran Wawasan
const translations: Translation = {
  // Common
  submit: { en: 'Submit', bm: 'Hantar' },
  back: { en: 'Back', bm: 'Kembali' },
  contact_us: { en: 'Contact Us', bm: 'Hubungi Kami' },
  order_now: { en: 'Order Now', bm: 'Tempah Sekarang' },
  cancel: { en: 'Cancel', bm: 'Batal' },
  save: { en: 'Save', bm: 'Simpan' },
  edit: { en: 'Edit', bm: 'Sunting' },
  close: { en: 'Close', bm: 'Tutup' },
  loading: { en: 'Loading...', bm: 'Memuat...' },
  success: { en: 'Success', bm: 'Berjaya' },
  error: { en: 'Error', bm: 'Ralat' },
  
  // Navigation
  story: { en: 'Story', bm: 'Kisah' },
  menu: { en: 'Menu', bm: 'Menu' },
  experience: { en: 'Experience', bm: 'Pengalaman' },
  reviews: { en: 'Reviews', bm: 'Ulasan' },
  visit: { en: 'Visit', bm: 'Lawatan' },
  our_story: { en: 'Our Story', bm: 'Kisah Kami' },
  our_menu: { en: 'Our Menu', bm: 'Menu Kami' },
  visit_us: { en: 'Visit Us', bm: 'Layari Kami' },
  
  // Order Form
  catering_order: { en: 'Catering Order', bm: 'Tempahan Katering' },
  order_subtitle: { en: 'Fill in the details below to place your order.', bm: 'Isikan butiran di bawah untuk membuat tempahan.' },
  to: { en: 'To', bm: 'Kepada' },
  attn: { en: 'Attn', bm: 'U.P.' },
  name: { en: 'Name (PIC)', bm: 'Nama (PIC)' },
  contact: { en: 'Contact Number', bm: 'No. Telefon' },
  email: { en: 'Email', bm: 'Emel' },
  confirm_email: { en: 'Confirm Email', bm: 'Sahkan Emel' },
  email_mismatch: { en: 'Emails do not match.', bm: 'Alamat emel tidak sepadan.' },
  datetime: { en: 'Date & Time', bm: 'Tarikh & Masa' },
  location: { en: 'Event Location', bm: 'Lokasi Majlis' },
  quantity: { en: 'Quantity (Pax)', bm: 'Kuantiti (Pax)' },
  meals: { en: 'Meal Type', bm: 'Jenis Hidangan' },
  notes: { en: 'Notes', bm: 'Nota' },
  optional: { en: 'Optional', bm: 'Pilihan' },
  select_meal: { en: 'Select meal type', bm: 'Pilih jenis hidangan' },
  breakfast: { en: 'Breakfast', bm: 'Sarapan' },
  lunch: { en: 'Lunch', bm: 'Makan Tengahari' },
  dinner: { en: 'Dinner', bm: 'Makan Malam' },
  tea_break: { en: 'Tea Break', bm: 'Minum Petang' },
  order_success: { en: 'Order submitted successfully!', bm: 'Tempahan berjaya dihantar!' },
  order_error: { en: 'Failed to submit order. Please try again.', bm: 'Gagal menghantar tempahan. Sila cuba lagi.' },
  
  // Admin
  admin_login: { en: 'Admin Login', bm: 'Log Masuk Admin' },
  password: { en: 'Password', bm: 'Kata Laluan' },
  login: { en: 'Login', bm: 'Log Masuk' },
  wrong_password: { en: 'Wrong Password!', bm: 'Kata Laluan Salah!' },
  orders: { en: 'Orders', bm: 'Pesanan' },
  approve: { en: 'Approve', bm: 'Luluskan' },
  delete: { en: 'Delete', bm: 'Padam' },
  price_pax: { en: 'Price/Pax', bm: 'Harga/Pax' },
  grand_total: { en: 'Grand Total', bm: 'Jumlah Besar' },
  status: { en: 'Status', bm: 'Status' },
  pending: { en: 'Pending', bm: 'Menunggu' },
  approved: { en: 'Approved', bm: 'Diluluskan' },
  rejected: { en: 'Rejected', bm: 'Ditolak' },
  generate_invoice: { en: 'Generate Invoice', bm: 'Jana Invois' },
  invoice_generated: { en: 'Invoice Generated', bm: 'Invois Dijana' },
  no_orders: { en: 'No orders found', bm: 'Tiada pesanan dijumpai' },
  order_details: { en: 'Order Details', bm: 'Butiran Pesanan' },
  customer_info: { en: 'Customer Information', bm: 'Maklumat Pelanggan' },
  event_details: { en: 'Event Details', bm: 'Butiran Majlis' },
  
  // PDF/Invoice
  invoice_no: { en: 'Invoice No', bm: 'No. Invois' },
  date: { en: 'Date', bm: 'Tarikh' },
  meal_type: { en: 'Meal Type', bm: 'Jenis Hidangan' },
  price: { en: 'Price', bm: 'Harga' },
  amount: { en: 'Amount', bm: 'Jumlah' },
  subtotal: { en: 'Subtotal', bm: 'Jumlah Kecil' },
  total: { en: 'Total', bm: 'Jumlah' },
  ringgit_only: { en: 'Ringgit Malaysia Only', bm: 'Ringgit Malaysia Sahaja' },
  bank_info: { en: 'Bank Info', bm: 'Maklumat Bank' },
  bank_muamalat: { en: 'Bank Muamalat', bm: 'Bank Muamalat' },
  account_no: { en: 'Account No', bm: 'No. Akaun' },
  customer_signature: { en: 'Customer Signature', bm: 'Tandatangan Pelanggan' },
  restaurant_signature: { en: 'Restaurant Signature', bm: 'Tandatangan Restoran' },
  thank_you: { en: 'Thank You!', bm: 'Terima Kasih!' },
  preliminary_invoice: { en: 'Preliminary Invoice', bm: 'Invois Awal' },
  final_invoice: { en: 'Final Invoice', bm: 'Invois Muktamad' },
  
  // Menu Section
  signature_dishes: { en: 'Signature Dishes', bm: 'Hidangan Istimewa' },
  menu_subtitle: {
    en: 'From our legendary Asam Pedas to our famous Friday Rojak Singapore — each dish is crafted with fresh, locally sourced ingredients and decades of culinary expertise.',
    bm: 'Daripada Asam Pedas legenda kami kepada Rojak Singapore hari Jumaat yang terkenal — setiap hidangan disediakan dengan bahan-bahan tempatan yang segar dan kepakaran kulinari berdekad-dekad lamanya.'
  },
  
  // Story Section
  story_title: { en: 'A Legacy of Flavor Since 1986', bm: 'Warisan Rasa Sejak 1986' },
  story_p1: {
    en: 'Restoran Wawasan was first established in Singapore in 1986. For nearly four decades, we have been serving beloved dishes with diverse flavors spanning Thai, Indian, Chinese, Western, and authentic Malay cuisine.',
    bm: 'Restoran Wawasan mula ditubuhkan di Singapura pada tahun 1986. Selama hampir empat dekad, kami telah menyajikan hidangan kegemaran ramai dengan pelbagai cita rasa merangkumi masakan Thai, India, Cina, Barat dan masakan Melayu asli.'
  },
  story_p2: {
    en: 'By maintaining our core principles — cleanliness, excellent service, lasting taste, and affordable pricing — Restoran Wawasan has endured through the years, becoming a beloved destination for ministers, VIPs, artists, foreign tourists, civil servants, and families alike.',
    bm: 'Dengan mengekalkan prinsip teras kami — kebersihan, perkhidmatan cemerlang, rasa yang bertahan lama, dan harga yang berpatutan — Restoran Wawasan telah bertahan selama bertahun-tahun, menjadi destinasi kegemaran para menteri, VIP, artis, pelancong asing, penjawat awam, dan keluarga.'
  },
  story_p3: {
    en: 'Since relocating to Putrajaya under the Ministry of Federal Territories, our restaurant has welcomed diners from all walks of life who come specifically to savor our authentic, multi-flavor culinary experience.',
    bm: 'Sejak berpindah ke Putrajaya di bawah Kementerian Wilayah Persekutuan, restoran kami telah menyambut pelanggan dari segenap lapisan masyarakat yang datang khusus untuk menikmati pengalaman kulinari pelbagai rasa kami yang asli.'
  },
  explore_menu: { en: 'Explore Our Menu', bm: 'Terokai Menu Kami' },
  established: { en: 'Established', bm: 'Ditubuhkan' },
  years_service: { en: 'Years of Service', bm: 'Tahun Berkhidmat' },
  star_rating: { en: 'Star Rating', bm: 'Penarafan Bintang' },
  
  // Hero Section
  hero_title: { en: 'Restoran Wawasan', bm: 'Restoran Wawasan' },
  hero_subtitle: { en: 'Est. 1986', bm: 'Ditubuh 1986' },
  hero_tagline: { en: 'Heritage. Flavor. Legacy.', bm: 'Warisan. Rasa. Legasi.' },
  hero_description: { en: 'Experience authentic Malaysian cuisine crafted with passion and tradition since 1986.', bm: 'Nikmati masakan Malaysia autentik yang disediakan dengan minat dan tradisi sejak 1986.' },
  
  // Visit Section
  come_dine: { en: 'Come Dine With Us', bm: 'Mari Menjamu Selera' },
  visit_subtitle: { en: 'Located in the heart of Putrajaya with a stunning lake view', bm: 'Terletak di tengah-tengah Putrajaya dengan pemandangan tasik yang indah' },
  location_detail: { en: 'Basement level with outdoor seating overlooking Putrajaya Lake', bm: 'Aras bawah tanah dengan tempat duduk luar menghadap Tasik Putrajaya' },
  get_directions: { en: 'Get Directions', bm: 'Dapatkan Arah' },
  call_now: { en: 'Call Now', bm: 'Hubungi Sekarang' },
  cta_title: { en: 'Ready to taste our legendary dishes?', bm: 'Sedia untuk merasai hidangan legenda kami?' },
  cta_subtitle: { en: "Walk in or call ahead — we're ready to welcome you.", bm: 'Datang terus atau hubungi kami — kami sedia menyambut anda.' },
  contact_pak_usop: { en: 'Contact Pak Usop', bm: 'Hubungi Pak Usop' },
  
  // Footer
  address: { en: 'Address', bm: 'Alamat' },
  phone: { en: 'Phone', bm: 'Telefon' },
  hours: { en: 'Opening Hours', bm: 'Waktu Buka' },
  follow_us: { en: 'Follow Us', bm: 'Ikuti Kami' },
  all_rights_reserved: { en: 'All Rights Reserved', bm: 'Hak Cipta Terpelihara' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: keyof typeof translations): string => {
    return translations[key]?.[language] ?? String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
