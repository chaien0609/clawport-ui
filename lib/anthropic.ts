/**
 * OpenClaw gateway integration for vision (image) messages.
 *
 * The gateway's /v1/chat/completions endpoint strips image_url content parts.
 * Images work through the WebSocket agent pipeline (chat.send), which is the
 * same path Discord/Telegram/etc use. We call it via `openclaw gateway call`.
 *
 * Flow: extract images as attachments → chat.send → poll chat.history → return
 */

import type { ApiMessage, ContentPart } from './validation'

export interface OpenClawAttachment {
  mimeType: string
  content: string // base64
}

/**
 * Check if any message in the array contains image_url content parts.
 */
export function hasImageContent(messages: ApiMessage[]): boolean {
  return messages.some(m => {
    if (typeof m.content === 'string') return false
    return (m.content as ContentPart[]).some(p => p.type === 'image_url')
  })
}

/**
 * Extract all image attachments from messages in OpenClaw's format:
 * { mimeType: "image/png", content: "<base64>" }
 */
export function extractImageAttachments(messages: ApiMessage[]): OpenClawAttachment[] {
  const attachments: OpenClawAttachment[] = []

  for (const msg of messages) {
    if (typeof msg.content === 'string') continue
    for (const part of msg.content as ContentPart[]) {
      if (part.type === 'image_url') {
        const { mediaType, data } = parseDataUrl(part.image_url.url)
        attachments.push({ mimeType: mediaType, content: data })
      }
    }
  }

  return attachments
}

/**
 * Build a text prompt from the system prompt and conversation messages.
 * Extracts text from content arrays, skips system messages and image parts.
 */
export function buildTextPrompt(systemPrompt: string, messages: ApiMessage[]): string {
  const parts: string[] = []

  if (systemPrompt) {
    parts.push(systemPrompt)
  }

  for (const msg of messages) {
    if (msg.role === 'system') continue

    let text: string
    if (typeof msg.content === 'string') {
      text = msg.content
    } else {
      text = (msg.content as ContentPart[])
        .filter(p => p.type === 'text')
        .map(p => p.text)
        .join('\n')
    }

    if (text) {
      parts.push(`${msg.role}: ${text}`)
    }
  }

  return parts.join('\n\n')
}

/**
 * Send a vision message through the OpenClaw gateway's chat.send pipeline.
 * This is the same path Discord/Telegram use — supports image attachments.
 *
 * Returns the assistant's response text, or null on failure.
 */
export async function sendViaOpenClaw(opts: {
  openclawBin: string
  gatewayToken: string
  message: string
  attachments: OpenClawAttachment[]
  sessionKey?: string
  timeoutMs?: number
}): Promise<string | null> {
  const { execFile } = await import('child_process')
  const { promisify } = await import('util')
  const execFileAsync = promisify(execFile)

  const sessionKey = opts.sessionKey || 'agent:main:manor-ui'
  const idempotencyKey = `manor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const timeoutMs = opts.timeoutMs || 60000

  const params = JSON.stringify({
    sessionKey,
    idempotencyKey,
    message: opts.message,
    attachments: opts.attachments,
  })

  try {
    // Send the message with image attachments
    await execFileAsync(opts.openclawBin, [
      'gateway', 'call', 'chat.send',
      '--params', params,
      '--token', opts.gatewayToken,
      '--json',
    ], { timeout: timeoutMs })

    // Poll chat.history for the response
    const pollStart = Date.now()
    const pollInterval = 1000
    const maxPollTime = timeoutMs

    while (Date.now() - pollStart < maxPollTime) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))

      try {
        const historyResult = await execFileAsync(opts.openclawBin, [
          'gateway', 'call', 'chat.history',
          '--params', JSON.stringify({ sessionKey, limit: 3 }),
          '--token', opts.gatewayToken,
          '--json',
        ], { timeout: 10000 })

        const historyData = JSON.parse(historyResult.stdout)

        // Look for the assistant's reply to our message
        if (historyData?.result?.messages) {
          const msgs = historyData.result.messages
          // Find the most recent assistant message
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'assistant' && msgs[i].content) {
              return msgs[i].content
            }
          }
        }
        // Also check if the result itself is the response
        if (historyData?.result?.content) {
          return historyData.result.content
        }
      } catch {
        // Poll failed, try again
      }
    }

    return null
  } catch (err) {
    console.error('OpenClaw chat.send error:', err)
    return null
  }
}

function parseDataUrl(url: string): { mediaType: string; data: string } {
  if (!url.startsWith('data:')) {
    return { mediaType: 'image/png', data: url }
  }

  const commaIdx = url.indexOf(',')
  if (commaIdx === -1) {
    return { mediaType: 'image/png', data: url }
  }

  const header = url.slice(5, commaIdx)
  const data = url.slice(commaIdx + 1)
  const mediaType = header.split(';')[0] || 'image/png'

  return { mediaType, data }
}
