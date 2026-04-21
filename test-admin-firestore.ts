import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const adminApp = getApps().length === 0 
  ? initializeApp({ projectId: firebaseConfig.projectId }) 
  : getApp();

async function test() {
  console.log("Testing (default) database...");
  try {
    const dbDefault = getFirestore(adminApp);
    const snap = await dbDefault.collection('test').limit(1).get();
    console.log("(default) database access: SUCCESS");
  } catch (e) {
    console.log("(default) database access: FAILED", e.message);
  }

  console.log(`Testing named database: ${firebaseConfig.firestoreDatabaseId}...`);
  try {
    const dbNamed = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
    const snap = await dbNamed.collection('test').limit(1).get();
    console.log("Named database access: SUCCESS");
  } catch (e) {
    console.log("Named database access: FAILED", e.message);
  }
}

test();
