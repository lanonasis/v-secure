'use client'

import { useState, useRef, useEffect } from 'react'
import { ShieldCheck, Loader2, Send, User, Trash2 } from 'lucide-react'

// Lanonasis branded AI icon
function LanonasisIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lanonasisGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#0066FF" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#lanonasisGradient)" opacity="0.15" />
      <circle cx="20" cy="20" r="14" stroke="url(#lanonasisGradient)" strokeWidth="2" fill="none" />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fill="url(#lanonasisGradient)"
        fontSize="16"
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        L
      </text>
    </svg>
  )
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// AI Chat edge function config (from environment variables)
// Supports multiple URL formats:
// - Full edge function URL: https://project.supabase.co/functions/v1/ai-chat
// - Base Supabase URL: https://project.supabase.co (will append /functions/v1/ai-chat)
// - Explicit AI chat URL via NEXT_PUBLIC_AI_CHAT_URL
function getAiChatUrl(): string {
  // 1. Explicit AI chat URL takes priority
  if (process.env.NEXT_PUBLIC_AI_CHAT_URL) {
    return process.env.NEXT_PUBLIC_AI_CHAT_URL
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return ''

  // 2. If it's already a full edge function URL, return as-is
  if (supabaseUrl.includes('/functions/v1/ai-chat')) {
    return supabaseUrl
  }

  // 3. If it's a base URL or other edge function, extract base and add ai-chat
  if (supabaseUrl.includes('/functions/')) {
    const baseUrl = supabaseUrl.substring(0, supabaseUrl.indexOf('/functions/'))
    return `${baseUrl}/functions/v1/ai-chat`
  }

  // 4. It's a base Supabase URL, append the edge function path
  return `${supabaseUrl}/functions/v1/ai-chat`
}

const AI_CHAT_URL = getAiChatUrl()
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if the AI chat is configured
const isConfigured = AI_CHAT_URL.length > 0 && !AI_CHAT_URL.includes('your-project')

// VortexShield AI identity and capabilities
const SYSTEM_PROMPT = `You are **VortexShield AI**, an intelligent security assistant built by Lanonasis.

## Identity
- Name: VortexShield AI
- Built by: Lanonasis (https://lanonasis.com)
- Purpose: Interactive security assistant for developers and security professionals
- Powered by: @lanonasis/ai-sdk with memory persistence

## Capabilities
- Security Analysis: Audit code, identify vulnerabilities, suggest fixes
- Best Practices: OWASP guidelines, secure coding patterns, authentication flows
- DevSecOps: CI/CD security, secrets management, infrastructure hardening
- Compliance: GDPR, SOC2, PCI-DSS guidance
- Code Reviews: Security-focused code review and refactoring suggestions

## Response Style
- Be concise and actionable - developers are busy
- Use bullet points and code examples when helpful
- Prioritize security risks by severity (Critical > High > Medium > Low)
- Always explain the "why" behind security recommendations
- If asked about non-security topics, be helpful but redirect to security focus

## Context
You're running in VortexShield, a security platform demo. The user may ask about:
- Securing Next.js/React applications
- API security and authentication
- Database security and encryption
- Cloud security (AWS, Supabase, Netlify)
- General cybersecurity questions

Remember: You are VortexShield AI. Introduce yourself briefly on first interaction.`

export function AiDemo() {
  // Send to AI with full conversation history for context
  const sendToAI = async (conversationHistory: ChatMessage[]): Promise<string> => {
    if (!isConfigured) {
      throw new Error('AI Chat not configured. Set NEXT_PUBLIC_SUPABASE_URL in your environment variables.');
    }

    // Build prompt with conversation context
    const contextPrompt = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n')

    const response = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY!}`,
        'apikey': SUPABASE_ANON_KEY!
      },
      body: JSON.stringify({
        prompt: contextPrompt,
        system_prompt: SYSTEM_PROMPT,
        messages: conversationHistory.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`API error: ${response.status}${errorText ? ` - ${errorText}` : ''}`)
    }

    const data = await response.json()
    return data.response || data.message || 'No response'
  }

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setError('')

    // Add user message to history
    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      // Send full conversation history for context
      const response = await sendToAI(updatedMessages)
      setMessages(prev => [...prev, { role: 'assistant', content: response || 'No response received' }])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get response'
      setError(errorMsg)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMsg}` }])
    } finally {
      setIsLoading(false)
    }
  }

  function clearChat() {
    setMessages([])
    setError('')
  }

  // Show configuration message if not set up
  if (!isConfigured) {
    return (
      <section className="py-16 bg-slate-900/60">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                <ShieldCheck className="w-6 h-6 text-vortex-cyan" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-100">VortexShield AI Chat</h3>
                <p className="text-sm text-gray-400">
                  Powered by @lanonasis/ai-sdk — interactive security assistant
                </p>
              </div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-8 text-center">
              <LanonasisIcon className="w-16 h-16 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-200 mb-2">AI Chat Demo</h4>
              <p className="text-gray-400 mb-4">
                Configure the Supabase edge function to enable the AI assistant.
              </p>
              <code className="text-sm bg-slate-800 px-3 py-1 rounded text-vortex-cyan block mb-2">
                NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
              </code>
              <code className="text-sm bg-slate-800 px-3 py-1 rounded text-vortex-cyan block">
                NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
              </code>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-slate-900/60">
      <div className="container-custom">
        <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                <ShieldCheck className="w-6 h-6 text-vortex-cyan" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-100">VortexShield AI Chat</h3>
                <p className="text-sm text-gray-400">
                  Powered by @lanonasis/ai-sdk — interactive security assistant
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                title="Clear chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Chat Messages */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 h-[400px] overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <LanonasisIcon className="w-16 h-16 mb-3" />
                <p className="text-center">Hi! I&apos;m <span className="text-vortex-cyan font-semibold">VortexShield AI</span></p>
                <p className="text-sm text-center mt-1">Your security-focused assistant. Ask me anything!</p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {['Who are you?', 'Secure my Next.js app', 'OWASP Top 10'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-full border border-slate-700 transition"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-vortex-cyan/20 flex items-center justify-center">
                        <LanonasisIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-vortex-blue text-white'
                        : 'bg-slate-800 text-gray-100'
                    }`}>
                      <pre className="whitespace-pre-wrap text-sm font-sans">{msg.content}</pre>
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-vortex-blue/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-vortex-blue" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-vortex-cyan/20 flex items-center justify-center">
                      <LanonasisIcon className="w-6 h-6" />
                    </div>
                    <div className="bg-slate-800 rounded-xl px-4 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-vortex-cyan" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about security, best practices, or development..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-vortex-cyan focus:ring-1 focus:ring-vortex-cyan"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-vortex-blue to-vortex-cyan text-white font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>

          {error && (
            <p className="mt-3 text-red-400 text-sm">Debug: {error}</p>
          )}
        </div>
      </div>
    </section>
  )
}
