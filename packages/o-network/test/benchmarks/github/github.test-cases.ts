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
  {
    name: 'github-002',
    description:
      'Test case for creating a new repository with 4 branches and a PR',
    input: `Hi! I'm just starting to learn about LLMs and want to set up my first training project. Could you help me create a repository called llm-training-toolkit? I'm trying to understand how different model architectures work, so I'd like to have separate branches for different experiments.\n\nCould you set up 4 branches: main, qwen-integration, starcoder-integration, and documentation? I want to keep things organized as I learn.\n\nFor the README.md on the main branch, I'd like: \"# LLM Training Toolkit\n\nA learning project for understanding and experimenting with large language model training and fine-tuning across different architectures.\"\n\nI've been reading about Qwen models and found there's a qwen.ipynb notebook in QwenLM's Qwen repository that looks really helpful for learning. Could you copy that to my qwen-integration branch? \n\nI'm also interested in code generation models, so I'd love to get the finetune.py file from bigcode-project's starcoder repository onto my starcoder-integration branch to study how fine-tuning works.\n\nI want to keep my repo clean while I'm learning, so could you add a .gitignore file to main with: \"# Python cache and virtual environments\n__pycache__/\n*.pyc\n*.py.class\nvenv/\n*.env\n\n# Training artifacts\ncheckpoints/\nlogs/\n\n# Dataset caches\n.cache/\n.huggingface/\"\n\nOnce that's done, I'd like to practice making pull requests! Could you create one to merge qwen-integration into main? Title it \"Add Qwen integration notebook\" with the description \"Adding the Qwen notebook to start learning about this model architecture and training approach.\"`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-003',
    description:
      'Test case for creating a new repository with 5 branches and a PR',
    input: `I'm working on a comprehensive evaluation framework for video-based language models and need your help setting up the infrastructure. Could you create a new project repository named video-llm-evaluation-harness? I need to organize this research project with proper branching strategy, so please initialize the repository with 5 branches: dataset-integration, evaluation-framework, training-module, documentation, and main. \n\nFor the main branch, I'd like to start with a README.md file containing: \"# Video LLM Evaluation Harness\n\nA comprehensive framework for evaluating video-based large language models, including dataset integration, evaluation metrics, and training modules.\"\n\nI've identified some key components from existing research that would be valuable for our framework. Could you copy longvideobench_dataset.py from longvideobench's LongVideoBench repository to the dataset-integration branch? I also need lmm_judge.py from VideoAutoArena's VideoAutoArena repository on the evaluation-framework branch, and videollama2_trainer.py from DAMO-NLP-SG's VideoLLaMA 2 repository on the training-module branch.\n\nAdditionally, I need two custom utility files: metrics_calculator.py in the evaluation-framework branch with content \"# Metrics calculation utilities for video LLM evaluation\" and data_preprocessor.py in the dataset-integration branch with content \"# Data preprocessing utilities for video datasets\".\n\nTo keep our research environment clean, please add a .gitignore file in the main branch with: \"# Python cache and virtual environments\n__pycache__/\n*.pyc\n*.py.class\nvenv/\n*.env\n\n# Evaluation artifacts\nresults/\nlogs/\n\n# Dataset caches\n.cache/\n.huggingface/\"\n\nOnce everything is set up, I'd like to create a pull request to merge evaluation-framework into main with the title \"Add evaluation framework with LMM judge\" and description \"This PR implements the core evaluation framework with the LMM judge module for assessing video LLM performance.\" This will help me review the evaluation components before integrating them into the main codebase.`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-004',
    description:
      'Test case for creating a new repository with 3 branches and a PR',
    input: `For this assignment, I would like you to establish a new project repository named ai-code-reviewer. Please begin by initializing the repository with three branches: feature-analysis, feature-integration, and main. You should include an initial README.md file in the main branch with the content \"# AI Code Reviewer\n\nAn intelligent code review assistant that analyzes code quality, detects potential bugs, and suggests improvements using machine learning techniques.\". Next, please add code_analyzer.py in the feature-analysis branch with the content \"# Code analysis module\nimport ast\n\nclass CodeAnalyzer:\n    def __init__(self, code):\n        self.code = code\n        self.tree = ast.parse(code)\n\n    def analyze(self):\n        # TODO: Implement analysis logic\n        pass\". Additionally, create a .gitignore file in the main branch with the exact content: \"# Python cache and virtual environments\n__pycache__/\n*.pyc\n*.py.class\nvenv/\n*.env\n\n# Analysis results\nreports/\nlogs/\n\n# Model checkpoints\nmodels/\". Please copy train.py from bigcode-project's starcoder repository to the feature-integration branch. Finally, I would like you to create a pull request to merge feature-analysis into main with the title \"Add initial code analysis module\" and description \"This PR implements the basic code analysis module using AST parsing for initial code quality assessment.\"`,
    output: {
      contains: 'a',
    },
  },
];
