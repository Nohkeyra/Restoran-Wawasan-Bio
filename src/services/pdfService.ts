import jsPDF from 'jspdf';
import { numberToWords } from './numberToWordsBM';

interface Order {
  to: string;
  attn?: string;
  name: string;
  contact: string;
  email: string;
  dateTime: string;
  location: string;
  quantity: number;
  meals: string[];
  menu?: string;
  notes?: string;
  prices?: Record<string, number>;
  totalAmount?: number;
  invoiceNo?: string;
  lang?: 'en' | 'bm';
}

// Map meal values to dual labels
const mealLabelsMap: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  tea_break: 'Tea Break',
  hi_tea: 'Hi-Tea',
};

const drawCreamBox = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  content: string,
  isBoldContent: boolean = true
) => {
  // 1. Fill background (light cream)
  doc.setFillColor(250, 247, 240);
  doc.rect(x, y, w, h, 'F');

  // 2. Draw gold/amber border
  doc.setDrawColor(194, 147, 45);
  doc.setLineWidth(0.35);
  doc.rect(x, y, w, h, 'S');

  // 3. Draw dual label (antique gold, uppercase, bold, very small)
  doc.setTextColor(140, 101, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(label, x + 4, y + 5);

  // 4. Draw content (charcoal, normal/bold)
  doc.setTextColor(26, 24, 22);
  doc.setFont('helvetica', isBoldContent ? 'bold' : 'normal');
  doc.setFontSize(9.5);

  const maxTextWidth = w - 8;
  const splitLines = doc.splitTextToSize(content || '', maxTextWidth);
  splitLines.forEach((line: string, idx: number) => {
    if (11 + (idx * 4.5) < h) {
      doc.text(line, x + 4, y + 11 + (idx * 4.5));
    }
  });
};

export const generateInvoicePDF = (order: Order, isFinal: boolean, lang: 'en' | 'bm' = 'bm'): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Color Palette Definitions (from the provided design)
  const cCreamBg = [250, 247, 240];
  const cGoldBorder = [194, 147, 45];
  const cHeaderGold = [166, 124, 30];
  const cDarkBrown = [96, 64, 8];
  const cCharcoal = [26, 24, 22];
  const cGrey = [148, 163, 184];

  // ==========================================
  // PAGE 1: PRIMARY INVOICE & ACCOUNTS
  // ==========================================

  // --- 1. HEADER SECTION ---
  // Space left for logo on left, but "Logo" text is removed
  // (Left blank for a clean corporate appearance)

  // Restoran details
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RESTORAN WAWASAN', 40, 20);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Unit 3, Level B3, Menara PjH', 40, 25);
  doc.text('Jalan P2a, Presint 2, 62100 Putrajaya', 40, 29);
  doc.text('Est. 1986', 40, 33);

  // Invoice Big Heading on right
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('INVOICE', 195, 24, { align: 'right' });

  // Tarikh / Date
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const formattedInvoiceDate = order.dateTime 
    ? new Date(order.dateTime).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-MY')
    : new Date().toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-MY');
  doc.text(`Tarikh / Date: ${formattedInvoiceDate}`, 195, 33, { align: 'right' });

  // --- 2. GRID INFO BOXES ---
  // Row 1: Invoice No & Event Date
  const invoiceNoVal = order.invoiceNo || 'PENDING';
  drawCreamBox(doc, 15, 42, 87, 15, 'INVOICE NO.', `RW — ${invoiceNoVal}`, true);
  
  const formattedEventDate = order.dateTime 
    ? new Date(order.dateTime).toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-MY')
    : '-';
  drawCreamBox(doc, 108, 42, 87, 15, 'TARIKH ACARA / EVENT DATE', formattedEventDate, true);

  // Row 2: Kepada / To (Full-Width)
  const recipientText = order.to + (order.attn ? ` (Attn: ${order.attn})` : '');
  drawCreamBox(doc, 15, 61, 180, 15, 'KEPADA / TO', recipientText, true);

  // Row 3: Event Location & Meal For
  drawCreamBox(doc, 15, 80, 87, 15, 'LOKASI ACARA / EVENT LOCATION', order.location, true);

  const mealForText = order.meals.map(m => mealLabelsMap[m] || m).join(' / ');
  drawCreamBox(doc, 108, 80, 87, 15, 'JENIS HIDANGAN / MEAL FOR', mealForText, true);

  // Row 4: Quantity (Full-Width)
  const qtyText = order.quantity ? `${order.quantity} PAX` : '-';
  drawCreamBox(doc, 15, 99, 180, 12, 'BILANGAN PAX / QUANTITY', qtyText, true);

  // --- 3. MENU BOX ---
  // Menu Header Bar
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, 115, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('MENU', 18, 120);

  // Menu Content Area
  doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
  doc.rect(15, 122, 180, 12, 'F');
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.35);
  doc.rect(15, 122, 180, 12, 'S');

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(order.menu || 'Set box Makanan & Minuman', 18, 129.5);

  // --- 4. MEAL ITEMS TABLE ---
  const tableStartY = 139;
  
  // Table Header Row
  doc.setFillColor(cDarkBrown[0], cDarkBrown[1], cDarkBrown[2]);
  doc.rect(15, tableStartY, 180, 7, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Jenis Hidangan', 18, tableStartY + 4.8);
  doc.text('Harga / Pax (RM)', 120, tableStartY + 4.8, { align: 'center' });
  doc.text('Jumlah (RM)', 192, tableStartY + 4.8, { align: 'right' });

  // Render Table Rows
  let currentY = tableStartY + 7;
  const rowHeight = 7.5;

  order.meals.forEach((meal) => {
    // Fill Cream background
    doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
    doc.rect(15, currentY, 180, rowHeight, 'F');

    // Draw borders
    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.35);
    doc.rect(15, currentY, 105, rowHeight, 'S'); // Col 1
    doc.rect(120, currentY, 35, rowHeight, 'S');  // Col 2
    doc.rect(155, currentY, 40, rowHeight, 'S');  // Col 3

    // Content
    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(mealLabelsMap[meal] || meal, 18, currentY + 4.8);

    doc.setFont('helvetica', 'normal');
    const hasPrice = isFinal && order.prices && order.prices[meal] !== undefined;
    const priceVal = hasPrice ? order.prices![meal] : 0;
    const subtotal = priceVal * order.quantity;

    if (isFinal) {
      doc.text(priceVal.toFixed(2), 137.5, currentY + 4.8, { align: 'center' });
      doc.text(subtotal.toFixed(2), 192, currentY + 4.8, { align: 'right' });
    } else {
      doc.setTextColor(cGrey[0], cGrey[1], cGrey[2]);
      doc.setFont('helvetica', 'italic');
      doc.text('-', 137.5, currentY + 4.8, { align: 'center' });
      doc.text('-', 192, currentY + 4.8, { align: 'right' });
    }

    currentY += rowHeight;
  });

  // Grand Total Row
  doc.setFillColor(cDarkBrown[0], cDarkBrown[1], cDarkBrown[2]);
  doc.rect(15, currentY, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('JUMLAH KESELURUHAN / GRAND TOTAL', 18, currentY + 4.8);

  if (isFinal && order.totalAmount) {
    doc.text(`RM ${order.totalAmount.toFixed(2)}`, 192, currentY + 4.8, { align: 'right' });
  } else {
    doc.text('RM —', 192, currentY + 4.8, { align: 'right' });
  }
  currentY += 7;

  // --- 5. SPELLING & TERM FOOTER (Replaced large Total Amount box with just the written words in bold) ---
  const textNoteY = currentY + 7;
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8.5);

  if (isFinal && order.totalAmount) {
    const spelledWords = numberToWords(order.totalAmount, 'bm').toUpperCase();
    doc.text(`RINGGIT MALAYSIA ${spelledWords} SAHAJA`, 15, textNoteY);
  } else {
    doc.text('RINGGIT MALAYSIA ____________________________________________________________________ SAHAJA', 15, textNoteY);
  }

  // Orange vertical bar accent
  const disclaimerY = textNoteY + 4;
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, disclaimerY, 1, 7.5, 'F');

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('* Harga yang diberikan termasuk caj perkhidmatan & set pembungkusan biodegradable.', 18, disclaimerY + 3);
  doc.text('* The price given includes service charge & biodegradable packaging sets.', 18, disclaimerY + 6.5);

  // --- 6. BANK ACCOUNT DETAILS BOX ---
  const bankBoxY = disclaimerY + 11;
  doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
  doc.rect(15, bankBoxY, 180, 22, 'F');
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.35);
  doc.rect(15, bankBoxY, 180, 22, 'S');

  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('MAKLUMAT AKAUN BANK / BANK ACCOUNT DETAILS', 18, bankBoxY + 5);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Nama', 18, bankBoxY + 11);
  doc.text('Bank', 18, bankBoxY + 15);
  doc.text('No. Akaun', 18, bankBoxY + 19);

  doc.setFont('helvetica', 'bold');
  doc.text('RESTORAN WAWASAN', 42, bankBoxY + 11);
  doc.text('BANK MUAMALAT', 42, bankBoxY + 15);
  doc.text('16010000-405710', 42, bankBoxY + 19);

  // --- 8. PAGE 1 FOOTER LINE ---
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(15, 280, 195, 280);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Restoran Wawasan  |  Unit 3, Level B3, Menara PjH, Putrajaya  |  Est. 1986', 105, 285, { align: 'center' });


  // ==========================================
  // PAGE 2: PIC DETAILS & SIGNATURES
  // ==========================================
  doc.addPage();

  // --- 1. PAGE 2 HEADER ---
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RESTORAN WAWASAN — INVOICE', 15, 20);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Maklumat Pegawai Bertanggungjawab / Person in Charge Details', 15, 24.5);

  // Invoice Number reference on the right
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: RW — ${invoiceNoVal}`, 195, 22, { align: 'right' });

  // --- 2. PERSON IN CHARGE DETAILS TABLE/BOX ---
  const picHeaderY = 31;
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, picHeaderY, 180, 7.5, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PERSON IN CHARGE DETAILS', 18, picHeaderY + 5);

  const picBoxY = picHeaderY + 7.5;
  const picBoxHeight = 44;
  doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
  doc.rect(15, picBoxY, 180, picBoxHeight, 'F');
  
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.35);
  doc.rect(15, picBoxY, 180, picBoxHeight, 'S');

  // Internal grid division lines
  doc.line(105, picBoxY, 105, picBoxY + 30); // vertical split in center
  doc.line(15, picBoxY + 15, 195, picBoxY + 15); // horizontal line 1
  doc.line(15, picBoxY + 30, 195, picBoxY + 30); // horizontal line 2

  // Populate Grid Fields
  // Field 1: Nama / Name
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('NAMA / NAME', 18, picBoxY + 5.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(order.name || '-', 18, picBoxY + 10.5);

  // Field 2: No Telefon / Contact Number
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('NO. TELEFON / CONTACT NUMBER', 108, picBoxY + 5.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(order.contact || '-', 108, picBoxY + 10.5);

  // Field 3: E-mel / Email
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('E-MEL / EMAIL', 18, picBoxY + 20.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(order.email || '-', 18, picBoxY + 25.5);

  // Field 4: Attn
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ATTN', 108, picBoxY + 20.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(order.attn || '-', 108, picBoxY + 25.5);

  // Field 5: Nota / Notes (Full width)
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('NOTA / NOTES', 18, picBoxY + 35.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  
  const notesText = order.notes || '-';
  const splitNotes = doc.splitTextToSize(notesText, 174);
  doc.text(splitNotes, 18, picBoxY + 40);

  // --- 3. SIGNATURE SECTION ---
  const sigSectionY = picBoxY + picBoxHeight + 25;

  // Prepared By (Left)
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DISEDIAKAN OLEH / PREPARED BY', 15, sigSectionY);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Restoran Wawasan', 15, sigSectionY + 4.5);

  doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setLineWidth(0.4);
  doc.line(15, sigSectionY + 25, 80, sigSectionY + 25); // signature line

  // --- 4. PAGE 2 FOOTER LINE & TEXTS ---
  const footerLineY = sigSectionY + 42;
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(15, footerLineY, 195, footerLineY);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Terima kasih di atas kepercayaan anda  |  ON BEHALF OF RESTORAN WAWASAN', 105, footerLineY + 5, { align: 'center' });

  doc.setTextColor(cGrey[0], cGrey[1], cGrey[2]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('* This file is computer generated — no company stamp required', 105, footerLineY + 9, { align: 'center' });

  return doc;
};

export default generateInvoicePDF;
