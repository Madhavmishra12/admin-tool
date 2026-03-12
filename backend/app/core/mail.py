import os
import base64
import smtplib
import resend
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def _get_logo_base64() -> str:
    """Load GrowQR logo as base64 for embedding in emails"""
    logo_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'static', 'growqr_logo.png')
    try:
        with open(logo_path, 'rb') as f:
            return base64.b64encode(f.read()).decode()
    except Exception:
        return ""

def _build_html_email(name: str, body_text: str, cta_url: str, cta_label: str = "Login to Dashboard") -> str:
    """Build a branded HTML email for GrowQR"""
    logo_b64 = _get_logo_base64()
    logo_img = f'<img src="data:image/png;base64,{logo_b64}" alt="GrowQR" style="height:60px;margin-bottom:8px;" />' if logo_b64 else '<span style="font-size:28px;font-weight:bold;color:#3b3b4f;">Grow<span style="color:#f97316;">QR</span></span>'
    
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <tr>
          <td align="center" style="background:#1e1e2e;padding:32px 40px;">
            {logo_img}
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 20px 40px;">
            <h2 style="margin:0 0 12px;color:#1e1e2e;font-size:22px;">Hello, {name}! &#128075;</h2>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.7;">{body_text}</p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td align="center" style="background:#f97316;border-radius:8px;">
                  <a href="{cta_url}" style="display:inline-block;padding:14px 36px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">{cta_label}</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#888;font-size:13px;">Or copy this link into your browser:</p>
            <p style="margin:0 0 24px;color:#f97316;font-size:12px;word-break:break-all;">{cta_url}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;" />
            <p style="margin:0;color:#aaa;font-size:12px;">This link is secure and unique to you. Do not share it.<br/>If you did not request this email, you can safely ignore it.</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="background:#f7f7fa;padding:20px 40px;border-top:1px solid #eee;">
            <p style="margin:0 0 4px;color:#888;font-size:12px;">Powered by</p>
            {logo_img}
            <p style="margin:8px 0 0;color:#aaa;font-size:11px;">&#169; 2025 GrowQR. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

def send_email(to_email: str, subject: str, body: str, name: str = "", cta_url: str = "", cta_label: str = "Login to Dashboard"):
    """Helper to send branded GrowQR email via Resend or SMTP"""
    resend.api_key = settings.RESEND_API_KEY
    
    html_body = _build_html_email(name or to_email, body, cta_url or "#", cta_label)
    
    if settings.RESEND_API_KEY:
        try:
            params = {
                "from": settings.SMTP_FROM,
                "to": [to_email],
                "subject": subject,
                "text": body,
                "html": html_body,
            }
            resend.Emails.send(params)
            print(f">>> Branded GrowQR email sent via Resend to {to_email}")
            return True
        except Exception as e:
            print(f"!!! Failed to send email via Resend to {to_email}: {str(e)}")
    
    if not all([settings.SMTP_HOST, settings.SMTP_PORT, settings.SMTP_USER, settings.SMTP_PASSWORD]):
        print(f"!!! No Email Service configured. Log email to: {to_email}")
        print(f"!!! Login URL: {cta_url}")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = settings.SMTP_FROM
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f">>> Branded email sent via SMTP to {to_email}")
        return True
    except Exception as e:
        print(f"!!! Failed to send email via SMTP to {to_email}: {str(e)}")
        return False
