import { Command } from 'commander'
import pc from 'picocolors'

export const contextCommand = new Command('context')
  .description('管理 CLAUDE.md 上下文文件')
  .addCommand(
    new Command('sync')
      .description('分析项目结构，更新所有 CLAUDE.md')
      .action(() => {
        console.log(pc.yellow('gforge context sync 尚未实现，敬请期待。'))
      }),
  )
  .addCommand(
    new Command('check')
      .description('检查 CLAUDE.md 是否与代码结构一致')
      .action(() => {
        console.log(pc.yellow('gforge context check 尚未实现，敬请期待。'))
      }),
  )
