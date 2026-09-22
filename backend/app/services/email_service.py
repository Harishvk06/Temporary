import os
import smtplib
import logging
from email.mime.text import MIMEText
from dotenv import load_dotenv
from app.config import settings

# Load .env environment variables
load_dotenv()

logger = logging.getLogger("email_service")

class EmailService:
    @staticmethod
    def send_otp_email(to_email: str, otp_code: str) -> bool:
        """
        Sends 6-digit OTP verification code via Gmail SMTP configured strictly from .env.
        Uses pure ASCII print statements to prevent Windows cp1252 UnicodeEncodeError crashes.
        """
        sender_email = os.getenv("EMAIL_ADDRESS") or settings.EMAIL_ADDRESS or os.getenv("MAIL_USERNAME")
        sender_password = os.getenv("EMAIL_PASSWORD") or settings.EMAIL_PASSWORD or os.getenv("MAIL_PASSWORD")
        smtp_server = os.getenv("MAIL_SERVER") or settings.MAIL_SERVER or "smtp.gmail.com"
        smtp_port = int(os.getenv("MAIL_PORT") or settings.MAIL_PORT or 587)

        # Check if EMAIL_ADDRESS is loaded from .env
        if not sender_email or sender_email == "auth@auraedit.ai":
            print("[WARNING] os.getenv('EMAIL_ADDRESS') returned None or default value. Please verify your backend/.env file contains EMAIL_ADDRESS.")
            logger.warning("os.getenv('EMAIL_ADDRESS') returned None or default value.")

        # Construct email message using MIMEText
        text_content = f"Your AuraEdit AI security verification code is: {otp_code}\n\nThis code will expire in 5 minutes. Do not share this code with anyone."
        msg = MIMEText(text_content, "plain", "utf-8")
        msg["Subject"] = f"Your Security OTP Verification Code: {otp_code}"
        msg["From"] = sender_email or "auth@auraedit.ai"
        msg["To"] = to_email

        try:
            # 1. Connect to Gmail SMTP (smtp.gmail.com:587)
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=15)
            
            # 2. Initiate STARTTLS before login
            server.starttls()

            # 3. Login with credentials
            if sender_email and sender_password:
                server.login(sender_email, sender_password)

            # 4. Transmit email message
            server.sendmail(sender_email, [to_email], msg.as_string())
            server.quit()

            print(f"[SUCCESS] OTP Email sent successfully to {to_email}!")
            logger.info(f"OTP Email sent successfully to {to_email} via {smtp_server}:{smtp_port}")
            return True

        except Exception as e:
            # Print exact error to backend console for debugging (do not leak to frontend)
            print(f"[SMTP ERROR] Error sending email to {to_email}: {e}")
            logger.error(f"Error sending email to {to_email}: {e}")
            return False

email_service = EmailService()
