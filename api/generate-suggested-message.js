import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function setCorsHeaders(req, res) {
  const configuredOrigin = process.env.CLIENT_ORIGIN
  const requestOrigin = req.headers.origin
  const allowedOrigin = configuredOrigin || requestOrigin || '*'

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function getSafeLeadPayload(lead = {}) {
  return {
    clientName: lead.client || '',
    referralPartner: lead.partner || '',
    leadType: lead.leadType || '',
    stage: lead.stage || lead.status || '',
    status: lead.status || '',
    loanAmount: lead.loanAmount || '',
    loanType: lead.loanType || '',
    interestRate: lead.interestRate || '',
    firstPaymentDate: lead.firstPaymentDate || '',
    creditScore: lead.creditScore || '',
    closingDate: lead.closingDate || '',
    lastTouch: lead.lastTouch || '',
    nextAction: lead.nextAction || '',
    nextActionDate: lead.nextActionDate || '',
    notes: lead.detail || '',
    recentTouches: Array.isArray(lead.touchHistory)
      ? lead.touchHistory.slice(0, 3).map((touch) => ({
          type: touch.type || '',
          note: touch.note || '',
          date: touch.date || '',
        }))
      : [],
  }
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error('Unable to parse OpenAI response as JSON:', error)
    return null
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Missing OPENAI_API_KEY. Add it to your deployment environment variables before using API-generated messages.',
      })
    }

    const lead = getSafeLeadPayload(req.body?.lead)
    const messageType = req.body?.messageType === 'agentText' ? 'agentText' : 'clientText'

    const response = await openai.responses.create({
      model: process.env.OPENAI_MESSAGE_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'You are Brian McIntosh\'s mortgage CRM writing assistant. Write concise, warm, professional mortgage follow-up messages in Brian\'s voice. Avoid em dashes. Use commas or periods instead. Do not invent facts. Use only the lead data provided. Keep messages helpful, clear, and relationship-focused. Return only valid JSON.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                task: 'Generate a suggested follow-up message for this mortgage CRM lead.',
                messageType,
                requirements: {
                  clientText: 'Write a text message directly to the borrower/client.',
                  agentText: 'Write a short update to the referral partner or real estate agent.',
                  tone: 'Conversational, professional, clear, hopeful, and not pushy.',
                  length: '1 short paragraph, generally 2 to 4 sentences.',
                  signature: 'Do not include a signature.',
                  compliance: 'Do not quote rates as guaranteed. Do not make promises of approval, payment, or closing. Do not provide legal, tax, or financial advice.',
                },
                lead,
                outputFormat: {
                  clientText: 'string',
                  agentText: 'string',
                  reason: 'string explaining why this message fits the lead stage and recent notes',
                },
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'suggested_mortgage_message',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              clientText: { type: 'string' },
              agentText: { type: 'string' },
              reason: { type: 'string' },
            },
            required: ['clientText', 'agentText', 'reason'],
          },
          strict: true,
        },
      },
    })

    const generated = parseJsonResponse(response.output_text)

    if (!generated) {
      return res.status(502).json({
        error: 'The message generator returned an unexpected response. Try again.',
      })
    }

    return res.status(200).json(generated)
  } catch (error) {
    console.error('Suggested message generation failed:', error)
    return res.status(500).json({
      error: error.message || 'Suggested message generation failed.',
    })
  }
}
