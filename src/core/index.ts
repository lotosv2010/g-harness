#!/usr/bin/env node

import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { validateCommand } from './commands/validate.js'
import { contextCommand } from './commands/context.js'
import { migrateCommand } from './commands/migrate.js'
import { checkCommand } from './commands/check.js'
import { indexCommand } from './commands/index-cmd.js'

const program = new Command()

program
  .name('g-harness')
  .description('AI 驱动的工程化规范框架 CLI（Harness Engineering）')
  .version('0.1.0')

program.addCommand(initCommand)
program.addCommand(validateCommand)
program.addCommand(contextCommand)
program.addCommand(migrateCommand)
program.addCommand(checkCommand)
program.addCommand(indexCommand)

export function run(): void {
  program.parse()
}

run()
