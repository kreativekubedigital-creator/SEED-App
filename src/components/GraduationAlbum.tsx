import { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { db, collection, getDocs, query, where, addDoc } from '../lib/compatibility';
import { GraduationStudent } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Image as ImageIcon, Plus, Loader2, X } from 'lucide-react';

export const GraduationAlbum = () => {
  const [students, setStudents] = useState<GraduationStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      const q = query(collection(db, 'graduation_students'));
      const querySnapshot = await getDocs(q);
      setStudents(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GraduationStudent)));
      setLoading(false);
    };
    fetchStudents();
  }, []);

  const generateImage = async () => {
    if (!prompt) return;
    setError(null);
    
    // Check for API key selection for image generation models
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
        // Proceeding after dialog opens, assuming user selects a key
      }
    }

    setGenerating(true);
    try {
      let apiKey = '';
      try {
        apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      } catch (e) {
        // Ignore ReferenceError
      }
      try {
        const userKey = import.meta.env.VITE_API_KEY;
        if (userKey) apiKey = userKey;
      } catch (e) {
        // Ignore ReferenceError
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [{ text: `A professional, high-quality graduation portrait of a student: ${prompt}. Clean background, studio lighting.` }],
        },
        config: {
          imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (err: any) {
      console.error("Image generation failed:", err);
      if (err.message && err.message.includes("Requested entity was not found")) {
        // Reset key selection if it fails with this specific error
        if (typeof window !== 'undefined' && (window as any).aistudio) {
          await (window as any).aistudio.openSelectKey();
        }
      }
      setError(`Image generation failed: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      setGenerating(false);
    }
  };

  const saveStudent = async () => {
    if (!generatedImage || !studentName) return;
    const newStudent = {
      name: studentName,
      photoUrl: generatedImage,
      schoolId: 'demo-school'
    };
    const docRef = await addDoc(collection(db, 'graduation_students'), newStudent);
    setStudents([...students, { id: docRef.id, ...newStudent }]);
    setShowGenerator(false);
    setGeneratedImage(null);
    setStudentName('');
    setPrompt('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-serif font-medium mb-2">Class of 2026</h1>
          <p className="text-gray-800 italic font-light">The Future Leaders of Nigeria</p>
        </div>
        <button
          onClick={() => setShowGenerator(true)}
          className="bg-[#2563EB] text-white px-3.5 py-1.5 rounded-full font-medium flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-lg"
        >
          <Sparkles size={20} /> Add to Album (AI)
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#2563EB]" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {students.map(student => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -5 }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-black/5"
            >
              <img
                src={student.photoUrl}
                alt={student.name}
                className="w-full aspect-square object-cover rounded-2xl mb-4"
                referrerPolicy="no-referrer"
              />
              <h3 className="font-medium text-center text-sm">{student.name}</h3>
            </motion.div>
          ))}
          {students.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-black/10">
              <ImageIcon className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-800">No students in the album yet. Be the first to add one!</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showGenerator && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white p-4 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden relative"
            >
              <button onClick={() => setShowGenerator(false)} className="absolute top-4 right-6 p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>

              <h3 className="text-2xl font-serif font-medium mb-6">Create AI Portrait</h3>
              
              <div className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
                    {error}
                  </div>
                )}
                {!generatedImage ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Describe the Student</label>
                      <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="e.g. A smiling Nigerian boy with short hair, wearing a white school uniform shirt..."
                        className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium h-32 resize-none cursor-text"
                      />
                    </div>
                    <button
                      onClick={generateImage}
                      disabled={generating || !prompt}
                      className="w-full bg-blue-600 text-white p-4 rounded-2xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                      {generating ? 'Generating Portrait...' : 'Generate with AI'}
                    </button>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="aspect-square rounded-3xl overflow-hidden border border-black/5">
                      <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Student Name</label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={e => setStudentName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium cursor-text"
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setGeneratedImage(null)}
                        className="flex-1 p-4 rounded-2xl border border-gray-200 font-medium hover:bg-gray-50 transition-all"
                      >
                        Redo
                      </button>
                      <button
                        onClick={saveStudent}
                        disabled={!studentName}
                        className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-medium disabled:opacity-50 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                      >
                        Save to Album
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
