import { useState, useRef, useEffect } from 'react';
import { UserProfile, Subject } from '../../types';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { addXP } from '../../services/gamificationService';

export const AIStudyBuddy = ({ user, subjects = [], classLevel }: { user: UserProfile, subjects?: Subject[], classLevel?: string }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: `Hi ${user.firstName}! I'm your AI study buddy. I can help you understand your subjects like ${subjects.slice(0, 3).map(s => s.name).join(', ')}${subjects.length > 3 ? ' and more' : ''}, clarify homework, or answer general questions. How can I help you learn today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      // Award XP for chat
      addXP(user.uid, 'AI_CHAT').catch(console.error);

      let apiKey = '';
      try {
        apiKey = process.env.GEMINI_API_KEY || '';
      } catch (e) {
        // Ignore ReferenceError
      }
      try {
        const userKey = process.env.API_KEY;
        if (userKey) apiKey = userKey;
      } catch (e) {
        // Ignore ReferenceError
      }
      
      if (!apiKey) {
        throw new Error("API Key not found in environment. Please ensure GEMINI_API_KEY is set.");
      }
      const ai = new GoogleGenAI({ apiKey });
      
      // Filter out the initial greeting from the history sent to the API
      // as Gemini API expects the conversation history to start with a 'user' message
      // or at least not have the initial system-like greeting as the only message.
      const history = messages.slice(1).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const subjectList = subjects.map(s => s.name).join(', ');
      const systemInstruction = `You are a friendly, encouraging, and safe AI tutor for a school student named ${user.firstName}. 
The student is currently in ${classLevel || 'school'} level and enrolled in the following subjects: ${subjectList}.
They are currently at Level ${user.level || 1} with a ${user.streakCount || 0}-day streak. 
Occasionally acknowledge their progress and encourage them to keep going.
Your goal is to help them learn, not just give them the answers. If they ask for the answer to a homework problem, guide them step-by-step so they can solve it themselves. 
Explain concepts simply and clearly, tailored to their ${classLevel || 'current'} level. Ensure all topics are safe and appropriate for children. 
Refuse to answer any inappropriate, harmful, or unsafe questions politely. Keep your responses concise and engaging.`;

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: systemInstruction,
        },
        history: history
      });

      const response = await chat.sendMessage({ message: userMessage });

      if (response.text) {
        setMessages(prev => [...prev, { role: 'model', text: response.text }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I couldn't process that right now. Could you try asking in a different way?" }]);
      }

    } catch (error: any) {
      console.error("AI Error:", error);
      let errorMessage = "Oops! I'm having a little trouble connecting right now. Please try again later.";
      
      if (error.message) {
        if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID")) {
          errorMessage = "It looks like the AI Study Buddy isn't fully set up yet (Invalid API Key). Please contact your administrator.";
        } else if (error.message.includes("process is not defined") || error.message.includes("API Key not found")) {
          errorMessage = "AI Helper configuration error: API Key not found. Please check your environment settings.";
        } else {
          // Try to parse JSON error if possible, otherwise use generic
          try {
            const parsedError = JSON.parse(error.message);
            if (parsedError.error && parsedError.error.message) {
               errorMessage = `Oops! I'm having a little trouble connecting right now. (${parsedError.error.message}). Please try again later.`;
            }
          } catch (e) {
             // Not JSON, just use the generic message or a safe substring
             // We don't want to show giant JSON strings to the user
             if (error.message.length < 100) {
                errorMessage = `Oops! I'm having a little trouble connecting right now. (${error.message}). Please try again later.`;
             }
          }
        }
      }
      
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-white/50 bg-white dark:bg-slate-900/50 flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-200 text-slate-900 dark:text-slate-100 rounded-2xl flex items-center justify-center shadow-md shrink-0 border border-white/20">
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className="font-medium text-2xl text-slate-900 dark:text-slate-100">AI Study Buddy</h3>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">Safe, guided help for your subjects and homework.</p>
        </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto space-y-5 bg-transparent">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-white/40 text-slate-900 dark:text-slate-100 shadow-sm' : 'bg-blue-600 text-white shadow-sm border border-white/20'}`}>
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm shadow-md border border-white/10' : 'bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-white/50 shadow-sm rounded-tl-sm text-slate-900 dark:text-slate-100'}`}>
              {msg.role === 'user' ? (
                <p className="font-medium leading-relaxed">{msg.text}</p>
              ) : (
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-white dark:bg-slate-900/50 prose-pre:border prose-pre:border-white/50 prose-pre:text-slate-900 dark:text-slate-100 prose-a:text-blue-600 prose-strong:text-slate-900 dark:text-slate-100">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-200 text-slate-900 dark:text-slate-100 flex items-center justify-center shadow-sm shrink-0 border border-white/20">
              <Bot size={20} />
            </div>
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-white/50 shadow-sm rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-blue-100 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2.5 h-2.5 bg-blue-100 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2.5 h-2.5 bg-blue-100 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-slate-900/50 backdrop-blur-md border-t border-white/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your studies..."
            className="flex-grow px-6 py-2.5 rounded-full border border-white/50 bg-white dark:bg-slate-900/50 hover:border-white focus:bg-white dark:bg-slate-900/80 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-900 dark:text-slate-100 cursor-text shadow-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-blue-600 text-white hover:bg-blue-700 w-10 h-10 rounded-full disabled:opacity-50 hover:scale-105 transition-all flex items-center justify-center shrink-0 shadow-sm"
          >
            <Send size={20} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
};
