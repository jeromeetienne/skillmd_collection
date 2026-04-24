#!/usr/bin/env npx tsx

import { Command } from 'commander'
import { AnalystCommand } from './commands/analyst_command.js'
import { ModelerCommand } from './commands/modeler_command.js'
import { PlannerCommand } from './commands/planner_command.js'

const program = new Command()
program
	.name('business_analyst_cli')
	.description('Unified CLI for the Business Analyst agent (modeler / analyst / planner)')

program.addCommand(AnalystCommand.build())
program.addCommand(ModelerCommand.build())
program.addCommand(PlannerCommand.build())

program.parseAsync().catch(err => {
	console.error(err)
	process.exit(1)
})
