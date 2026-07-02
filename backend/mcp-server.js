const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { supabase } = require('./supabase');

const server = new McpServer({
  name: "GymAppMCPServer",
  version: "1.0.0"
});

// Tool: Fetch user's workout history
server.tool(
  "fetch_workout_history",
  "Fetch a user's recent workout history",
  { userId: z.string() },
  async ({ userId }) => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*, workout_exercises(*, exercises(*), sets(*))')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  }
);

// Tool: Fetch exercise database
server.tool(
  "get_exercise_database",
  "Search the exercise database",
  { query: z.string().optional() },
  async ({ query }) => {
    try {
      let q = supabase.from('exercises').select('name, muscle_group, equipment, description').limit(20);
      if (query) {
        q = q.ilike('name', `%${query}%`);
      }
      const { data, error } = await q;

      if (error) throw error;
      
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  }
);

// Tool: Generate/Suggest Workout Plan
server.tool(
  "generate_workout_plan",
  "Suggest a workout plan for the user based on their goals",
  { userId: z.string(), focusArea: z.string() },
  async ({ userId, focusArea }) => {
    // In a full implementation this would query the user's profile and use AI
    return {
      content: [{ type: "text", text: `Suggested ${focusArea} workout: 1. Squats 3x10, 2. Lunges 3x12, 3. Leg Press 3x10.` }]
    };
  }
);

// Start the stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gym App MCP Server running on stdio");
}

main().catch(console.error);
