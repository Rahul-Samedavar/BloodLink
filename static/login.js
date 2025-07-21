    let nToken = "";
    const app_key = "BCIzy7fWsJEN0sGehhhSU-jyM3W8oU5a4OFTZdK5-bJ2J7B-wf4NRmD_aMfcDmzjM6_4eUiqKUx0vGb_LDNC6Lw";
    const firebaseConfig = {
      apiKey: "AIzaSyBrmFpQP-4_HxmQP7QAl7EVFWhSayRLsv8",
      authDomain: "messenger-bace1.firebaseapp.com",
      projectId: "messenger-bace1",
      storageBucket: "messenger-bace1.appspot.com",
      messagingSenderId: "911520687357",
      appId: "1:911520687357:web:9ff994ca263ef468d78a94",
      measurementId: "G-ZGCW8BW07Y"
    };

    firebase.initializeApp(firebaseConfig);
    const m = firebase.messaging();
    var msg = document.getElementById("msg");

    async function validateForm() {
      var password = document.getElementById("password").value;
      var phone = document.getElementById("phone").value;

      if (phone == "" || password == "") {
        alert("Please fill in all fields.");
        return false;
      }
      
      await registerUserFCM(); // Wait for registerUserFCM to complete
      loginUser();
    }

    async function loginUser() {
      try {
        const response = await fetch('/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ phone, password, nToken})
        });
        const result = await response.json();
        if (result.error) {
          msg.innerHTML = result.error;
          return;
        }
        const token = result.token;
        document.cookie = `access_token=${token}; path=/;SameSite=None; Secure`;
        console.log('Login successful');
        window.location.href = "/update";
      } catch (error) {
        console.error('Error logging in:', error.message);
      }
    }

    function sendTokenToDB(done) {
      m.getToken({
        vapidKey: app_key
      }).then((currentToken) => {
        if (currentToken) {
          console.log('current token for client: ', currentToken);
          nToken = currentToken
        }
      }).catch((err) => {
        console.log('An error occurred while retrieving token. ', err);
      });
    }

    async function registerUserFCM() {
      if (!("Notification" in window)) {
        return false
      } else if (Notification.permission === "granted") {
        return sendTokenToDB()
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            return sendTokenToDB()
          } else {
            alert("You won't be able to receive blood request notifications!")
          }
          return false;
        });
      }
    }