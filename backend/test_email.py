import smtplib
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

load_dotenv() # Load .env file

sender = os.getenv("EMAIL_ADDRESS")
password = os.getenv("EMAIL_PASSWORD")
receiver = os.getenv("TEST_RECEIVER_EMAIL") or sender or "test@auraedit.ai"

if not sender:
    print("[WARNING] os.getenv('EMAIL_ADDRESS') returned None! Check backend/.env file.")

msg = MIMEText("This is a test OTP verification code: 123456")
msg['Subject'] = "OTP Test Verification"
msg['From'] = sender or "auth@auraedit.ai"
msg['To'] = receiver

try:
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    if sender and password:
        server.login(sender, password)
    server.sendmail(sender, [receiver], msg.as_string())
    server.quit()
    print("[SUCCESS] Email sent successfully!")
except Exception as e:
    print("[ERROR] SMTP Exception:", e)
