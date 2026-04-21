async function seed() {
  const schoolData = {
    name: "Test School",
    email: "test@test.com",
    address: "123 Test St",
    phone: "555-1234",
    planId: "free"
  };

  try {
    const res = await fetch('http://localhost:3000/api/schools', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'super_admin'
      },
      body: JSON.stringify(schoolData)
    });

    if (res.ok) {
      const data = await res.json();
      console.log("School added successfully via API:", data);
    } else {
      const error = await res.text();
      console.error("Failed to add school via API:", res.status, error);
    }
  } catch (error) {
    console.error("Error calling API:", error);
  }
}

seed();
