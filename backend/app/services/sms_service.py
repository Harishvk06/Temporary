import re
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, Optional
import urllib.request
import urllib.parse
import base64
from app.config import settings

logger = logging.getLogger("sms_service")

class SMSService:
    def __init__(self):
        # Memory storage for active OTPs: phone_number -> OTP record
        # Format: { "phone_number": { "code": "123456", "expires_at": datetime, "attempts": 0, "last_sent_at": datetime } }
        self._otp_store: Dict[str, Dict[str, Any]] = {}

    def normalize_phone_number(self, phone: str) -> str:
        """Clean and normalize phone number to canonical E.164 format"""
        cleaned = re.sub(r"[^\d+]", "", phone.strip())
        if not cleaned.startswith("+"):
            # Default to + prefix if missing
            cleaned = "+" + cleaned
        return cleaned

    def generate_otp_code(self, length: int = 6) -> str:
        """Generate a cryptographically secure numeric OTP code"""
        return "".join(secrets.choice("0123456789") for _ in range(length))

    def send_otp(self, phone_number: str) -> Tuple[bool, str, Optional[int], Optional[str]]:
        """
        Generate and send an OTP code to a phone number.
        Returns: (success: bool, message: str, expires_in_seconds: int, dev_otp: str|None)
        """
        normalized_phone = self.normalize_phone_number(phone_number)
        
        # Check rate limiting / resend cooldown
        now = datetime.utcnow()
        if normalized_phone in self._otp_store:
            record = self._otp_store[normalized_phone]
            last_sent = record.get("last_sent_at")
            if last_sent:
                elapsed = (now - last_sent).total_seconds()
                if elapsed < settings.OTP_RESEND_COOLDOWN_SECONDS:
                    wait_time = int(settings.OTP_RESEND_COOLDOWN_SECONDS - elapsed)
                    return (
                        False, 
                        f"Please wait {wait_time} seconds before requesting another OTP.", 
                        None, 
                        None
                    )

        # Generate new 6-digit OTP
        code = self.generate_otp_code(6)
        expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        expires_in_seconds = settings.OTP_EXPIRE_MINUTES * 60

        # Store in OTP cache
        self._otp_store[normalized_phone] = {
            "code": code,
            "expires_at": expires_at,
            "attempts": 0,
            "last_sent_at": now
        }

        logger.info(f"Generated OTP [{code}] for phone {normalized_phone}. Valid for {settings.OTP_EXPIRE_MINUTES} mins.")

        # Attempt sending via Twilio SMS API if credentials are provided
        sms_sent = False
        dev_otp = None

        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER:
            try:
                sms_sent = self._send_twilio_sms(
                    to_phone=normalized_phone,
                    body=f"Your AuraEdit AI verification code is: {code}. Valid for {settings.OTP_EXPIRE_MINUTES} minutes."
                )
            except Exception as e:
                logger.error(f"Failed to send Twilio SMS to {normalized_phone}: {str(e)}")
                sms_sent = False

        if not sms_sent:
            # Fallback to dev/simulation mode
            logger.info(f"[DEV SMS SIMULATOR] SMS sent to {normalized_phone} with code: {code}")
            dev_otp = code
            return (
                True,
                f"OTP generated successfully. (Dev Simulation Mode: code sent to console & UI)",
                expires_in_seconds,
                dev_otp
            )
        
        return (
            True,
            f"OTP sent successfully via SMS to {normalized_phone}.",
            expires_in_seconds,
            None
        )

    def verify_otp(self, phone_number: str, otp_code: str) -> Tuple[bool, str]:
        """
        Verify an OTP code for a phone number.
        Returns: (success: bool, message: str)
        """
        normalized_phone = self.normalize_phone_number(phone_number)
        now = datetime.utcnow()

        if normalized_phone not in self._otp_store:
            return False, "No active OTP found for this phone number. Please request a new code."

        record = self._otp_store[normalized_phone]

        # Check expiration
        if now > record["expires_at"]:
            del self._otp_store[normalized_phone]
            return False, "OTP code has expired. Please request a new code."

        # Check max attempts limit
        if record["attempts"] >= 3:
            del self._otp_store[normalized_phone]
            return False, "Too many failed attempts. OTP code invalidated. Please request a new code."

        # Check matching code
        if record["code"] != otp_code.strip():
            record["attempts"] += 1
            remaining = 3 - record["attempts"]
            return False, f"Invalid OTP code. {remaining} attempt(s) remaining."

        # Code is correct! Remove from cache to prevent reuse
        del self._otp_store[normalized_phone]
        logger.info(f"OTP successfully verified for {normalized_phone}")
        return True, "OTP verified successfully!"

    def _send_twilio_sms(self, to_phone: str, body: str) -> bool:
        """Send SMS using Twilio REST API via standard HTTP request"""
        account_sid = settings.TWILIO_ACCOUNT_SID
        auth_token = settings.TWILIO_AUTH_TOKEN
        from_phone = settings.TWILIO_PHONE_NUMBER

        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        
        data = urllib.parse.urlencode({
            "To": to_phone,
            "From": from_phone,
            "Body": body
        }).encode("utf-8")

        auth_str = f"{account_sid}:{auth_token}"
        auth_bytes = auth_str.encode("utf-8")
        base64_auth = base64.b64encode(auth_bytes).decode("utf-8")

        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Authorization": f"Basic {base64_auth}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status in (200, 201)

sms_service = SMSService()
