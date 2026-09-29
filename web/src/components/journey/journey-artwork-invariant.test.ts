import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Journey Artwork 1:1 Invariant Tests (recap-journey-design.md §0.4)', () => {
  const journeyDir = path.resolve(__dirname)
  const cssFiles = fs
    .readdirSync(journeyDir)
    .filter((f) => f.endsWith('.module.css'))

  it('css dosyaları taranabilir durumda', () => {
    expect(cssFiles.length).toBeGreaterThan(0)
  })

  it('hiçbir journey css dosyasında aspect-ratio: auto bulunmamalıdır', () => {
    const violations: { file: string; line: number; content: string }[] = []

    for (const file of cssFiles) {
      const fullPath = path.join(journeyDir, file)
      const content = fs.readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, idx) => {
        if (/aspect-ratio\s*:\s*auto/i.test(line)) {
          violations.push({ file, line: idx + 1, content: line.trim() })
        }
      })
    }

    expect(
      violations,
      `aspect-ratio: auto ihlali tespit edildi: ${JSON.stringify(violations, null, 2)}`,
    ).toEqual([])
  })

  it('artwork/kapak kurallarında aspect-ratio olmaksızın object-fit: cover bulunmamalıdır', () => {
    const violations: { file: string; block: string }[] = []

    // Arka plan veya dekoratif efektler için istisna class'lar
    const allowedClasses = ['decorativeBackdrop', 'vinylSilhouette', 'bgAmbient', 'unifiedScrim']

    for (const file of cssFiles) {
      const fullPath = path.join(journeyDir, file)
      const content = fs.readFileSync(fullPath, 'utf-8')

      // Basit CSS kural bloklarını ayıkla: selector { body }
      const ruleRegex = /([^{]+)\{([^}]+)\}/g
      let match: RegExpExecArray | null

      while ((match = ruleRegex.exec(content)) !== null) {
        const selector = match[1]!.trim()
        const body = match[2]!

        if (/object-fit\s*:\s*cover/i.test(body)) {
          const isAllowed = allowedClasses.some((cls) => selector.includes(cls))
          const hasSquareAspect = /aspect-ratio\s*:\s*1(\s*\/\s*1)?/i.test(body)

          if (!isAllowed && !hasSquareAspect) {
            violations.push({
              file,
              block: `${selector} { ${body.replace(/\s+/g, ' ').trim()} }`,
            })
          }
        }
      }
    }

    expect(
      violations,
      `Kare oran garantisi olmayan object-fit: cover kullanımı tespit edildi: ${JSON.stringify(violations, null, 2)}`,
    ).toEqual([])
  })
})
