import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const navy = '#0B2A4A';
const gold = '#C9A227';
const text = '#172033';
const muted = '#5D6B7A';
const border = '#D8DEE8';
const light = '#F6F8FB';
const white = '#FFFFFF';

const pageWidth = 612;
const pageHeight = 792;

const snapshotFields = [
  ['borrowerName', 'Borrower Name'],
  ['coBorrowerName', 'Co-Borrower Name'],
  ['propertyAddress', 'Property Address'],
  ['loanNumber', 'Loan Number'],
  ['loanType', 'Loan Type'],
  ['program', 'Program'],
  ['transactionType', 'Purchase or Refinance'],
  ['closingDate', 'Closing Date'],
  ['lockExpiration', 'Lock Expiration'],
  ['referralPartner', 'Referral Partner'],
  ['buyerAgent', 'Buyer Agent'],
  ['listingAgent', 'Listing Agent'],
  ['processor', 'Processor'],
  ['loa', 'LOA'],
];

const riskFields = [
  ['creditRisk', 'Credit Risk'],
  ['incomeRisk', 'Income Risk'],
  ['assetRisk', 'Asset Risk'],
  ['propertyRisk', 'Property Risk'],
];

const narrativeFields = [
  ['whyLoanWorks', 'Why this loan works'],
  ['underwritingQuestions', 'What underwriting may question'],
  ['addressingQuestions', 'How we are addressing it'],
];

const noteFields = [
  ['brianNotes', 'Brian Notes'],
  ['angieNotes', 'Angie Notes'],
  ['veronicaNotes', 'Veronica Notes'],
];

const riskColors = {
  Low: { fill: '#D9F2E3', stroke: '#35A267', text: '#146C43' },
  Medium: { fill: '#FFF0C7', stroke: '#D99A1B', text: '#8A5A00' },
  High: { fill: '#FFE1DE', stroke: '#D9483F', text: '#A42620' },
};

function color(hex) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function pdfY(yFromTop) {
  return pageHeight - yFromTop;
}

function valueOrDash(value) {
  return value && String(value).trim() ? String(value).trim() : '-';
}

function wrapText(value, font, size, maxWidth) {
  const source = valueOrDash(value);
  const lines = [];

  source.split('\n').forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let currentLine = '';

    if (!words.length) {
      lines.push('');
      return;
    }

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines;
}

function drawTopRect(page, x, y, width, height, fill, stroke) {
  page.drawRectangle({
    x,
    y: pdfY(y + height),
    width,
    height,
    color: color(fill),
    borderColor: stroke ? color(stroke) : undefined,
    borderWidth: stroke ? 1 : 0,
  });
}

function drawText(page, copy, x, y, options) {
  page.drawText(copy, {
    x,
    y: pdfY(y),
    ...options,
  });
}

function addFooter(page, fonts, pageNumber) {
  drawText(page, `McIntosh Team Loan Strategy Sheet | Page ${pageNumber}`, 36, 770, {
    font: fonts.regular,
    size: 8,
    color: color(muted),
  });
}

function addPageShell(pdfDoc) {
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  drawTopRect(page, 30, 32, 552, 712, light, border);
  return page;
}

function drawHeader(page, fonts, form) {
  drawTopRect(page, 0, 0, pageWidth, 82, navy);
  drawTopRect(page, 0, 78, pageWidth, 4, gold);

  drawText(page, 'McIntosh Team Loan Strategy Sheet', 36, 36, {
    font: fonts.bold,
    size: 20,
    color: color(white),
  });

  drawText(page, `Borrower: ${valueOrDash(form.borrowerName)}   Loan #: ${valueOrDash(form.loanNumber)}`, 36, 59, {
    font: fonts.regular,
    size: 9,
    color: color(white),
  });
}

function sectionTitle(page, fonts, title, y) {
  drawTopRect(page, 36, y, 540, 22, navy);
  drawText(page, title.toUpperCase(), 48, y + 15, {
    font: fonts.bold,
    size: 9,
    color: color(white),
  });
  return y + 34;
}

function drawTextBlock(page, fonts, label, content, x, y, width, maxLines = 4) {
  drawText(page, label, x, y, {
    font: fonts.bold,
    size: 8,
    color: color(muted),
  });

  const lines = wrapText(content, fonts.regular, 9, width).slice(0, maxLines);
  lines.forEach((line, index) => {
    drawText(page, line, x, y + 13 + index * 11, {
      font: fonts.regular,
      size: 9,
      color: color(text),
    });
  });

  return y + 14 + lines.length * 11;
}

function drawChip(page, fonts, label, rating, x, y) {
  const colors = riskColors[rating] || riskColors.Low;
  drawTopRect(page, x, y, 104, 24, colors.fill, colors.stroke);
  drawText(page, `${label}: ${rating}`, x + 10, y + 16, {
    font: fonts.bold,
    size: 8,
    color: color(colors.text),
  });
}

function drawSnapshot(page, fonts, form, y) {
  y = sectionTitle(page, fonts, 'File Snapshot', y);
  const colWidth = 255;
  const gap = 30;
  let leftY = y;
  let rightY = y;

  snapshotFields.forEach(([name, label], index) => {
    const isLeft = index % 2 === 0;
    const x = isLeft ? 42 : 42 + colWidth + gap;
    const currentY = isLeft ? leftY : rightY;
    const nextY = drawTextBlock(page, fonts, label, form[name], x, currentY, colWidth, name === 'propertyAddress' ? 2 : 1) + 2;

    if (isLeft) {
      leftY = nextY;
    } else {
      rightY = nextY;
    }
  });

  return Math.max(leftY, rightY) + 8;
}

function drawRisk(page, fonts, form, y) {
  y = sectionTitle(page, fonts, 'Risk Dashboard', y);
  riskFields.forEach(([name, label], index) => {
    drawChip(page, fonts, label, form[name], 42 + index * 132, y);
  });

  y += 42;
  return drawTextBlock(page, fonts, 'Biggest Risk to Closing', form.biggestRisk, 42, y, 520, 3) + 8;
}

function drawMissingItems(page, fonts, form, y) {
  y = sectionTitle(page, fonts, 'Missing Items', y);
  const selected = form.missingItems?.length ? form.missingItems.join(', ') : 'None selected';
  y = drawTextBlock(page, fonts, 'Checklist', selected, 42, y, 520, 3) + 4;
  return drawTextBlock(page, fonts, 'Other Missing Items', form.otherMissingItems, 42, y, 520, 3) + 8;
}

function drawNarrative(page, fonts, form, y) {
  y = sectionTitle(page, fonts, 'Submission Narrative', y);
  narrativeFields.forEach(([name, label]) => {
    y = drawTextBlock(page, fonts, label, form[name], 42, y, 520, 4) + 5;
  });
  return y + 3;
}

function drawNotes(page, fonts, form, y) {
  y = sectionTitle(page, fonts, 'Team Notes', y);
  noteFields.forEach(([name, label]) => {
    y = drawTextBlock(page, fonts, label, form[name], 42, y, 520, 3) + 5;
  });
  return y;
}

function downloadPdf(bytes) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'McIntosh-Team-Loan-Strategy-Sheet.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function generateLoanStrategyPdf(form) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('McIntosh Team Loan Strategy Sheet');
  pdfDoc.setSubject('Loan strategy summary');
  pdfDoc.setCreator('loan-strategy-sheet');

  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  let page = addPageShell(pdfDoc);
  let y = 106;
  let pageNumber = 1;

  drawHeader(page, fonts, form);

  const ensureSpace = (needed) => {
    if (y + needed <= 744) {
      return;
    }

    addFooter(page, fonts, pageNumber);
    page = addPageShell(pdfDoc);
    pageNumber += 1;
    y = 50;
  };

  y = drawSnapshot(page, fonts, form, y);

  ensureSpace(100);
  y = drawRisk(page, fonts, form, y);

  ensureSpace(104);
  y = drawMissingItems(page, fonts, form, y);

  ensureSpace(176);
  y = drawNarrative(page, fonts, form, y);

  ensureSpace(138);
  drawNotes(page, fonts, form, y);

  addFooter(page, fonts, pageNumber);
  downloadPdf(await pdfDoc.save());
}
