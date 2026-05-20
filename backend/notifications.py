import smtplib
import os
from email.message import EmailMessage
from background_task import BackgroundTasks # Example if tying directly into FastAPI BackgroundTasks

def send_alert_email(to_email: str, subject: str, content: str):
    """
    Sends an email notification via SMTP.
    In development mode, this can simply log to console to avoid failed connections.
    """
    # Disable actual sending if testing without SMTP server
    if not os.getenv("SMTP_SERVER"):
        print(f"--- MOCK EMAIL ---")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Content: {content}")
        print(f"------------------")
        return

    msg = EmailMessage()
    msg.set_content(content)
    msg["Subject"] = subject
    msg["From"] = os.getenv("SMTP_SENDER", "admin@forensicreports.com")
    msg["To"] = to_email

    try:
        smtp_server = os.getenv("SMTP_SERVER", "localhost")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        
        password = os.getenv("SMTP_PASSWORD")
        if password:
            server.login(msg["From"], password)
            
        server.send_message(msg)
        server.quit()
        print(f"Successfully sent email to {to_email}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")

# Pre-defined email templates
def notify_registration_approval(to_email: str):
    subject = "Your Forensic Account Registration is Approved"
    content = "Welcome to the Forensic Weapon Detection System. Your ID has been verified and your account is now active."
    send_alert_email(to_email, subject, content)

def notify_login_attempt(to_email: str, ip_address: str, success: bool):
    subject = f"Account Login {'Successful' if success else 'Failed'}"
    content = f"An attempt to login to your account was made from IP: {ip_address}.\nStatus: {'Success' if success else 'Failed'}."
    send_alert_email(to_email, subject, content)

def notify_report_generated(to_email: str, report_id: int):
    subject = f"New Analysis Report Generated (ID: {report_id})"
    content = f"A new forensic analysis report has been securely generated. Please login to your dashboard to review Report ID {report_id}."
    send_alert_email(to_email, subject, content)
