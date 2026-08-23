async function testSubmitComplaint() {
  try {
    console.log("1. Logging in as student...");
    const loginRes = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "student@campus.edu",
        password: "password123"
      })
    });
    
    if (!loginRes.ok) {
      console.error("Login failed with status:", loginRes.status);
      const text = await loginRes.text();
      console.error(text);
      return;
    }
    
    const { token, user } = await loginRes.json();
    console.log(`Student Login Successful! Token is: ${token.substring(0, 30)}...`);
    console.log("Logged user role:", user.role);
    console.log("Logged user id:", user.id);

    // Decode token payload
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log("Decoded Token Payload:", payload);

    console.log("\n2. Calling /api/complaints with Student token...");
    const complaintRes = await fetch("http://localhost:5000/api/complaints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        title: "Leaking faucet in bathroom",
        description: "The faucet in bathroom B-204 is leaking constantly, please fix it."
      })
    });
    
    const data = await complaintRes.json();
    if (!complaintRes.ok) {
      console.error("Failed to submit complaint:", data);
    } else {
      console.log("Success! Response:", data);
    }

  } catch (error) {
    console.error("Error:", error.message);
  }
}

testSubmitComplaint();
