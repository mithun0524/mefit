const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();
const { supabase } = require('./supabase');

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy' });

// Dynamic onboarding endpoint
app.post('/api/onboarding/next', async (req, res) => {
  try {
    const { history } = req.body;
    
    const prompt = `
      You are an AI personal trainer onboarding a new user to a gym tracking app.
      Your goal is to gather their fitness goals, limitations, and experience level.
      Here is the conversation history:
      ${JSON.stringify(history)}
      
      Based on the history, if you still need more information, ask the next logical question.
      If you have enough information to create a profile (goals, limitations, experience level), respond with a JSON object containing {"complete": true, "profile": { goals: "", limitations: "", experienceLevel: "" }}.
      If asking a question, respond with {"complete": false, "question": "..."}.
      Respond ONLY with the JSON object.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });

    const result = JSON.parse(response.text);
    res.json(result);
  } catch (error) {
    console.error("AI Onboarding Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Agent endpoint for workout tracking
app.post('/api/agent/chat', async (req, res) => {
  try {
    const { message, userId } = req.body;
    // In a full implementation, we would use Function Calling / Tools with Gemini API
    // Tools: log_workout, suggest_plan, get_history
    const prompt = `
      You are an AI personal trainer inside a gym tracking app.
      The user says: "${message}"
      
      Respond as the AI trainer. If they asked to log a workout, extract the workout details and return a JSON containing the response and an action.
      Example: {"response": "I've logged your 5x5 bench press at 225lbs.", "action": { "type": "log_workout", "exercise": "Bench Press", "sets": 5, "reps": 5, "weight": 225 }}
      If no action is needed, just return {"response": "..."}.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });

    const result = JSON.parse(response.text);
    
    // If there is an action, we would execute it against Supabase here
    if (result.action && result.action.type === 'log_workout') {
       console.log("Executing tool:", result.action);
       // await supabase.from('workouts').insert(...)
    }

    res.json(result);
  } catch (error) {
    console.error("Agent Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
