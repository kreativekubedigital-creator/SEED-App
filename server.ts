import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase configuration missing in server.ts");
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
  res.json({ status: "ok", message: "SEED Backend is running with Supabase" });
});

// Schools CRUD
app.get("/api/schools", checkSuperAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('schools').select('*');
    if (error) throw error;
    res.json(data);
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
    const { data, error } = await supabase.from('schools').insert(schoolData).select().single();
    if (error) throw error;
    res.status(201).json(data);
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
    const { data, error } = await supabase.from('schools').select('*').eq('id', req.params.id).single();
    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: "School not found" });
      throw error;
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch school" });
  }
});

app.put("/api/schools/:id", checkSuperAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('schools').update(req.body).eq('id', req.params.id);
    if (error) throw error;
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
    const { error } = await supabase.from('schools').delete().eq('id', req.params.id);
    if (error) throw error;
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
