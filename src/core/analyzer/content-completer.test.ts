import { describe, it, expect } from 'vitest'
import { completeContent } from './content-completer.js'
import { analyzeDescription } from './description-analyzer.js'
import type { ScanResult } from '../scanner/project-scanner.js'

function mockScan(framework: string | null = null): ScanResult {
  return {
    techStack: {
      language: 'TypeScript',
      runtime: 'Node.js',
      framework,
      buildTool: null,
      testRunner: null,
      packageManager: null,
    },
    structure: {
      rootDir: '/tmp/fake',
      isMonorepo: false,
      packages: [],
      srcDir: 'src',
    },
    existingConfig: {
      hasClaudeMd: false,
      hasAgentsMd: false,
      hasEslint: false,
      hasTsConfig: true,
    },
  }
}

describe('completeContent', () => {
  it('电商项目 → 定位 + 模块 + 非功能需求', () => {
    const desc = '一个 B2C 商城，支持购物车和支付'
    const analysis = analyzeDescription(desc)
    const r = completeContent({
      projectName: 'shop',
      projectDescription: desc,
      analysis,
      scanResult: mockScan('Next.js'),
    })
    expect(r.projectPositioning).toContain('shop')
    expect(r.projectPositioning).toContain('电商')
    expect(r.moduleBreakdown).toContain('product')
    expect(r.moduleBreakdown).toContain('payment')
    expect(r.nfrHints).toContain('支付回调签名校验')
  })

  it('空描述不会崩溃，产出占位内容', () => {
    const analysis = analyzeDescription('')
    const r = completeContent({
      projectName: 'demo',
      projectDescription: '',
      analysis,
      scanResult: mockScan(null),
    })
    expect(r.projectPositioning).toContain('demo')
    expect(r.moduleBreakdown).toContain('（请补充）')
  })

  it('API 项目 → 分层说明体现在 architectureOverview', () => {
    const desc = '一个后端 API 服务'
    const analysis = analyzeDescription(desc)
    const r = completeContent({
      projectName: 'svc',
      projectDescription: desc,
      analysis,
      scanResult: mockScan('NestJS'),
    })
    expect(r.architectureOverview).toContain('路由层')
    expect(r.architectureOverview).toContain('NestJS')
  })

  it('presetFragment 覆盖默认分层与模块', () => {
    const analysis = analyzeDescription('后台管理系统')
    const r = completeContent({
      projectName: 'admin',
      projectDescription: '后台管理系统',
      analysis,
      scanResult: mockScan('Next.js'),
      presetFragment: {
        architectureLayers: '**分层：** app → Server Component → Service',
        defaultModules: ['app', 'components', 'lib'],
        structureHint: 'src/\n├── app/\n├── components/\n└── lib/',
        extraNfr: ['Server Component 禁用浏览器 API'],
      },
    })
    expect(r.architectureOverview).toContain('Server Component')
    expect(r.moduleBreakdown).toContain('app')
    expect(r.moduleBreakdown).toContain('lib')
    expect(r.projectStructureHint).toContain('src/\n├── app/')
    expect(r.nfrHints).toContain('NFR-03')
    expect(r.nfrHints).toContain('Server Component 禁用浏览器 API')
  })
})
