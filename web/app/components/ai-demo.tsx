'use client'

import { useMemo, useState } from 'react'
import { AiSDK } from '@lanonasis/ai-sdk'
import { ShieldCheck, Loader2 } from 'lucide-react'

type State = 'idle' | 'loading' | 'done' | 'error'

export function AiDemo() {
  const sdk = useMemo(() => new AiSDK(), [])
  const [state, setState] = useState<State>('idle')
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string>('')

  async function runDemo() {
    setState('loading')
    setOutput('')
    setError('')
    try {
      const res = await sdk.orchestrate('generate a security hardening checklist for a Next.js app', {
        format: 'text',
      })
      const message = res.message || 'Received response'
      const detail = res.workflow?.length ? res.workflow.join('\n') : ''
      setOutput([message, detail].filter(Boolean).join('\n\n'))
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
      setState('error')
    }
  }

  const isLoading = state === 'loading'

  return (
    <section className="py-16 bg-slate-900/60">
      <div className="container-custom">
        <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
              <ShieldCheck className="w-6 h-6 text-vortex-cyan" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-100">AI Security Orchestrator (Live)</h3>
              <p className="text-sm text-gray-400">
                Powered by @lanonasis/ai-sdk — browser-safe, running directly in this page.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={runDemo}
              disabled={isLoading}
              className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-gradient-to-r from-vortex-blue to-vortex-cyan text-white font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running...
                </>
              ) : (
                'Run AI security check'
              )}
            </button>
            <p className="text-sm text-gray-400">
              Returns a security-hardening checklist for this landing page stack (Next.js, React 18).
            </p>
          </div>

          <div className="mt-6">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 min-h-[160px]">
              {state === 'idle' && <p className="text-gray-500">Click “Run AI security check” to see a live response.</p>}
              {isLoading && <p className="text-gray-300">Orchestrating...</p>}
              {state === 'done' && (
                <pre className="whitespace-pre-wrap text-sm text-gray-100 leading-relaxed">{output}</pre>
              )}
              {state === 'error' && <p className="text-red-400 text-sm">Error: {error}</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
