//====================================================
//login 
const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', function(event) {

        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('login-error');
        
        if (username === 'admin' || username === 'Admin' && password === 'Admin123') {
            window.location.href = 'Admin.html'; 
            
        } else if (username === 'student' || username === 'Student' && password === 'Student123') {
            window.location.href = '../index.html'; 
            
        } else {
            errorMessage.style.display = 'block';
        }
    });
}
//===============================================================
//sign up
const signupForm = document.getElementById('signup-form');

if (signupForm) {
    signupForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const password = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const messageBox = document.getElementById('signup-message');
        let email = document.getElementById("email").value;
        let valid = true;
        
       
        let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let passwordRegex = /^.{8,}$/;
       

        if(!emailRegex.test(email)){
        document.getElementById("emailError").innerText =
        "Invalid email format";
        valid = false;}else{
        document.getElementById("emailError").innerText = "";}

        if(!passwordRegex.test(password)){
        document.getElementById("passwordError").innerText =
        "Password must be at least 8 characters";
        valid = false;}else{
        document.getElementById("passwordError").innerText = "";}

        if(password !== confirmPassword){
        document.getElementById("confirmError").innerText =
        "Passwords do not match";
        valid = false; }
        else{
        document.getElementById("confirmError").innerText = "";}

        if(!valid){
        e.preventDefault();}
        
        const gender = document.querySelector('input[name="gender"]:checked').value;
        const newUser = {
            name: document.getElementById('fullName').value,
            gender: gender,
            university: document.getElementById('university').value,
            major: document.getElementById('major').value,
            email: document.getElementById('email').value,
            password: password,
            role: 'user' 
        };
        
        localStorage.setItem('currentUser', JSON.stringify(newUser));

        messageBox.textContent = "Account created successfully! Redirecting to login...";
        messageBox.style.color = "green";
        messageBox.style.display = "block";

        // Wait 1 seconds so they can read the message, then redirect to login
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    });


}
//==========================================================