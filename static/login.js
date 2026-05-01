document.addEventListener('DOMContentLoaded', () => {
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const loginForm = document.getElementById('loginForm');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const otpInput = document.getElementById('otp');
    const loginMessage = document.getElementById('loginMessage');

    sendOtpBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage("Please enter both email and password.", "error-text");
            return;
        }

        sendOtpBtn.innerText = "Sending...";
        sendOtpBtn.disabled = true;

        fetch('/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    step1.classList.add('hidden');
                    step2.classList.remove('hidden');
                    showMessage("OTP sent successfully! Check your inbox.", "success-text");
                } else {
                    sendOtpBtn.innerText = "Send Verification OTP";
                    sendOtpBtn.disabled = false;
                    showMessage(data.message || "Failed to send OTP", "error-text");
                }
            })
            .catch(err => {
                sendOtpBtn.innerText = "Send Verification OTP";
                sendOtpBtn.disabled = false;
                showMessage("Server error while sending OTP.", "error-text");
            });
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        const otp = otpInput.value;

        if (!otp) {
            showMessage("Please enter the OTP.", "error-text");
            return;
        }

        const loginBtn = document.getElementById('loginBtn');
        loginBtn.innerText = "Verifying...";
        loginBtn.disabled = true;

        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password, otp: otp })
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showMessage("Login Successful! Redirecting...", "success-text");
                    window.location.href = "/";
                } else {
                    loginBtn.innerText = "Verify & Login";
                    loginBtn.disabled = false;
                    showMessage(data.message || "Invalid OTP or Credentials.", "error-text");
                }
            })
            .catch(err => {
                loginBtn.innerText = "Verify & Login";
                loginBtn.disabled = false;
                showMessage("Server error while logging in.", "error-text");
            });
    });

    function showMessage(msg, className) {
        loginMessage.innerText = msg;
        loginMessage.className = "message-text " + className;
    }
});
