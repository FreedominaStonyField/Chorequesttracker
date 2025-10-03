const fallbackIntros = [
  'Embrace the call to',
  'Rally courage and',
  'Traverse the homestead to',
  'Answer the banner to',
]

const fallbackEndings = [
  'before the sun rests.',
  'lest dust sprites grow bold.',
  'so the hall may gleam anew.',
  'and claim your rightful bounty.',
]

export function computeFlavorText(title: string, tags: string[]) {
  if (!title.trim()) return ''
  const lowered = title.toLowerCase()
  if (tags.includes('kitchen') || lowered.includes('dish')) {
    return 'Scour the porcelain relics to lift the sink’s ancient curse.'
  }
  if (tags.includes('trash') || lowered.includes('trash')) {
    return 'Banish the refuse before the midnight vermin muster.'
  }
  if (tags.includes('laundry') || lowered.includes('laundry')) {
    return 'Temper the fabric golems in suds and sun.'
  }
  const intro = fallbackIntros[Math.floor(Math.random() * fallbackIntros.length)]
  const ending = fallbackEndings[Math.floor(Math.random() * fallbackEndings.length)]
  const questNoun = title.replace(/^[a-z]/, (c) => c.toUpperCase())
  return `${intro} ${questNoun.toLowerCase()} ${ending}`
}
