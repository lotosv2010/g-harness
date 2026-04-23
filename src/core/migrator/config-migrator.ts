export interface MigrateOptions {
  targetDir: string
  fromVersion: string
  toVersion: string
}

export interface MigrateResult {
  migrated: string[]
  manualRequired: string[]
}

export class ConfigMigrator {
  async migrate(_options: MigrateOptions): Promise<MigrateResult> {
    // TODO: 实现配置文件迁移逻辑
    return { migrated: [], manualRequired: [] }
  }
}
