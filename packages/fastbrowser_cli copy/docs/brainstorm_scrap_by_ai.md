# 
- home page
- search page
  - search for "machine learning"
  - collect all the job offers links
  - pagination


---
## Idea
- the user describe a task in natural language to perform on a website
- the LLM agent brainstorms a plan to perform the task, and identifies which tools it
- then generate a script of commands to execute the plan, and execute them one by one, until the task is done. 
  - this scripts is done without AI
- or maybe generate a SKILL.md to easily navigate the site by AI


## Applied to webcome to the jungle
- from the homepage, discover the job search page
- discovert all the option to filter the job offers
- get all the job offers links on a page
- being able to navigate the pagination to get more job offers links
- on a given job offer pages, get the job description, the company name, the location, the seniority level, the date of publication, etc.
  - TODO a command to convert the a11y tree to a JSON format
  - then play with jq

## New commands
- `get_children` - --selector, --limit, --with-ancestors
  - possible by selector language ? yes
- get link with an url starting with "https://www.welcometothejungle.com/fr/companies/"
  - on a https://www.welcometothejungle.com/fr/jobs?refinementList%5Boffices.country_code%5D%5B%5D=FR&query=machine%20learning&page=7
  - `npx tsx ./src/fastbrowser_cli/fastbrowser_cli.ts query_selectors_all --selector 'RootWebArea > link[url^="https://www.welcometothejungle.com/fr/companies/"]'`