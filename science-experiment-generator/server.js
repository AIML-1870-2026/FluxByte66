import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
  const { gradeLevel, materials, apiKey, type, unavailableMaterials } = req.body;
  const key = apiKey?.trim() || process.env.OPENAI_API_KEY;

  if (!key) {
    return res.status(400).json({ error: 'No API key provided. Enter one in the UI or add OPENAI_API_KEY to .env.' });
  }
  if (!materials?.trim()) {
    return res.status(400).json({ error: 'Please provide at least one material.' });
  }

  let messages;

  if (type === 'substitution') {
    messages = [
      {
        role: 'system',
        content: `You are an experienced science educator designing experiments for ${gradeLevel} students. Suggest practical alternative materials that can replace unavailable ones while achieving the same experimental result. Format your response in Markdown.`
      },
      {
        role: 'user',
        content: `The experiment uses these materials: ${materials}\n\nThese materials are unavailable: ${unavailableMaterials}\n\nFor each unavailable material, suggest one or two substitutes a ${gradeLevel} student could realistically find at home. Explain briefly why each substitute works.`
      }
    ];
  } else {
    messages = [
      {
        role: 'system',
        content: `You are an experienced science educator designing experiments for ${gradeLevel} students.
Your experiments must be safe, engaging, and achievable with common household materials.
Format your response in Markdown with EXACTLY these sections in this order:
## [Experiment Title]
**Difficulty:** [Easy / Medium / Hard]
### Hypothesis
### Materials Needed
### Step-by-Step Instructions
### Expected Outcome
### The Science Behind It
### Safety Notes
Keep language and complexity appropriate for ${gradeLevel}.`
      },
      {
        role: 'user',
        content: `Generate a science experiment using some or all of these available materials:\n${materials}\nThe student is in ${gradeLevel}. Suggest one clear experiment. If some materials are not ideal, note which ones are most important.`
      }
    ];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: `OpenAI API request failed: ${errData.error?.message || response.statusText}`
      });
    }

    const data = await response.json();
    const markdown = data.choices[0]?.message?.content ?? '';
    res.json({ markdown });
  } catch (err) {
    res.status(500).json({ error: `OpenAI API request failed: ${err.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🔬 Science Experiment Generator running at http://localhost:${PORT}\n`);
});
