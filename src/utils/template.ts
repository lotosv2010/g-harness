import { readFile } from 'node:fs/promises'

export async function readTemplate(templatePath: string): Promise<string> {
  return readFile(templatePath, 'utf-8')
}
