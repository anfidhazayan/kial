import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
/**
 * Generate a beautiful PDF stats report from dashboard data
 */
export const generateDashboardPDF = (stats) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 0;


  // ── Professional Color Palette ──
  const colors = {
    primary: [15, 23, 42],        // slate-900 (Headers)
    textMain: [51, 65, 85],       // slate-700 (Body text)
    textMuted: [100, 116, 139],   // slate-500 (Labels/Muted)
    border: [226, 232, 240],      // slate-200 (Borders/Lines)
    bgLight: [248, 250, 252],     // slate-50 (Card backgrounds)
    emerald: [16, 185, 129],      // Success indicator
    amber: [245, 158, 11],        // Warning indicator
    red: [239, 68, 68],           // Danger indicator
    white: [255, 255, 255],
    black: [0, 0, 0]
  };

  // ── Helper Functions ──
  const setColor = (colorArr, type = 'fill') => {
    if (type === 'fill') doc.setFillColor(...colorArr);
    else if (type === 'text') doc.setTextColor(...colorArr);
    else if (type === 'draw') doc.setDrawColor(...colorArr);
  };

  const drawRoundedRect = (x, y, w, h, r, color) => {
    setColor(color, 'fill');
    doc.roundedRect(x, y, w, h, r, r, 'F');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // ── Calculate Metrics ──
  const totalCerts =
    (stats?.compliance?.expired || 0) +
    (stats?.compliance?.expiringSoon || 0) +
    (stats?.compliance?.valid || 0);
  const compliancePercent =
    totalCerts > 0
      ? Math.round(((stats?.compliance?.valid || 0) / totalCerts) * 100)
      : 0;
  const reportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const reportTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // ════════════════════════════════════════════════
  // PAGE 1: Cover + Stats
  // ════════════════════════════════════════════════

  // ── Header ──
  // Simple professional header line
  setColor(colors.primary, 'fill');
  doc.rect(margin, margin, pageWidth - margin * 2, 1, 'F');
  
  y = margin + 12;

  // Title
  doc.setFontSize(22);
  setColor(colors.primary, 'text');
  doc.text('KIAL Aviation Security', margin, y);

  doc.setFontSize(10);
  setColor(colors.textMuted, 'text');
  doc.text('Executive Compliance Overview', margin, y + 6);

  // Date on right
  doc.setFontSize(9);
  doc.text(`Report Date: ${reportDate}`, pageWidth - margin, y, { align: 'right' });
  doc.text(`Time: ${reportTime}`, pageWidth - margin, y + 6, { align: 'right' });

  y += 24;

  // ── Executive Summary ──
  doc.setFontSize(12);
  setColor(colors.primary, 'text');
  doc.text('1. System Overview', margin, y);
  
  setColor(colors.border, 'fill');
  doc.rect(margin, y + 3, pageWidth - margin * 2, 0.5, 'F');
  
  y += 12;

  // ── Standardized Minimalist Stats Row ──
  const cardWidth = (pageWidth - margin * 2 - 15) / 4;
  const cardHeight = 28;

  const statCards = [
    { label: 'Active Entities', value: String(stats?.totals?.entities || 0) },
    { label: 'Total Personnel', value: String(stats?.totals?.staff || 0) },
    { label: 'Issued Certificates', value: String(stats?.totals?.certificates || 0) },
    { label: 'Compliance Rate', value: `${compliancePercent}%` },
  ];

  statCards.forEach((card, i) => {
    const x = margin + i * (cardWidth + 5);

    // Subtle border
    setColor(colors.border, 'draw');
    doc.setLineWidth(0.3);
    doc.rect(x, y, cardWidth, cardHeight, 'D');

    // Value
    doc.setFontSize(18);
    setColor(colors.primary, 'text');
    doc.text(card.value, x + 5, y + 14);

    // Label
    doc.setFontSize(8);
    setColor(colors.textMuted, 'text');
    doc.text(card.label.toUpperCase(), x + 5, y + 22);
  });

  y += cardHeight + 16;

  // ── Certificate Health Section ──
  doc.setFontSize(12);
  setColor(colors.primary, 'text');
  doc.text('2. Compliance Breakdown', margin, y);
  
  setColor(colors.border, 'fill');
  doc.rect(margin, y + 3, pageWidth - margin * 2, 0.5, 'F');
  
  y += 10;

  // Compliance Breakdown Table
  const complianceData = [
    ['Valid (Compliant)', String(stats?.compliance?.valid || 0), `${compliancePercent}%`, 'Active'],
    ['Expiring Soon (< 30d)', String(stats?.compliance?.expiringSoon || 0), totalCerts > 0 ? `${Math.round(((stats?.compliance?.expiringSoon || 0) / totalCerts) * 100)}%` : '0%', 'Action Required'],
    ['Expired (Non-Compliant)', String(stats?.compliance?.expired || 0), totalCerts > 0 ? `${Math.round(((stats?.compliance?.expired || 0) / totalCerts) * 100)}%` : '0%', 'Critical'],
    ['Pending Reviews', String(stats?.pendingApprovals || 0), '-', 'Awaiting CSO'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Status Category', 'Volume', '% of Total', 'System State']],
    body: complianceData,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { font: 'helvetica' },
    headStyles: {
      fillColor: colors.bgLight,
      textColor: colors.textMuted,
      fontSize: 8,
      cellPadding: 4,
      lineWidth: { bottom: 0.5 },
      lineColor: colors.border
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
      textColor: colors.primary,
      lineWidth: { bottom: 0.1 },
      lineColor: colors.border
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'right', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 30 },
      3: { cellWidth: 'auto', halign: 'right' },
    },
    didParseCell: (data) => {
      // Add subtle status color indicators
      if (data.section === 'body' && data.column.index === 0) {
        if (data.row.index === 0) data.cell.styles.textColor = colors.textMain;
        if (data.row.index === 1) data.cell.styles.textColor = colors.amber;
        if (data.row.index === 2) data.cell.styles.textColor = colors.red;
        if (data.row.index === 3) data.cell.styles.textColor = colors.textMain;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 20;

  // ── Detailed Entity Deficiencies ──
  if (stats?.expiringEntities && stats.expiringEntities.length > 0) {
    // Check if we need a new page
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(12);
    setColor(colors.primary, 'text');
    doc.text('3. Entity Non-Compliance Analysis', margin, y);
    
    setColor(colors.border, 'fill');
    doc.rect(margin, y + 3, pageWidth - margin * 2, 0.5, 'F');
    
    y += 10;

    const entityIssueData = stats.expiringEntities.slice(0, 15).map(entity => {
      const issues = [...entity.expiredIssues, ...entity.expiringSoonIssues];
      return [
        entity.name,
        entity.category || 'N/A',
        `${issues.length} flagged certificate(s)`,
        issues.slice(0, 2).join(', ') + (issues.length > 2 ? '...' : '')
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Entity Name', 'Category', 'Volume', 'Primary Deficiencies']],
      body: entityIssueData,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: { font: 'helvetica' },
      headStyles: {
        fillColor: colors.bgLight,
        textColor: colors.textMuted,
        fontSize: 8,
        cellPadding: 4,
        lineWidth: { bottom: 0.5 },
        lineColor: colors.border
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 4,
        textColor: colors.primary,
        lineWidth: { bottom: 0.1 },
        lineColor: colors.border
      }
    });
    
    y = doc.lastAutoTable.finalY + 20;
  }

  // ── Recent Activity Section ──
  if (stats?.recentActivities && stats.recentActivities.length > 0) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }
  
    doc.setFontSize(12);
    setColor(colors.primary, 'text');
    doc.text('4. Recent Audit Log (Top 8)', margin, y);
    
    setColor(colors.border, 'fill');
    doc.rect(margin, y + 3, pageWidth - margin * 2, 0.5, 'F');
    
    y += 10;

    const activityData = stats.recentActivities.slice(0, 8).map((activity) => [
      formatDate(activity.timestamp),
      activity.user?.fullName || 'System',
      activity.action || 'N/A'
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Timestamp', 'Authorized User', 'Action Taken']],
      body: activityData,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: { font: 'helvetica' },
      headStyles: {
        fillColor: colors.bgLight,
        textColor: colors.textMuted,
        fontSize: 8,
        cellPadding: 4,
        lineWidth: { bottom: 0.5 },
        lineColor: colors.border
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 4,
        textColor: colors.textMain,
        lineWidth: { bottom: 0.1 },
        lineColor: colors.border
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 50 },
        2: { cellWidth: 'auto' },
      }
    });
  }

  // ── Professional Footer (on all pages) ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 15;
    
    // Top border line for footer
    setColor(colors.border, 'fill');
    doc.rect(margin, footerY - 5, pageWidth - margin * 2, 0.5, 'F');

    doc.setFontSize(7);
    setColor(colors.textMuted, 'text');
    doc.text(
      'KIAL Aviation Security Data Management System — Confidential',
      margin,
      footerY + 2
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      footerY + 2,
      { align: 'right' }
    );
  }

  // ── Save ──
  doc.save(`KIAL_Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Trigger file download from blob response
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Generate a beautiful PDF stats report from entity dashboard data
 */
export const generateEntityDashboardPDF = (dashboard, totals) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 0;


  // ── Professional Color Palette ──
  const colors = {
    primary: [15, 23, 42],        // slate-900 (Headers)
    textMain: [51, 65, 85],       // slate-700 (Body text)
    textMuted: [100, 116, 139],   // slate-500 (Labels/Muted)
    border: [226, 232, 240],      // slate-200 (Borders/Lines)
    bgLight: [248, 250, 252],     // slate-50 (Card backgrounds)
    emerald: [16, 185, 129],      // Success indicator
    amber: [245, 158, 11],        // Warning indicator
    red: [239, 68, 68],           // Danger indicator
    white: [255, 255, 255],
    black: [0, 0, 0]
  };

  // ── Helper Functions ──
  const setColor = (colorArr, type = 'fill') => {
    if (type === 'fill') doc.setFillColor(...colorArr);
    else if (type === 'text') doc.setTextColor(...colorArr);
    else if (type === 'draw') doc.setDrawColor(...colorArr);
  };

  const drawRoundedRect = (x, y, w, h, r, color) => {
    setColor(color, 'fill');
    doc.roundedRect(x, y, w, h, r, r, 'F');
  };

  // ── Calculate Metrics ──
  const entityName = dashboard?.entity?.name || 'Entity';
  const entityCategory = dashboard?.entity?.category || 'N/A';
  const compliancePercent =
    totals.total > 0
      ? Math.round((totals.valid / totals.total) * 100)
      : 0;
  const reportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const reportTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // ════════════════════════════════════════════════
  // PAGE 1: Cover + Stats
  // ════════════════════════════════════════════════

  // ── Header ──
  // Simple professional header line
  setColor(colors.primary, 'fill');
  doc.rect(margin, margin, pageWidth - margin * 2, 1, 'F');
  
  y = margin + 12;

  // Title
  doc.setFontSize(22);
  setColor(colors.primary, 'text');
  doc.text(`${entityName}`, margin, y);

  doc.setFontSize(10);
  setColor(colors.textMuted, 'text');
  doc.text(`Entity Compliance Report — ${entityCategory}`, margin, y + 6);

  // Date on right
  doc.setFontSize(9);
  doc.text(`Report Date: ${reportDate}`, pageWidth - margin, y, { align: 'right' });
  doc.text(`Time: ${reportTime}`, pageWidth - margin, y + 6, { align: 'right' });

  y += 24;

  // ── Executive Summary ──
  doc.setFontSize(12);
  setColor(colors.primary, 'text');
  doc.text('1. Entity Overview', margin, y);
  
  setColor(colors.border, 'fill');
  doc.rect(margin, y + 3, pageWidth - margin * 2, 0.5, 'F');
  
  y += 12;

  // ── Standardized Minimalist Stats Row ──
  const cardWidth = (pageWidth - margin * 2 - 15) / 4;
  const cardHeight = 28;

  const statCards = [
    { label: 'Total Personnel', value: String(totals.totalStaff || 0) },
    { label: 'Total Certificates', value: String(totals.total || 0) },
    { label: 'Valid / Active', value: String(totals.valid || 0) },
    { label: 'Compliance Rate', value: `${compliancePercent}%` },
  ];

  statCards.forEach((card, i) => {
    const x = margin + i * (cardWidth + 5);

    // Subtle border
    setColor(colors.border, 'draw');
    doc.setLineWidth(0.3);
    doc.rect(x, y, cardWidth, cardHeight, 'D');

    // Value
    doc.setFontSize(18);
    setColor(colors.primary, 'text');
    doc.text(card.value, x + 5, y + 14);

    // Label
    doc.setFontSize(8);
    setColor(colors.textMuted, 'text');
    doc.text(card.label.toUpperCase(), x + 5, y + 22);
  });

  y += cardHeight + 16;

  // ── Certificate Health Section ──
  doc.setFontSize(12);
  setColor(colors.primary, 'text');
  doc.text('2. Compliance Breakdown', margin, y);
  
  setColor(colors.border, 'fill');
  doc.rect(margin, y + 3, pageWidth - margin * 2, 0.5, 'F');
  
  y += 10;

  // Compliance Breakdown Table
  const complianceData = [
    ['Valid (Compliant)', String(totals.valid || 0), `${compliancePercent}%`, 'Active'],
    ['Expiring Soon (< 30d)', String(totals.expiringSoon || 0), totals.total > 0 ? `${Math.round(((totals.expiringSoon || 0) / totals.total) * 100)}%` : '0%', 'Action Required'],
    ['Expired (Non-Compliant)', String(totals.expired || 0), totals.total > 0 ? `${Math.round(((totals.expired || 0) / totals.total) * 100)}%` : '0%', 'Critical'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Status Category', 'Volume', '% of Total', 'System State']],
    body: complianceData,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { font: 'helvetica' },
    headStyles: {
      fillColor: colors.bgLight,
      textColor: colors.textMuted,
      fontSize: 8,
      cellPadding: 4,
      lineWidth: { bottom: 0.5 },
      lineColor: colors.border
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
      textColor: colors.primary,
      lineWidth: { bottom: 0.1 },
      lineColor: colors.border
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'right', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 30 },
      3: { cellWidth: 'auto', halign: 'right' },
    },
    didParseCell: (data) => {
      // Add subtle status color indicators
      if (data.section === 'body' && data.column.index === 0) {
        if (data.row.index === 0) data.cell.styles.textColor = colors.textMain;
        if (data.row.index === 1) data.cell.styles.textColor = colors.amber;
        if (data.row.index === 2) data.cell.styles.textColor = colors.red;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 20;
  
  // ── Action Required Section ──
  const expiringEntities = (dashboard?.expiringEntityCertificates || []).map(c => ({...c, isEntity: true}));
  const expiringStaff = (dashboard?.expiringStaffCertificates || []);
  const allExpiring = [...expiringEntities, ...expiringStaff];
  
  if (allExpiring.length > 0) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }
  
    doc.setFontSize(12);
    setColor(colors.primary, 'text');
    doc.text('3. Detailed Deficiency Log', margin, y);
    
    setColor(colors.border, 'fill');
    doc.rect(margin, y + 3, pageWidth - margin * 2, 0.5, 'F');
    
    y += 10;

    const actionData = allExpiring.slice(0, 15).map((cert) => [
      cert.type,
      cert.isEntity ? 'Entity Certificate' : cert.staffName,
      cert.status,
      cert.validTo ? new Date(cert.validTo).toLocaleDateString() : 'N/A',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Certificate Type', 'Subject / Holder', 'Current Status', 'Valid To']],
      body: actionData,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: { font: 'helvetica' },
      headStyles: {
        fillColor: colors.bgLight,
        textColor: colors.textMuted,
        fontSize: 8,
        cellPadding: 4,
        lineWidth: { bottom: 0.5 },
        lineColor: colors.border
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 4,
        textColor: colors.textMain,
        lineWidth: { bottom: 0.1 },
        lineColor: colors.border
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          data.cell.styles.textColor = data.cell.raw === 'Expired' ? colors.red : colors.amber;
        }
      },
    });
  }

  // ── Professional Footer (on all pages) ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 15;
    
    // Top border line for footer
    setColor(colors.border, 'fill');
    doc.rect(margin, footerY - 5, pageWidth - margin * 2, 0.5, 'F');

    doc.setFontSize(7);
    setColor(colors.textMuted, 'text');
    doc.text(
      'KIAL Aviation Security Data Management System — Confidential',
      margin,
      footerY + 2
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      footerY + 2,
      { align: 'right' }
    );
  }

  // ── Save ──
  doc.save(`${entityName.replace(/\s+/g, '_')}_Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
