import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function seedSchool() {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  const adminApp = getApps().length === 0 
    ? initializeApp({ projectId: firebaseConfig.projectId }) 
    : getApp();

  const adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

  const schoolData = {
    name: "Test School",
    email: "test@test.com",
    address: "123 Test St",
    phone: "555-1234",
    planId: "free",
    status: "active",
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await adminDb.collection('schools').add(schoolData);
    console.log("School added with ID:", docRef.id);
  } catch (error) {
    console.error("Error adding school:", error);
    process.exit(1);
  }
}

seedSchool();
