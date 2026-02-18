import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-12345'
})

// Mock scrollIntoView for useRef element
Element.prototype.scrollIntoView = vi.fn()

// Set env vars BEFORE module import
vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://gateway.lanonasis.com')
vi.stubEnv('NEXT_PUBLIC_LANONASIS_API_KEY', 'lano_test_key')

describe('AiDemo component', () => {
  let AiDemo: any

  beforeAll(async () => {
    const module = await import('../../app/components/ai-demo')
    AiDemo = module.AiDemo
  })

  beforeEach(() => {
    mockFetch.mockClear()
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  describe('Component rendering', () => {
    it('renders chat input + send button when configured', async () => {
      render(<AiDemo />)
      
      expect(screen.getByPlaceholderText(/Ask about security/i)).toBeInTheDocument()
      // Get the submit button (last button in the form)
      const buttons = screen.getAllByRole('button')
      const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit')
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('API call behavior', () => {
    it('calls fetch with correct URL', async () => {
      const mockResponse = {
        message: { content: 'Hello from VortexShield AI!' },
        onasis_metadata: {
          powered_by: 'Onasis-CORE',
          provider: 'onasis-ai',
          actual_provider: 'ollama',
          processing_time_ms: 234,
          timestamp: new Date().toISOString(),
        },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<AiDemo />)
      
      const input = screen.getByPlaceholderText(/Ask about security/i)
      const buttons = screen.getAllByRole('button')
      const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit')!
      
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://gateway.lanonasis.com/api/v1/ai/chat',
          expect.any(Object)
        )
      })
    })

    it('sends correct headers', async () => {
      const mockResponse = {
        message: { content: 'Response' },
        onasis_metadata: { actual_provider: 'ollama' },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<AiDemo />)
      
      const input = screen.getByPlaceholderText(/Ask about security/i)
      const buttons = screen.getAllByRole('button')
      const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit')!
      
      fireEvent.change(input, { target: { value: 'Test' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0]
        const options = callArgs[1] as RequestInit
        const headers = options.headers as Record<string, string>
        
        expect(headers['X-API-Key']).toBe('lano_test_key')
        expect(headers['X-Project-Scope']).toBe('v-secure')
        expect(headers['X-Request-ID']).toBe('test-uuid-12345')
        expect(headers['Content-Type']).toBe('application/json')
      })
    })

    it('sends correct body structure', async () => {
      const mockResponse = {
        message: { content: 'Response' },
        onasis_metadata: { actual_provider: 'ollama' },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<AiDemo />)
      
      const input = screen.getByPlaceholderText(/Ask about security/i)
      const buttons = screen.getAllByRole('button')
      const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit')!
      
      fireEvent.change(input, { target: { value: 'Hello AI' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0]
        const options = callArgs[1] as RequestInit
        const body = JSON.parse(options.body as string)
        
        expect(body.messages).toEqual([
          { role: 'user', content: 'Hello AI' }
        ])
        expect(body.system_prompt).toBeDefined()
        expect(body.prompt).toBeUndefined() // Should NOT have prompt field
      })
    })
  })

  describe('Response handling', () => {
    it('extracts message.content from branded Ollama response', async () => {
      const mockResponse = {
        model: 'qwen2.5-coder:3b',
        message: { role: 'assistant', content: 'Hello from VortexShield AI!' },
        done: true,
        onasis_metadata: {
          powered_by: 'Onasis-CORE',
          provider: 'onasis-ai',
          actual_provider: 'ollama',
          processing_time_ms: 234,
          timestamp: new Date().toISOString(),
        },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<AiDemo />)
      
      const input = screen.getByPlaceholderText(/Ask about security/i)
      const buttons = screen.getAllByRole('button')
      const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit')!
      
      fireEvent.change(input, { target: { value: 'Who are you?' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Hello from VortexShield AI!/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('shows provider badge in subtitle after response', async () => {
      const mockResponse = {
        message: { content: 'Response' },
        onasis_metadata: {
          powered_by: 'Onasis-CORE',
          actual_provider: 'ollama',
        },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(<AiDemo />)
      
      const input = screen.getByPlaceholderText(/Ask about security/i)
      const buttons = screen.getAllByRole('button')
      const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit')!
      
      fireEvent.change(input, { target: { value: 'Test' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Powered by Onasis-CORE/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('shows error in UI on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      render(<AiDemo />)

      const input = screen.getByPlaceholderText(/Ask about security/i)
      const buttons = screen.getAllByRole('button')
      const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit')!

      fireEvent.change(input, { target: { value: 'Test' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Debug:/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })
})

// ---
// Not-configured state — requires module reset so isConfigured re-evaluates without env vars
// ---
describe('AiDemo — not configured', () => {
  it('shows gateway configuration guide when env vars are absent', async () => {
    // Remove env stubs so the fresh module import evaluates isConfigured = false
    vi.unstubAllEnvs()
    vi.resetModules()

    const { AiDemo: UnconfiguredDemo } = await import('../../app/components/ai-demo')
    render(<UnconfiguredDemo />)

    expect(screen.getByText(/Configure the Onasis Gateway/i)).toBeInTheDocument()
    expect(screen.getByText(/NEXT_PUBLIC_API_URL/)).toBeInTheDocument()
    expect(screen.getByText(/NEXT_PUBLIC_LANONASIS_API_KEY/)).toBeInTheDocument()

    // Restore stubs for any subsequent test files
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://gateway.lanonasis.com')
    vi.stubEnv('NEXT_PUBLIC_LANONASIS_API_KEY', 'lano_test_key')
  })
})
