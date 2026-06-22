import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from datetime import datetime
from database import SessionLocal
from models import CaseHistory

def generate_report_pdf(report, user, image_path: str = None, case=None) -> str:
    """
    Generates a professional PDF report for a given forensic analysis record.
    Includes case ID, victim reference, project title, and predicted classes.
    """
    # Auto-resolve case reference from DB if not provided
    if case is None and getattr(report, "case_id", None):
        db = SessionLocal()
        try:
            case = db.query(CaseHistory).filter(CaseHistory.id == report.case_id).first()
        except Exception as e:
            print(f"Error fetching case in PDF generator: {e}")
        finally:
            db.close()

    reports_dir = os.path.join("uploads", "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    pdf_filename = f"Forensic_Report_{report.id}_{datetime.now().strftime('%Y%m%d%H%M')}.pdf"
    pdf_path = os.path.join(reports_dir, pdf_filename)
    
    doc = SimpleDocTemplate(
        pdf_path, 
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    styles = getSampleStyleSheet()
    
    # Custom styles matching Light theme (crimson/black/gray)
    title_style = ParagraphStyle(
        'ProjectTitleStyle',
        parent=styles['Heading2'],
        textColor=colors.HexColor("#B91C1C"), # Professional Red
        alignment=1, # Center
        spaceAfter=15,
        fontSize=12,
        leading=14
    )
    
    header_style = ParagraphStyle(
        'ReportHeaderStyle',
        parent=styles['Heading1'],
        textColor=colors.HexColor("#1E293B"), # Dark Slate
        alignment=1, # Center
        spaceAfter=5,
        fontSize=18,
        leading=22
    )

    section_heading_style = ParagraphStyle(
        'SectionHeadingStyle',
        parent=styles['Heading2'],
        textColor=colors.HexColor("#1E293B"),
        fontSize=12,
        spaceBefore=12,
        spaceAfter=6,
        borderPadding=2
    )

    normal_bold_style = ParagraphStyle(
        'NormalBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold'
    )
    
    normal_style = styles['Normal']
    
    elements = []
    
    # Project Title (Header)
    project_title = "<b>Ensemble Learning Approach for Weapon Detection Using Images of Wound Patterns: A Forensic Perspective</b>"
    elements.append(Paragraph(project_title, title_style))
    elements.append(Paragraph("<b>OFFICIAL FORENSIC ANALYSIS REPORT</b>", header_style))
    elements.append(Paragraph(f"<font color='#64748B'>Generated via Secure Continuous Learning Ensemble Pipeline on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</font>", ParagraphStyle('Sub', parent=normal_style, alignment=1)))
    elements.append(Spacer(1, 15))
    
    # User Details Table
    case_num = str(case.case_number) if (case and getattr(case, "case_number", None)) else f"CASE-{report.case_id}"
    victim_ref = str(case.victim_reference) if (case and getattr(case, "victim_reference", None)) else "N/A"
    case_desc = str(case.case_description) if (case and getattr(case, "case_description", None)) else "N/A"

    analyst_name = "System"
    if user:
        analyst_name = str(user.full_name or user.username or "System")
        
    system_role = "Personnel"
    if user and getattr(user, "role", None):
        system_role = str(user.role.replace('_', ' ').capitalize())

    info_data = [
        [Paragraph("<b>Case Reference ID:</b>", normal_style), Paragraph(case_num, normal_style),
         Paragraph("<b>Date & Time:</b>", normal_style), Paragraph(report.generated_date.strftime("%Y-%m-%d %H:%M") if getattr(report, "generated_date", None) else datetime.now().strftime("%Y-%m-%d %H:%M"), normal_style)],
        [Paragraph("<b>Victim Reference:</b>", normal_style), Paragraph(victim_ref, normal_style),
         Paragraph("<b>Analyst Name:</b>", normal_style), Paragraph(analyst_name, normal_style)],
        [Paragraph("<b>Case Description:</b>", normal_style), Paragraph(case_desc, normal_style),
         Paragraph("<b>System Role:</b>", normal_style), Paragraph(system_role, normal_style)]
    ]
    
    info_table = Table(info_data, colWidths=[110, 160, 90, 160])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F9FAFB")), # Light Gray card bg
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")), # Soft border
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 15))
    
    # Prediction Results
    elements.append(Paragraph("<b>AI Inference Results</b>", section_heading_style))
    
    weapon_prob_str = f"{report.weapon_probability * 100:.1f}%" if (report and getattr(report, "weapon_probability", None)) else "N/A"
    wound_prob_str = f"{report.wound_probability * 100:.1f}%" if (report and getattr(report, "wound_probability", None)) else "N/A"
    
    pred_weapon = str(report.predicted_weapon) if (report and getattr(report, "predicted_weapon", None)) else "Unknown"
    pred_wound = str(report.predicted_wound_type) if (report and getattr(report, "predicted_wound_type", None)) else "Unknown"
    severity_val = str(report.severity) if (report and getattr(report, "severity", None)) else "Moderate"

    results_data = [
        [Paragraph("<b>Predicted Implement:</b>", normal_bold_style), Paragraph(pred_weapon, normal_style),
         Paragraph("<b>Confidence Score:</b>", normal_bold_style), Paragraph(weapon_prob_str, normal_style)],
        [Paragraph("<b>Wound Typology:</b>", normal_bold_style), Paragraph(pred_wound, normal_style),
         Paragraph("<b>Confidence Score:</b>", normal_bold_style), Paragraph(wound_prob_str, normal_style)],
        [Paragraph("<b>Assessed Severity:</b>", normal_bold_style), Paragraph(f"<font color='#B91C1C'><b>{severity_val}</b></font>", normal_style),
         Paragraph("<b>Inference Engine:</b>", normal_bold_style), Paragraph("v3.0-ensemble", normal_style)]
    ]
    results_table = Table(results_data, colWidths=[130, 140, 110, 140])
    results_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(results_table)
    elements.append(Spacer(1, 15))
    
    # Side by side Image and Forensic Notes / Precautions
    content_data = []
    
    # 1. Image
    img_element = Paragraph("<i>No Image Evidence Available</i>", normal_style)
    if image_path and os.path.exists(image_path):
        try:
            # Resize image helper maintaining ratio
            img_element = Image(image_path, width=220, height=160)
        except Exception as e:
            img_element = Paragraph(f"<i>Image could not be rendered: {e}</i>", normal_style)
            
    # 2. Notes & Precautions
    notes_paragraphs = []
    notes_paragraphs.append(Paragraph("<b>Forensic Case Notes:</b>", normal_bold_style))
    if getattr(report, "forensic_notes", None):
        for note in report.forensic_notes:
            notes_paragraphs.append(Paragraph(f"• {note}", normal_style))
    else:
        notes_paragraphs.append(Paragraph("• No forensic notes logged.", normal_style))
        
    notes_paragraphs.append(Spacer(1, 6))
    notes_paragraphs.append(Paragraph("<b>Critical Precautions:</b>", normal_bold_style))
    if getattr(report, "precautions", None):
        for prec in report.precautions:
            notes_paragraphs.append(Paragraph(f"• <font color='#B91C1C'>{prec}</font>", normal_style))
    else:
        notes_paragraphs.append(Paragraph("• No precautions issued.", normal_style))
        
    # Put them side-by-side
    side_data = [
        [img_element, notes_paragraphs]
    ]
    side_table = Table(side_data, colWidths=[240, 280])
    side_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (1, 0), (1, 0), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(side_table)
    
    # Signatures Panel
    elements.append(Spacer(1, 35))
    analyst_sig_name = "Unknown"
    if user:
        analyst_sig_name = str(user.full_name or user.username or "Unknown")

    sig_data = [
        [Paragraph("____________________________", normal_style), Paragraph("____________________________", normal_style)],
        [Paragraph(f"<b>Analyst Signature</b><br/>{analyst_sig_name}", normal_style),
         Paragraph("<b>Reviewer Signature</b><br/>Certified Forensic Examiner", normal_style)]
    ]
    sig_table = Table(sig_data, colWidths=[260, 260])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(sig_table)
    
    # Footer disclaimer
    elements.append(Spacer(1, 20))
    disclaimer = "<font color='#64748B' size='8'><b>Disclaimer:</b> This report is generated securely by the Ensemble AI System. It is strictly for medical-legal investigative support and must be verified by a certified human patholgist / examiner.</font>"
    elements.append(Paragraph(disclaimer, normal_style))
    
    # Build Document
    doc.build(elements)
    return pdf_path
