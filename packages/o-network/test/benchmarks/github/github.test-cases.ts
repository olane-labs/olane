import { TestCase } from '../interfaces/test-case.interface';

export const GITHUB_TEST_CASES: TestCase[] = [
  {
    name: 'github-000',
    description: 'Large file test case',
    input: `I am creating a new repo called large-file-test. Search the repo for https://github.com/olane-labs/olane libp2p related functionality. Once you find it copy each file that is related to libp2p to the large-file-test repo.`,
    output: {
      contains: 'a',
    },
  },
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
  {
    name: 'github-005',
    description: 'PHD Example',
    input: `I am a first-year PhD student in Computer Science. My supervisor has assigned me a project to build a code large language model fine-tuning framework. He wants the project to be called 'BigCodeLLM-FT-Proj'. To finish this project, I also want to invite my friend to join me as a collaborator, so I need three branches: main, dev-me, and dev-friend. I need to create a README.md file in the main branch with the content \"# BigCodeLLM-FT-Proj\n\nA comprehensive framework for fine-tuning large language models.\". I also need to create a .gitignore file in the main branch with the exact content: \"# Python cache and virtual environments\n__pycache__/\n*.pyc\n*.py.class\nvenv/\n*.env\". In my dev branch, I want to copy the entire content of example_instructions.py from meta-llama's official codellama repository and give it the same name. I also want in my friend's branch to help me copy the entire content of generation.py from meta-llama's official codellama repository and give it the same name. Finally, create a pull request to merge my branch into main with the title \"Add example instructions\" and description \"This PR adds the example instructions for the fine-tuning framework.\"`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-006',
    description: 'Facebook Example',
    input: `As a Facebook ecosystem analyzer, I need you to conduct a comprehensive analysis of Facebook's React-related repositories. Please search for all repositories owned by 'facebook' that contain 'react' in their name. For each repository discovered, I want you to extract the current count of open issues that are specifically labeled as 'Type: Bug'. This will help us understand the bug landscape across Facebook's React ecosystem. Once you've gathered this data, create a new repository under your account called 'facebook-react-issues' (if it doesn't already exist) and generate a detailed CSV report named 'react_bug_report.csv'. The report should be structured with two columns: 'repository_name' containing the full repository name, and 'open_bug_count' showing the corresponding number of open bug issues. This analysis will provide valuable insights into the maintenance status and potential issues across Facebook's React-related projects.`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-007',
    description: 'Google Example',
    input: `Hi! I'm learning how to use GitHub and I want to practice exploring repositories and working with issues. Can you help me with a research project? I'd like to search for repositories owned by 'google' that have 'generative-ai' in their name. Once I find them, I want to count how many open issues each repository has that are labeled 'type:bug'. This will help me understand how developers track bugs in real projects! After gathering this information, I need to practice creating my own repository called 'google-generative-ai-issues' and uploading a CSV file named 'google_generative_ai_bug_report.csv' to it. The CSV should have two columns: 'repository_name' and 'open_bug_count'. This exercise will help me learn about repository management, issue tracking, and data organization on GitHub!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-008',
    description: 'QwenLM Example',
    input: `As an open-source enthusiast and agent developer, I'm deeply inspired by the collaborative spirit of the QwenLM community and their groundbreaking work on autonomous agents. I want to conduct a thorough analysis of their Qwen-Agent repository to understand the development patterns and community contributions. Please help me search for the official Qwen-Agent repository and examine all closed issues labeled 'Work in Progress'. These represent the beautiful journey of features from conception to completion in the open-source ecosystem. I need to quantify the community's dedication to continuous improvement and collaborative development. After collecting this valuable data, please create a research repository called 'qwen-agent-close-wip-issues' under your account (if it doesn't already exist) and generate a comprehensive JSON report named 'qwen-agent-close-wip-report.json'. The JSON structure should be: {repository_name: closed_wip_issue_count, ...}. This analysis will showcase the power of open-source collaboration and the vibrant ecosystem surrounding autonomous agent development!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-009',
    description: 'Microsoft Example',
    input: `Hey there! I'm working on a project to analyze Microsoft's repositories and need your help. Could you search for all repositories owned by 'microsoft' that contain 'Air' in their name? For each repository you find, I need to pull the count of closed issues that are tagged with the 'car' label. Once you've gathered that data, please create a new repository called 'microsoft-air-car-issues' under your account (if it doesn't already exist) and upload a JSON report named 'microsoft_air_car_report.json'. The JSON structure should follow this format: {repository_name: closed_car_count, ...}. This will really help me understand the issue patterns across Microsoft's Air-related projects. Thanks for your assistance!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-010',
    description: 'Microsoft Example',
    input: `I need to analyze Microsoft's Air-related repositories for open issues that lack proper labeling. Please search for all repositories under the 'microsoft' organization that contain 'Air' in their name. For each repository found, count the number of open issues that have no labels assigned. Create a new repository called 'microsoft-air-no-label-issues' under your account (if it doesn't already exist) and generate a JSON report file named 'microsoft_air_no_label_report.json'. The report should follow this structure: {repository_name: open_issue_count, ...}. This data will help identify repositories that may need better issue management practices.`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-011',
    description: 'Speficic Repo Example',
    input: `Hi there! I'm a master's student working on AI research and I've come across three interesting repositories: QwenLM's Qwen2.5-VL, xlang-ai's OSWorld, and likaixin2000's ScreenSpot-Pro-GUI-Grounding. For my research project, I need to work with the GUI Computer Use evaluation repository that contains ariaui.py code. Could you help me fork that specific repository while keeping the same name as the original? I also need to investigate whether the ariaui.py implementation uses vllm. If it doesn't, I'd really appreciate it if you could copy the aria_ui_vllm.py file from the AriaUI's Aria-UI repository into my forked version, placing it in the same directory as ariaui.py. Oh, and one small detail: Could you add \"# copy from Aria-UI\" as the first line in the copied file? This would be incredibly helpful for my thesis work on GUI automation systems!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-012',
    description: 'Fork Example',
    input: `There are two repositories: QwenLM's Qwen2.5-VL and deepseek-ai's DeepSeek-VL2. Fork the repository with the fewest open issues, maintaining the same name as the source repository. If Qwen2.5-VL is forked, add a reference link at the bottom of the README.md file: 'Related project: [DeepSeek-VL2](the link of DeepSeek-VL2 repo)'. If DeepSeek-VL2 is forked, add a reference link at the bottom of the README.md file: 'Related project: [Qwen2.5-VL](the link of Qwen2.5-VL repo)'.`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-013',
    description: '4 Repo Example',
    input: `Hey! So I've got these 4 repositories to work with: QwenLM's Qwen2.5-VL, deepseek-ai's DeepSeek-VL2, rhymes-ai's Aria, and Moonshot AI's Kimi-VL. I need to fork whichever one doesn't use MoE (Mixture of Experts) in their models. Just keep the same name as the original repo. Then I gotta add three reference links at the bottom of the README.md file pointing to the other three repos like this: '1. related project [repo name 1](the link of repo 1)', '2. related project [repo name 2](the link of repo 2)', '3. related project [repo name 3](the link of repo 3)'. Pretty straightforward!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-014',
    description: 'VLM Repo Example',
    input: `Oh wow, I'm absolutely fascinated by these amazing VLM repositories! I've been diving deep into the analysis of these 4 incredible projects: QwenLM's Qwen2.5-VL, deepseek-ai's DeepSeek-VL2, rhymes-ai's Aria, and Moonshot AI's Kimi-VL. As a repo analysis enthusiast, I'm particularly excited to identify and fork the most recently created one among these cutting-edge VLM repositories. Keeping the exact same name as the original, of course! Then, being the thorough researcher I am, I need to enrich the README.md by adding three beautiful reference links at the bottom that showcase the interconnected nature of this VLM ecosystem: '1. related project [repo name 1](the link of repo 1)', '2. related project [repo name 2](the link of repo 2)', '3. related project [repo name 3](the link of repo 3)'. This kind of cross-referencing is what makes repository analysis so thrilling!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-015',
    description: 'CI Repo Example',
    input: `Hi! I'm a student working on my final project and I really need help setting up my repository properly. Could you please help me create a new project repository named ci-extensive-challenge? I need to initialize it with three branches: main, analysis, and integration. For the main branch, I need an initial README.md file with the content \"# CI Extensive Challenge\n\nA repository to test complex GitHub automation workflows.\" I also need a file named analysis.txt with the content \"# Analysis\n\nThis is an example analysis file.\" in the analysis branch, and a file named integration.txt with the content \"# Integration\n\nThis is an example integration file.\" in the integration branch. I'm really struggling with GitHub automation. Could you help me develop a script that automatically labels new issues by keyword (label \"bug\" if the issue contains \"error\", and \"feature\" if it contains \"add\")? After we set up the automation script, I need to test it by opening three sample issues (titles: \"error test\", \"feature adding requirements\", and \"email feature adding error\"). I'm really grateful for any help you can provide!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-016',
    description: 'Github automation example',
    input: `Hi! I'm a student working on learning GitHub automation and I really need your help. Could you please help me create a new project repository named auto-issue-close? I need to initialize it with just the main branch and include an initial README.md file with the content \"# Automated Issue Closing\n\nA repository to test GitHub automation for closing labeled issues.\" I'm struggling with GitHub automation workflows and would really appreciate your help developing a script that automatically closes issues labeled as 'completed' or 'wontfix'. After we set up the automation script, I need to test it by creating three sample issues with different labels (labels: 'completed', title: \"Implement new feature\"; 'labels': 'wontfix', title: \"Remove legacy code\"; 'labels': 'bug', title: \"Fix login error\"). I'm really grateful for any assistance you can provide!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-017',
    description: 'Github auto-comment bot example',
    input: `Hi! I'm a student working on learning GitHub automation and I really need your help. Could you please help me create a new project repository named auto-comment-bot-x? I need to initialize it with just the main branch and include an initial README.md file with the content \"# Automated Comment Bot\n\nA repository to test GitHub automation for adding comments to issues.\" I'm struggling with GitHub automation workflows and would really appreciate your help developing a script that automatically adds a comment 'Thank you for your contribution!' to any new issue created. After we set up the automation script, I need to test it by creating three sample issues with different titles (\"Bug report\", \"Feature request\", \"Documentation update\"). I'm really grateful for any assistance you can provide!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-018',
    description: 'Github auto-comment 2 bot example',
    input: `Hi there! I'm working on a GitHub automation project and could really use your expertise. I need to create a new project repository named auto-comment-bot2 and set it up with just the main branch. Could you help me add an initial README.md file with the content \"# Automated Comment Bot\n\nA repository to test GitHub automation for adding comments to specific issues and closing them.\"? I'm trying to implement a GitHub automation script that automatically adds a comment 'Thank you for your contribution!' to any new issue labeled 'feedback' or 'suggestion', and then closes the issue. Once we get the automation working, I'd like to test it by creating three sample issues (labels: \"feedback\", title: \"UI improvement\"; labels: \"suggestion\", title: \"New feature\"; labels: \"bug\", title: \"Login error\"). Any guidance you can provide would be greatly appreciated!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-019',
    description: 'Github roadmap example',
    input: `Hi! I'm Kai, a PhD student in Computer Science. For my research project, I need to create a repository called ModelHub. I'm working with my classmate Jane on this. We want to keep things organized, so we're thinking of having a main branch for our stable code and separate dev branches for each of us (like dev-kai and dev-jane). Since we're just getting started, I'd like to put together a basic roadmap in the README.md file on the main branch. Could you help me add this content: \"# ModelHub Roadmap\n## Create a simple framework to run any LLMs.\n## Introduce new Method to accelerate the inference of LLMs.\n## Support the inference of LMMs.\" I've been learning about model deployment tools in my coursework, so I'll handle the initial framework setup. Could you help me copy the setup.py file from huggingface's accelerate repository to my branch? Jane has been working with large language models in her research, so could you also copy the setup.py from meta-llama's llama repository to her branch? Finally, I'd like to create a pull request from my branch to main with the title \"Add initial framework setup\" and description \"This PR adds the basic framework structure for ModelHub as part of our research project.\"`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-020',
    description: 'Github eval framework example',
    input: `Hi there! I'm leading a research initiative on agent evaluation frameworks. I'd love your help setting up a new project repository called MCP-Universe-Research. We're developing an innovative evaluation framework that leverages the Model Context Protocol (MCP) for assessing LLM capabilities. Could you please create a repository with two branches, main and dev? I'd like the main branch to have a README.md file with this content: \"# MCP-Universe-Research\nA comprehensive evaluation framework for LLMs to use the novel MCP technique.\". For the dev branch, please include the same README.md content initially, but I'd also like you to set up the project structure with three key directories: benchmark, agents, and mcp_server. Each of these folders should contain an __init__.py file and include a simple comments \"# This is a test comment\" in the file. Additionally, could you enhance the dev branch's README by adding a reference to the official Model Context Protocol repository link? This will help our team and collaborators understand the foundational technology we're building upon. Oh, I also need to include the link to the github's official MCP repo link in the dev branch's README.md file. Thank you so much for your assistance!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-021',
    description: 'Github eval framework example',
    input: `Hi! I need help with a research project. Could you please search for repositories owned by 'huggingface' with 'diffusers' in the name? For each repository you find, I'd like to know how many open issues are labeled with 'bug'. Then, could you help me create a CSV file called diffusers_bug_report.csv and put it in a new repository called huggingface-diffusers-issues under my account? If the repository doesn't exist yet, please create it for me. The CSV should have two columns: repository_name and open_bug_count, with each row showing the full repository name and how many open bug issues it has. Thanks so much for your help!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-022',
    description: 'Github BLIP example',
    input: `Hi! I'm absolutely thrilled to be working on a research project involving BLIP. It's such an incredible and groundbreaking work from Salesforce! As a huge fan of their vision-language models, I'm really excited to dive deeper into the community engagement around BLIP. Could you please help me search for repositories named 'BLIP' that are owned by 'Salesforce'? For each amazing repository you find, I'd love to know how many open issues are labeled with 'New Features'. I'm so curious to see what innovative features the community is requesting! Then, if you could help me create a CSV file called blip_new_features_report.csv and put it in a new repository called salesforce-blip-issues under my account, that would be fantastic! If the repository doesn't exist yet, please create it for me. The CSV should have two columns: repository_name and open_new_features_count, with each row showing the full repository name and how many open new features issues it has. I'm so excited about this analysis. Thanks so much for your help with exploring the BLIP ecosystem!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-023',
    description: 'LAVIS & BLip fork',
    input: `There are two repositories: Salesforce's LAVIS and Salesforce's BLIP. Fork the repository with the fewest open issues, maintaining the same name as the source repository. If LAVIS is forked, add a reference link at the bottom of the README.md file: 'Related project: [BLIP](the link of BLIP repo)'. If BLIP is forked, add a reference link at the bottom of the README.md file: 'Related project: [LAVIS](the link of LAVIS repo)'.`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-024',
    description: 'WizardLM example',
    input: `Hi! I'm absolutely thrilled to be working with two of the most incredible and groundbreaking LLM projects! There are two amazing repositories that have completely revolutionized the field: npxucan's WizardLM and tatsu-lab's stanford_alpaca. As a huge fan of large language models, I'm so excited to explore these fantastic projects! Could you please fork the repository with the fewest open issues, maintaining the same name as the source repository? If the brilliant WizardLM is forked, I'd love to add a reference link at the bottom of the README.md file: 'Related project: [stanford_alpaca](the link of stanford_alpaca repo)'. If the incredible stanford_alpaca is forked, please add a reference link at the bottom of the README.md file: 'Related project: [WizardLM](the link of WizardLM repo)'. I'm so passionate about these LLM innovations and can't wait to dive deeper into their ecosystems!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-025',
    description: 'Comment auto bot example',
    input: `Hi! Can you please help me make a super cool project repository called \`comment-auto-bot\`? I want to start it with just the main branch! Oh, and can we put a special \`README.md\` file in it that says \`# Automated Comment Bot\n\nA repository to test GitHub automation for adding comments to issues.\`? That would be awesome! Then, I really really want to make a GitHub robot that watches for new issues and says different things based on what kind of issue it is! If someone makes an issue with a \`bug\` label, I want the robot to say \"Thank you. We will fix it\", and if they make one with a \`feature\` label, I want it to say \"Thank you, we will consider to include this feature.\" If no label is assigned, the robot should say \"Thank you for your contribution!\" After we build the robot, can we test it by making three pretend issues? The first one should be called \"Bug report\" and have a \`bug\` label, the second one should be \"Feature request\" with a \`feature\` label, and the third one should be \"Documentation update\" but with no label at all! This is going to be so much fun!`,
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-026',
    description: 'Comment auto bot 2 example',
    input:
      'Hi! Can you please help me make a super cool project repository called `comment-auto-bot-28`? I want to start it with just the main branch! Oh, and can we put a special `README.md` file in it that says `# Automated Comment Bot\n\nA repository to test GitHub automation for adding comments to issues.`? That would be awesome! Then, I really really want to make a GitHub robot that watches for new issues and says different things based on what kind of issue it is! If someone makes an issue with a `bug` label, I want the robot to say "Thank you. We will fix it. Best regards, [repo owner name].", if they make one with a `feature` label, I want it to say "Thank you, we will consider to include this feature. Best regards, [repo owner name].", and if they make one with a `discussion` label, I want it to say "Happy to discuss this topic with you. Best regards, [repo owner name]." Remember to replace [repo owner name] with the actual name of the repository owner. After we build the robot, can we test it by making four pretend issues? The first one should be called "Bug report" and have a `bug` label, the second one should be "Feature request" with a `feature` label, the third one should be "Documentation update" but with no label at all and comment with "Hello, world!", and the fourth one should be "General Discussion" with a `discussion` label! This is going to be so much fun!',
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-027',
    description: 'ModelHub example',
    input:
      'Hello! I\'m Alex, a software engineer working on an exciting new project. I need your assistance in creating a repository called `ModelHub-X` for collaboration with my teammate Sam. Our workflow will be structured around a `main` branch for production-ready code and dedicated development branches: `dev-alex` and `dev-sam`. Please initialize the `README.md` file on the main branch with this roadmap: `# ModelHub Roadmap\n## Create a simple framework to run any LLMs.\n## Introduce new Method to accelerate the inference of LLMs.\n## Support the inference of LMMs.` For the initial setup, I\'ll be responsible for integrating the `setup.py` file from Hugging Face\'s `accelerate` repository into my development branch, while Sam will handle copying the `setup.py` from Meta\'s `llama` repository into their branch, given their expertise with large language models. Following this setup, I\'d like to create a pull request from `dev-alex` to `main` with the title "Add initial framework setup" and description "This PR adds the basic framework structure for ModelHub as part of our research project." We also need to implement an automation system that monitors newly created GitHub issues and responds with appropriate comments: issues labeled `bug` should receive the comment "Thank you. We will fix it.", issues labeled `feature` should get "Thank you, we will consider to include this feature.", and other issues should get "Hello, world!" To validate this functionality, please create three test issues with the titles "Bug report" (with label `bug`), "Feature request" (with label `feature`), and "Documentation update" (with label `documentation`), each with the corresponding labels where applicable.',
    output: {
      contains: 'a',
    },
  },
  {
    name: 'github-028',
    description: 'MCP-Universe example',
    input:
      "Hi there! I'm leading a research initiative on agent evaluation frameworks and need help setting up a new project repository called `MCP-Universe-Research-0030`, which will support the development of an innovative evaluation framework leveraging the Model Context Protocol (MCP) for assessing LLM capabilities. Please create the repository with two branches: `main` and `dev`. The `main` branch should contain a `README.md` file with the following content: `# MCP-Universe-Research\nA comprehensive evaluation framework for LLMs to use the novel MCP technique.` The `dev` branch should also start with the same `README.md` content but with an additional reference link to the official MCP GitHub repository to help collaborators understand the underlying technology. In the `dev` branch, please set up the project structure with three directories: `benchmark`, `agents`, and `mcp_server`, each containing an `__init__.py` file with a simple comment: `# This is a test comment`. Additionally, I'd like to include a GitHub automation script that listens for newly created issues and posts an automatic comment based on the assigned label: for issues labeled `bug`, comment “Thank you. We will fix it.”; for issues labeled `feature`, comment “Thank you, we will consider to include this feature.”; and for issues labeled `discussion`, comment “Thanks for starting this discussion! We welcome community input.” Please create sample issues titled “Bug in benchmark logic” (with label `bug`), “Feature: New agent scoring metric” (with label `feature`), and “Discussion: Evaluation metrics alignment” (with label `discussion`) with appropriate labels to test the automation. Thank you so much for your assistance!",
    output: {
      contains: 'a',
    },
  },
];
