import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Flexible config loading for different serverless environments (Vercel vs Netlify)
const getConfig = () => {
  const localPath = path.join(__dirname, "firebase-applet-config.json");
  const rootPath = path.join(process.cwd(), "firebase-applet-config.json");
  
  if (fs.existsSync(localPath)) return JSON.parse(fs.readFileSync(localPath, "utf-8"));
  if (fs.existsSync(rootPath)) return JSON.parse(fs.readFileSync(rootPath, "utf-8"));
  
  // Fallback to environment variable if file is missing (Security Best Practice)
  if (process.env.FIREBASE_CONFIG) return JSON.parse(process.env.FIREBASE_CONFIG);
  
  throw new Error("Missing firebase-applet-config.json. Please ensure it exists in the root or is provided via FIREBASE_CONFIG env var.");
};

const firebaseConfig = getConfig();

// Initialize Firebase Admin with the project ID from the config
const adminApp = getApps().length === 0 
  ? initializeApp({
      projectId: firebaseConfig.projectId,
    }) 
  : getApp();

// Connect to the specific database instance
const adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

const app = express();
const PORT: number = Number(process.env.PORT) || 8085;

app.use(express.json());

// RBAC Middleware (Simple version for now)
const checkSuperAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userRole = req.headers['x-user-role'];
  if (userRole === 'super_admin') {
    next();
  } else {
    res.status(403).json({ error: "Forbidden: Super Admin access required" });
  }
};

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "SEED Backend is running" });
});

// Schools CRUD
app.get("/api/schools", checkSuperAdmin, async (req, res) => {
  try {
    const snap = await adminDb.collection('schools').get();
    const schools = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(schools);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch schools" });
  }
});

app.post("/api/schools", checkSuperAdmin, async (req, res) => {
  try {
    const schoolData = {
      ...req.body,
      status: req.body.status || 'active',
      createdAt: new Date().toISOString()
    };
    const docRef = await adminDb.collection('schools').add(schoolData);
    res.status(201).json({ id: docRef.id, ...schoolData });
  } catch (error) {
    console.error("Error creating school:", error);
    res.status(500).json({ 
      error: "Failed to create school", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

app.get("/api/schools/:id", checkSuperAdmin, async (req, res) => {
  try {
    const schoolDoc = await adminDb.collection('schools').doc(req.params.id).get();
    if (schoolDoc.exists) {
      res.json({ id: schoolDoc.id, ...schoolDoc.data() });
    } else {
      res.status(404).json({ error: "School not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch school" });
  }
});

app.put("/api/schools/:id", checkSuperAdmin, async (req, res) => {
  try {
    await adminDb.collection('schools').doc(req.params.id).update(req.body);
    res.json({ message: "School updated successfully" });
  } catch (error) {
    console.error("Error updating school:", error);
    res.status(500).json({ 
      error: "Failed to update school",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.delete("/api/schools/:id", checkSuperAdmin, async (req, res) => {
  try {
    await adminDb.collection('schools').doc(req.params.id).delete();
    res.json({ message: "School deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete school" });
  }
});

// Start server if not running as a serverless function
if (process.env.NODE_ENV !== 'production' || (!process.env.VERCEL && !process.env.NETLIFY)) {
  import("vite").then(({ createServer: createViteServer }) => {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`SEED Server running on http://0.0.0.0:${PORT}`);
      });
    });
  });
}

// Export the app for Vercel
export default app;
