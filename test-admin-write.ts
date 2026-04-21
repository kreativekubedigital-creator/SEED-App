import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const adminApp = getApps().length === 0 
  ? initializeApp({ projectId: firebaseConfig.projectId }) 
  : getApp();

const db = getFirestore(adminApp); // Use default database

async function testWrite() {
  console.log(`Attempting to write to database: ${firebaseConfig.firestoreDatabaseId}...`);
  try {
    const docRef = await db.collection('test_collection').add({
      test: "data",
      timestamp: new Date().toISOString()
    });
    console.log("Write SUCCESS. Doc ID:", docRef.id);
  } catch (e) {
    console.error("Write FAILED:", e.message);
    if (e.stack) console.error(e.stack);
  }
}

testWrite();
