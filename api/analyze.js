const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const MAX_CHARS = 15000;

const SYSTEM_PROMPT = `You are ClauseCheck, a contract risk analysis assistant. Your job is to analyze contract text and identify risky clauses.

Analyze the provided contract text and return a JSON object with exactly this structure:
{
  "riskScore": "Low Risk" | "Medium Risk" | "High Risk",
  "flags": [
    {
      "clause": "Brief name or summary of the flagged clause (e.g., 'Automatic Renewal Clause', 'Broad Indemnification')",
      "risk": "Plain-English explanation of why this clause is risky and what could go wrong for the signer",
      "question": "A specific, practical question the user should ask the other party to address this risk"
    }
  ]
}

Guidelines:
- riskScore: Use "High Risk" for 3+ serious concerns or one extremely dangerous clause. Use "Medium Risk" for 1-2 moderate concerns. Use "Low Risk" if nothing major stands out.
- flags: Only include genuinely risky or unusual clauses. Do not flag standard, fair terms. If no real risks, return an empty flags array [].
- clause: Keep it to 5-10 words describing what the clause does.
- risk: 2-4 sentences in plain, non-legal English. Explain the actual downside (e.g., "You could be locked into paying for another year without notice").
- question: Write it as if the user is emailing the other party. Be specific and actionable.

Return ONLY the raw JSON. No markdown, no code fences, no extra text.`;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { contractText } = req.body || {};
    if (!contractText || typeof contractText !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid contractText' });
    }
    const trimmed = contractText.trim();
    if (trimmed.length === 0) return res.status(400).json({ error: 'Contract text cannot be empty' });
    if (trimmed.length > MAX_CHARS) return res.status(400).json({ error: `Contract text exceeds ${MAX_CHARS} character limit` });

    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
        console.error('KIMI_API_KEY environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const kimiRes = await fetch(KIMI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'moonshot-v1-8k',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: trimmed }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        });

        if (!kimiRes.ok) {
            const errorBody = await kimiRes.text();
            console.error('Kimi API error:', kimiRes.status, errorBody);
            return res.status(502).json({ error: 'Analysis service temporarily unavailable' });
        }

        const kimiData = await kimiRes.json();
        const content = kimiData.choices?.[0]?.message?.content;
        if (!content) {
            console.error('Empty response from Kimi API');
            return res.status(502).json({ error: 'Invalid response from analysis service' });
        }

        let parsed;
        try {
            const cleaned = content
                .replace(/^\`\`\`json\s*/, '')
                .replace(/^\`\`\`\s*/, '')
                .replace(/\s*\`\`\`$/, '')
                .trim();
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error('JSON parse error:', parseErr.message, 'Content:', content);
            return res.status(502).json({ error: 'Failed to parse analysis result' });
        }

        if (!parsed.riskScore || !Array.isArray(parsed.flags)) {
            console.error('Invalid response structure:', parsed);
            return res.status(502).json({ error: 'Invalid analysis result structure' });
        }

        return res.status(200).json(parsed);
    } catch (err) {
        console.error('Server error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
