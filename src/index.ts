import MarkdownIt from 'markdown-it'
import Token from 'markdown-it/lib/token'

const defaultOptions = {
  attributionPrefix: '---'
}

function bqcite(md: MarkdownIt, options_?: typeof defaultOptions) {
  const arrayReplaceAt = md.utils.arrayReplaceAt
  let options = Object.assign({}, defaultOptions)
  options = Object.assign(options, options_)

  md.renderer.rules.blockquote_cite_open = function (
    tokens,
    idx,
    options /*, env */
  ) {
    return '<cite>'
  }
  md.renderer.rules.blockquote_cite_close = () => '</cite>'

  const coreRules = md.core.ruler.getRules('')
  const inlineRules = md.inline.ruler.getRules('')
  const blockRules = md.block.ruler.getRules('')
  console.log(coreRules, inlineRules, blockRules)

  md.core.ruler.before('inline', 'bqcite', (state) => {
    let bqTokens: Token[] = []
    let isInBlockquote = false

    const tokens = state.tokens

    for (let idx = 0; idx < tokens.length; idx++) {
      const token = tokens[idx]

      if (token.type === 'blockquote_open') {
        isInBlockquote = true
        continue
      } else if (token.type === 'blockquote_close') {
        isInBlockquote = false
        console.log('#############')
        console.log('bqTokens:', bqTokens)
        // bqTokensを処理するfunc
        makeCiteInBlockquote(bqTokens)
        bqTokens = []
        continue
      }

      if (isInBlockquote) {
        bqTokens = bqTokens.concat(token)
      }
    }

    // md.renderInline(tokens)

    /**
     * @description Blockquote内のTokenを
     * @param _tokens
     */
    function makeCiteInBlockquote(_tokens: Token[]) {
      // 1個しか見つからない想定
      const inlineTokens = extractInlineToken(_tokens)

      for (const _inlineToken of inlineTokens) {
        // atten
        const orgContent = _inlineToken.content
        const regexWithWhitespace = new RegExp(
          options.attributionPrefix + '\\s+',
          'g'
        )

        let startFlag = false
        let followingOne = ''
        let inCiteTokens: Token[] = []
        let theOtherTokens: Token[] = []

        if (!_inlineToken.children) continue

        _inlineToken.children.forEach((child) => {
          if (!startFlag) {
            // contentが '--- hoge' となる場合とcontent '---'の後のTokenにaタグなどのTokenが続く場合がある。
            if (child.content.startsWith(options.attributionPrefix)) {
              startFlag = true

              // attributionPrefixに続く文字があれば切り出し
              followingOne = child.content.replace(regexWithWhitespace, '')
              // 内容があれば、citeタグ内のタグとしてカウント
              if (followingOne) {
                inCiteTokens = inCiteTokens.concat(child)
              }
            } else {
              theOtherTokens = theOtherTokens.concat(child)
            }
          } else {
            inCiteTokens = inCiteTokens.concat(child)
          }
        })

        // '\n'で分割して、---前と---後に分けて処理を行う。---前はテキストとしてciteの外(手前)、---後はciteの中
        const splitedBqContent = orgContent.split('\n')
        const beforePrefixContent = splitedBqContent.filter(
          (c) => !c.startsWith(options.attributionPrefix)
        )
        const theOtherInlineToken = inlineToken(
          theOtherTokens.map((t) => {
            t.level = _inlineToken.level + 3
            return t
          }),
          beforePrefixContent.join('\n'),
          _inlineToken.level + 2
        )

        const inCiteInlineToken = inlineToken(
          sandwichInCitation(
            inCiteTokens,
            followingOne,
            beforePrefixContent.join('\n'),
            _inlineToken.level + 3
          ),
          followingOne,
          _inlineToken.level + 2
        )

        inCiteInlineToken.content = followingOne

        // 新しいchildren(2つ固定)
        // _inlineToken.children = [theOtherInlineToken, inCiteInlineToken]
        const parsed = state.md.parse(
          orgContent.replace(regexWithWhitespace, ''),
          state.env
        )
        console.log('parsed', parsed)
        _inlineToken.children = parsed.map((t) => {
          levelUpToken(t, _inlineToken.level)
          return t
        })
        console.log(...parsed)

        _inlineToken.content = orgContent.replace(regexWithWhitespace, '')
      }
    }
    function levelUpToken(_token: Token, level: number) {
      _token.level = _token.level + level
      _token.children?.forEach((child) => {
        levelUpToken(child, level + 1)
      })
      return _token
    }

    /**
     * @description markdown-it's blockquote must have paragraph_open and paragraph_close. So, extract inline token
     */
    function extractInlineToken(_tokens: Token[]) {
      return _tokens.filter((t) => t.type === 'inline')
    }
    /**
     *
     * @param _tokens
     * @param insertWord
     * @param orgContent
     * @returns
     */
    function sandwichInCitation(
      _tokens: Token[],
      insertWord: string,
      beforeWords: string,
      level: number
    ) {
      // もっとスマートにする
      if (_tokens.length === 0) return []

      const levelUpTokens: Token[] = _tokens.map((t) => {
        t.level = t.level + 1
        return t
      })
      // const beforeTokens: Token[] = beforeWords.map((w) =>
      //   textToken(w, baseLevel)
      // )
      const piyo = new state.Token('text', '', 0)
      piyo.content = 'piyooooooooooo'

      if (insertWord) {
        const inlineChildren: Token[] = [
          textToken(insertWord, level + 1),
          ...levelUpTokens
        ]
        return [
          textToken(beforeWords, level),
          citationOpeningToken(level),
          inlineToken(inlineChildren, insertWord, level + 1),
          citationClosingToken(level),
          piyo
        ]
      } else {
        const inlineChildren = levelUpTokens
        return [
          textToken(beforeWords, level),
          citationOpeningToken(level),
          inlineToken(inlineChildren, insertWord, level + 1),
          citationClosingToken(level),
          piyo
        ]
      }
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
    function textToken(content: string, level: number) {
      const token = new state.Token('text', '', 0)
      token.content = content
      token.level = level
      token.block = false
      return token
    }
    function inlineToken(
      children: Token[] | null,
      content: string,
      level: number
    ) {
      const token = new state.Token(children ? 'inline' : 'text', '', 0)
      token.content = content
      token.children = children
      token.level = level
      token.block = !!children
      return token
    }
  })
}

export default bqcite
