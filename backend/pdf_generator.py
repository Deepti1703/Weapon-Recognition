import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from datetime import datetime

def generate_report_pdf(report, user, image_path: str = None) -> str:
    """
    Generates a PDF report for a given forensic analysis record.
    Returns the path to the generated PDF.
    """
    reports_dir = os.path.join("uploads", "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    pdf_filename = f"Forensic_Report_{report.id}_{datetime.now().strftime('%Y%m%d%H%M')}.pdf"
    pdf_path = os.path.join(reports_dir, pdf_filename)
    
    doc = SimpleDocTemplate(pdf_path, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Custom forensic style
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        textColor=colors.darkblue,
        alignment=1, # Center
        spaceAfter=20
    )
    
    normal_style = styles['Normal']
    
    elements = []
    
    # Header
    elements.append(Paragraph("<b>CONFIDENTIAL FORENSIC ANALYSIS REPORT</b>", title_style))
    elements.append(Spacer(1, 12))
    
    # User Details Table
    user_data = [
        ["Analyst Name:", user.name if user.name else "Unknown"],
        ["Analyst Required ID:", user.username],
        ["Generated To:", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
        ["ID Verification Status:", user.id_verification.status if user.id_verification else "Pending"]
    ]
    t1 = Table(user_data, colWidths=[150, 300])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.whitesmoke),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t1)
    elements.append(Spacer(1, 20))
    
    # Prediction Results
    elements.append(Paragraph("<b>AI Analysis Results</b>", styles['Heading2']))
    
    results_data = [
        ["Predicted Weapon:", report.predicted_weapon],
        ["Weapon Probability:", f"{report.weapon_probability * 100:.2f}%"],
        ["Predicted Wound Type:", report.predicted_wound_type],
        ["Wound Probability:", f"{report.wound_probability * 100:.2f}%"]
    ]
    t2 = Table(results_data, colWidths=[150, 300])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('PADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(t2)
    elements.append(Spacer(1, 20))
    
    # Image Section
    if image_path and os.path.exists(image_path):
        elements.append(Paragraph("<b>Evidence Image</b>", styles['Heading2']))
        try:
            img = Image(image_path, width=300, height=200)
            elements.append(img)
        except Exception as e:
            elements.append(Paragraph(f"<i>Image could not be loaded: {e}</i>", normal_style))
    
    # Footer disclaimer
    elements.append(Spacer(1, 30))
    disclaimer = "This report is generated securely by the Ensemble AI System. It is strictly for investigative purposes and must be verified by a certified human expert."
    elements.append(Paragraph(disclaimer, styles['Italic']))
    
    # Build Document
    doc.build(elements)
    return pdf_path
