import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

load_dotenv()

def test_login():
    email = os.getenv('MAIL_USERNAME')
    password = os.getenv('MAIL_PASSWORD')
    
    print(f"Testing login for {email} with password length {len(password) if password else 0}")
    
    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.ehlo()
        server.login(email, password)
        print("Login SUCCESS!")
        
        msg = EmailMessage()
        msg.set_content("This is a test email from AuctionEdge.")
        msg['Subject'] = 'Test Email'
        msg['From'] = email
        msg['To'] = email
        
        server.send_message(msg)
        print("Test email sent!")
        
        server.quit()
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == '__main__':
    test_login()
