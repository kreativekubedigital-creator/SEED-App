import serverless from "serverless-http";
import app from "../../server";

// Netlify uses a specific path for functions. 
// We ensure the Express app knows it's being served from /api
export const handler = serverless(app);
