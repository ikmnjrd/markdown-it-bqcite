import MarkdownIt from 'markdown-it'
import Token from 'markdown-it/lib/token'

const defaultOptions = {
  attributionPrefix: '---'
}

function arrayReplaceAt(src: Token[], pos: number, newElements: Token[]) {
  return ([] as Token[]).concat(
    src.slice(0, pos),
    newElements,
    src.slice(pos + 1)
  )
}

function bqcite(md: MarkdownIt, options_?: typeof defaultOptions) {
  let options = Object.assign({}, defaultOptions)
  options = Object.assign(options, options_)

  md.renderer.rules.blockquote_cite_open = () => '<cite>'
  md.renderer.rules.blockquote_cite_close = () => '</cite>'

  md.core.ruler.push('bqcite', (state) => {
    let baseLevel = 0
    let inlineWatcherFlag = false

    const tokens = state.tokens
    for (let idx = 0; idx < tokens.length; idx++) {
      const token = tokens[idx]

      if (!inlineWatcherFlag) {
        if (token.type !== 'blockquote_open') {
          continue
        } else {
          inlineWatcherFlag = true
          continue
        }
      } else if (token.type === 'inline') {
        const children = token.children

        if (!children) continue

        for (const [index, childToken] of children.entries()) {
          if (childToken.content.startsWith(options.attributionPrefix)) {
            baseLevel = childToken.level
            const test = singleQuoteLineTokens(childToken.content)
            token.children = arrayReplaceAt(children, index, test)

            token.content = token.content
              .replace(options.attributionPrefix, '')
              .trimStart()
          }
        }
      }
    }

    function singleQuoteLineTokens(quoteLine: string) {
      const trimmedQuoteLine = quoteLine.trimStart()

      if (trimmedQuoteLine.startsWith(options.attributionPrefix)) {
        const quoteLineWithoutPrefix = trimmedQuoteLine
          .replace(options.attributionPrefix, '')
          .trimStart()

        return [
          citationOpeningToken(baseLevel + 1),
          inlineToken(quoteLineWithoutPrefix, baseLevel + 2),
          citationClosingToken(baseLevel + 1)
        ]
      }
      return [inlineToken(quoteLine, baseLevel)]
    }

    function citationOpeningToken(level: number) {
      return citationToken('blockquote_cite_open', level, 1)
    }

    function citationClosingToken(level: number) {
      return citationToken('blockquote_cite_close', level, -1)
    }

    function citationToken(
      name: string,
      level: number,
      nesting: Token.Nesting
    ) {
      const token = new state.Token(name, 'cite', nesting)
      token.tag = 'cite'
      token.level = level
      token.block = true

      return token
    }

    function paragraphOpeningToken(level: number) {
      return paragraphToken(level, 1)
    }

    function paragraphClosingToken(level: number) {
      return paragraphToken(level, -1)
    }

    function inlineToken(content: string, level: number) {
      const token = new state.Token('text', '', 0)
      token.content = content
      token.level = level
      token.block = true
      return token
    }

    function paragraphToken(level: number, nesting: Token.Nesting) {
      const token = new state.Token('paragraph_open', 'p', nesting)
      token.level = level
      token.block = true
      return token
    }
  })
}

export default bqcite
