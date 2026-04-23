import { Command } from 'commander'
import pc from 'picocolors'

export const migrateCommand = new Command('migrate')
  .description('规范版本升级时迁移配置文件')
  .option('--from <version>', '源版本')
  .option('--to <version>', '目标版本')
  .option('--dry-run', '仅预览迁移方案')
  .action((_options) => {
    console.log(pc.yellow('gforge migrate 尚未实现，敬请期待。'))
  })
