import { TestCase } from '../interfaces/test-case.interface';

export const GITHUB_TEST_CASES: TestCase[] = [
  {
    name: 'github-001',
    description:
      'Test case for creating a new repository with 3 branches and a PR',
    input: `Hey! I need to set up a new repo for this travel planner project I'm working on. Can you help me create a repository called travel-planner-app? I need to start with 3 branches: main, feature-maps, and feature-itinerary. \n\nFor the README.md on main, can you add this content: \"# Travel Planner App\n\nA comprehensive travel planning application that helps users organize their trips, find attractions, and discover local restaurants.\"\n\nI also need an app.js file on the feature-itinerary branch with this basic Express setup: \"// Main application entry point\nconst express = require('express');\nconst app = express();\n\napp.get('/', (req, res) => {\n  res.send('Welcome to Travel Planner!');\n});\n\napp.listen(3000, () => {\n  console.log('Server running on port 3000');\n});\"\n\nOh, and don't forget a .gitignore file on main with: \"# Node dependencies\nnode_modules/\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n\n# Python cache and virtual environments\n__pycache__/\n*.pyc\n*.py.class\nvenv/\n*.env\"\n\nI found this budget_estimation.py file in the OSU NLP Group's TravelPlanner repo that might be useful. Can you copy it to the feature-maps branch? \n\nLastly, I'd like to create a PR from feature-itinerary to main. Title it \"Add basic Express server setup\" and for the description: \"This PR implements the initial Express server configuration with a basic route handler for the homepage.\" Thanks!`,
    output: {
      contains: 'a',
    },
  },
];
