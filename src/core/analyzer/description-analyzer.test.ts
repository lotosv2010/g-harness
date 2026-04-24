import { describe, it, expect } from 'vitest'
import { analyzeDescription } from './description-analyzer.js'

describe('analyzeDescription', () => {
  it('空描述 → unknown + 无领域', () => {
    const r = analyzeDescription('')
    expect(r.appType).toBe('unknown')
    expect(r.domain).toBeNull()
    expect(r.features).toEqual([])
    expect(r.suggestedModules).toEqual([])
  })

  it('电商关键词 → 电商领域 + 相关模块', () => {
    const r = analyzeDescription('一个面向 B2C 的商城系统，支持购物车与支付')
    expect(r.domain).toBe('电商')
    expect(r.suggestedModules).toContain('product')
    expect(r.suggestedModules).toContain('payment')
    expect(r.features).toContain('支付集成')
  })

  it('后台管理 → web-app + 权限模块', () => {
    const r = analyzeDescription('内部后台管理系统，需要权限与角色')
    expect(r.appType).toBe('web-app')
    expect(r.domain).toBe('后台管理')
    expect(r.features).toContain('权限控制')
    expect(r.features).toContain('角色管理')
  })

  it('框架提示生效（无描述文本时）', () => {
    const r = analyzeDescription('', { framework: 'Next.js' })
    expect(r.appType).toBe('fullstack')
  })

  it('API 描述优先于框架', () => {
    const r = analyzeDescription('后端 API 服务', { framework: 'React' })
    expect(r.appType).toBe('api')
  })

  it('full-stack 描述', () => {
    const r = analyzeDescription('fullstack 管理台 API')
    expect(r.appType).toBe('fullstack')
  })

  it('mobile 描述', () => {
    const r = analyzeDescription('一个 iOS 和 android 的移动端 app')
    expect(r.appType).toBe('mobile')
  })

  it('desktop / cli / library', () => {
    expect(analyzeDescription('使用 electron 的桌面应用').appType).toBe('desktop')
    expect(analyzeDescription('一个命令行 scaffold 工具').appType).toBe('cli')
    expect(analyzeDescription('一个 SDK 组件库').appType).toBe('library')
  })
})
