import { useState, useRef, useEffect } from 'react';
import { UserProfile, Subject } from '../../types';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { addXP } from '../../services/gamificationService';
import { cn } from '../../lib/utils';

export const AIStudyBuddy = ({ user, subjects = [], classLevel }: { user: UserProfile, subjects?: Subject[], classLevel?: string }) => {
  const isFemale = user.gender === 'female';
  
  const containerClass = cn(
    "backdrop-blur-md rounded-2xl border shadow-sm overflow-hidden flex flex-col h-[600px]",
    isFemale 
      ? "bg-white/90 border-pink-200 shadow-pink-200/20" 
      : "bg-slate-900/50 border-slate-700 shadow-slate-900/40"
  );

  const headerClass = cn(
    "p-4 border-b flex items-center gap-4",
    isFemale 
      ? "border-pink-100 bg-gradient-to-r from-pink-50 to-amber-50" 
      : "border-slate-800 bg-slate-900/80"
  );

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

      // Use Vite's environment variable access
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("AI Assistant configuration missing. Please contact support.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
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
        model: "gemini-1.5-flash",
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
          errorMessage = "It looks like the AI Study Buddy isn't fully set up yet. Please contact your administrator.";
        } else if (error.message.includes("VITE_GEMINI_API_KEY") || error.message.includes("configuration missing")) {
          errorMessage = "AI Helper configuration error: System key not found. Please check your environment settings.";
        } else {
          errorMessage = `Oops! I'm having a little trouble connecting right now. Please try again later.`;
        }
      }
      
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={containerClass}>
      <div className={headerClass}>
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shrink-0 border",
          isFemale 
            ? "bg-gradient-to-br from-pink-500 to-amber-500 text-white border-pink-300" 
            : "bg-blue-600 text-white border-blue-500"
        )}>
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className={cn("font-bold text-xl", isFemale ? "text-pink-900" : "text-white")}>AI Study Buddy</h3>
          <p className={cn("text-xs font-medium", isFemale ? "text-pink-600" : "text-slate-400")}>Safe, guided help for your subjects and homework.</p>
        </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto space-y-5">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
              msg.role === 'user'
                ? (isFemale ? "bg-amber-100 text-amber-700" : "bg-slate-700 text-slate-300")
                : (isFemale ? "bg-pink-100 text-pink-700" : "bg-blue-900/50 text-blue-400")
            )}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
              msg.role === 'user'
                ? (isFemale 
                    ? "bg-gradient-to-br from-pink-500 to-amber-500 text-white rounded-tr-sm" 
                    : "bg-blue-600 text-white rounded-tr-sm")
                : (isFemale 
                    ? "bg-white border border-pink-100 text-slate-800 rounded-tl-sm" 
                    : "bg-slate-800/80 border border-slate-700 text-slate-200 rounded-tl-sm")
            )}>
              {msg.role === 'user' ? (
                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
              ) : (
                <div className={cn(
                  "prose prose-sm max-w-none",
                  isFemale ? "prose-slate" : "prose-invert"
                )}>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              isFemale ? "bg-pink-100 text-pink-700" : "bg-blue-900/50 text-blue-400"
            )}>
              <Bot size={16} />
            </div>
            <div className={cn(
              "rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5",
              isFemale ? "bg-white border border-pink-100" : "bg-slate-800/80 border border-slate-700"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full animate-bounce", isFemale ? "bg-pink-300" : "bg-blue-500")} style={{ animationDelay: '0ms' }} />
              <div className={cn("w-1.5 h-1.5 rounded-full animate-bounce", isFemale ? "bg-pink-300" : "bg-blue-500")} style={{ animationDelay: '150ms' }} />
              <div className={cn("w-1.5 h-1.5 rounded-full animate-bounce", isFemale ? "bg-pink-300" : "bg-blue-500")} style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={cn(
        "p-4 border-t",
        isFemale ? "bg-white border-pink-100" : "bg-slate-900/80 border-slate-800"
      )}>
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
            className={cn(
              "flex-grow px-5 py-3 rounded-2xl border outline-none transition-all text-sm font-medium",
              isFemale 
                ? "bg-pink-50 border-pink-100 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-pink-300 focus:ring-4 focus:ring-pink-500/5" 
                : "bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            )}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 shrink-0 shadow-lg",
              isFemale 
                ? "bg-gradient-to-br from-pink-500 to-amber-500 text-white shadow-pink-500/20" 
                : "bg-blue-600 text-white shadow-blue-600/20"
            )}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
