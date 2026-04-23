import { describe, it, expect } from 'vitest'
import { resolveVariables } from './variables.js'

describe('resolveVariables', () => {
  it('replaces known variables', () => {
    const result = resolveVariables('Hello {{name}}!', { name: 'World' })
    expect(result).toBe('Hello World!')
  })

  it('preserves unknown variables as-is', () => {
    const result = resolveVariables('{{known}} and {{unknown}}', { known: 'yes' })
    expect(result).toBe('yes and {{unknown}}')
  })

  it('replaces multiple occurrences of the same variable', () => {
    const result = resolveVariables('{{x}} + {{x}}', { x: '1' })
    expect(result).toBe('1 + 1')
  })

  it('handles multiple different variables', () => {
    const result = resolveVariables('{{a}}-{{b}}-{{c}}', { a: '1', b: '2', c: '3' })
    expect(result).toBe('1-2-3')
  })

  it('returns template unchanged when no variables provided', () => {
    const result = resolveVariables('no {{vars}} here', {})
    expect(result).toBe('no {{vars}} here')
  })

  it('handles empty template', () => {
    const result = resolveVariables('', { key: 'value' })
    expect(result).toBe('')
  })

  it('handles template with no placeholders', () => {
    const result = resolveVariables('plain text', { key: 'value' })
    expect(result).toBe('plain text')
  })

  it('replaces with empty string value', () => {
    const result = resolveVariables('before{{x}}after', { x: '' })
    expect(result).toBe('beforeafter')
  })
})
