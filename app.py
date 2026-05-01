import os
import base64
import smtplib
import random
from email.mime.text import MIMEText
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from ultralytics import YOLO
from PIL import Image as PILImage
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()


app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "fallback_secret")

# Load the YOLO model once when the application starts
# Ensure `best.pt` is in the same directory as `app.py`
try:
    model = YOLO("best.pt")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    else:
        data = request.json
        email = data.get('email')
        password = data.get('password') # In a real app, validate against a DB!
        otp = data.get('otp')
        
        if 'otp' in session and session['otp'] == otp and session.get('otp_email') == email:
            session['authenticated'] = True
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Invalid OTP or credentials'})

@app.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({'status': 'error', 'message': 'Email provided is empty'})
        
    otp = str(random.randint(100000, 999999))
    session['otp'] = otp
    session['otp_email'] = email
    
    # send email
    try:
        sender_email = os.environ.get('SMTP_EMAIL')
        sender_password = os.environ.get('SMTP_PASSWORD')
        
        if not sender_email or not sender_password:
             return jsonify({'status': 'error', 'message': 'SMTP config missing. Check .env file.'})
             
        msg = MIMEText(f"Your RoadVision AI verification code is: {otp}")
        msg['Subject'] = "RoadVision AI - Login Verification"
        msg['From'] = sender_email
        msg['To'] = email
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        
        return jsonify({'status': 'success'})
    except Exception as e:
        print(f"SMTP Error: {e}")
        return jsonify({'status': 'error', 'message': f'Failed to send email. Ensure sender email is set.'})

@app.route('/')
def index():
    """Serves the main HTML page"""
    if not session.get('authenticated'):
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/logout')
def logout():
    """Logs the user out and redirects to login"""
    session.clear()
    return redirect(url_for('login'))

@app.route('/predict', methods=['POST'])
def predict():
    """Handles image upload, runs YOLO prediction, calculates metrics, and returns the result."""
    if not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401
    if model is None:
        return jsonify({'error': 'YOLO model could not be loaded.'}), 500

    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request.'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file.'}), 400
        
    if file:
        try:
            # Open Image
            img = PILImage.open(file.stream).convert('RGB')
            
            # Run YOLO prediction
            # conf=0.10 is kept from the original script
            results = model.predict(source=img, conf=0.10)
            
            if not len(results):
                return jsonify({'error': 'Prediction returned an empty result.'}), 500
                
            result = results[0]
            
            # 1. Process detections for measurements
            detections = []
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = result.names[class_id]
                
                # Get width and height in pixels
                width_px = int(box.xywh[0][2])
                height_px = int(box.xywh[0][3])
                
                detections.append({
                    "class_name": class_name,
                    "width_px": width_px,
                    "height_px": height_px
                })
                
            # 2. Extract plotting image and convert to base64
            # plot() returns a NumPy array in BGR format
            im_array = result.plot()
            
            # Convert BGR back to RGB for PIL Image
            im_rgb = im_array[..., ::-1]
            plotted_img = PILImage.fromarray(im_rgb)
            
            # Save the plotted image to an in-memory bytes buffer
            buffer = BytesIO()
            plotted_img.save(buffer, format="JPEG")
            img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            # 3. Return JSON with the base64 image string and detections list
            return jsonify({
                "message": "Success",
                "detections": detections,
                "image_b64": img_str
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Run the Flask app on default port 5000
    app.run(debug=True, port=5000)
