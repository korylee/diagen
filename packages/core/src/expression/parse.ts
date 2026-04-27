type TokenType = 'number' | 'identifier' | 'plus' | 'minus' | 'star' | 'slash' | 'lparen' | 'rparen' | 'comma' | 'eof'

interface Token {
  type: TokenType
  value?: string
  index: number
}

export type ExpressionAst = LiteralAst | VariableAst | UnaryAst | BinaryAst | CallAst

interface LiteralAst {
  type: 'literal'
  value: number
}

interface VariableAst {
  type: 'variable'
  name: string
}

interface UnaryAst {
  type: 'unary'
  operator: '-'
  argument: ExpressionAst
}

interface BinaryAst {
  type: 'binary'
  operator: '+' | '-' | '*' | '/'
  left: ExpressionAst
  right: ExpressionAst
}

interface CallAst {
  type: 'call'
  callee: string
  args: ExpressionAst[]
}

export interface EvaluateExpressionOptions {
  getVar: (name: string) => number
  callFunction: (name: string, args: number[]) => number
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function isIdentifierStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
}

function isIdentifierChar(ch: string): boolean {
  return isIdentifierStart(ch) || isDigit(ch)
}

function tokenizeExpression(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    const ch = input[i]

    if (/\s/.test(ch)) {
      i++
      continue
    }

    if (isDigit(ch) || (ch === '.' && isDigit(input[i + 1] ?? ''))) {
      const start = i
      let hasDot = ch === '.'
      i++
      while (i < input.length) {
        const next = input[i]
        if (isDigit(next)) {
          i++
          continue
        }
        if (next === '.' && !hasDot) {
          hasDot = true
          i++
          continue
        }
        break
      }

      const literal = input.slice(start, i)
      tokens.push({ type: 'number', value: literal, index: start })
      continue
    }

    if (isIdentifierStart(ch)) {
      const start = i
      i++
      while (i < input.length && isIdentifierChar(input[i])) {
        i++
      }
      tokens.push({ type: 'identifier', value: input.slice(start, i), index: start })
      continue
    }

    const map: Record<string, TokenType> = {
      '+': 'plus',
      '-': 'minus',
      '*': 'star',
      '/': 'slash',
      '(': 'lparen',
      ')': 'rparen',
      ',': 'comma',
    }
    const tokenType = map[ch]
    if (tokenType) {
      tokens.push({ type: tokenType, index: i })
      i++
      continue
    }

    throw new Error(`Invalid token "${ch}" at position ${i}`)
  }

  tokens.push({ type: 'eof', index: input.length })
  return tokens
}

class ExpressionParser {
  private pos = 0

  constructor(private readonly tokens: Token[]) {}

  parse(): ExpressionAst {
    const ast = this.parseAdditive()
    this.expect('eof')
    return ast
  }

  private current(): Token {
    return this.tokens[this.pos]
  }

  private advance(): Token {
    const token = this.current()
    this.pos++
    return token
  }

  private match(type: TokenType): boolean {
    if (this.current().type !== type) return false
    this.advance()
    return true
  }

  private expect(type: TokenType): Token {
    const token = this.current()
    if (token.type !== type) {
      throw new Error(`Expected ${type} at position ${token.index}`)
    }
    return this.advance()
  }

  private parseAdditive(): ExpressionAst {
    let left = this.parseMultiplicative()
    while (true) {
      if (this.match('plus')) {
        const right = this.parseMultiplicative()
        left = { type: 'binary', operator: '+', left, right }
        continue
      }
      if (this.match('minus')) {
        const right = this.parseMultiplicative()
        left = { type: 'binary', operator: '-', left, right }
        continue
      }
      break
    }
    return left
  }

  private parseMultiplicative(): ExpressionAst {
    let left = this.parseUnary()
    while (true) {
      if (this.match('star')) {
        const right = this.parseUnary()
        left = { type: 'binary', operator: '*', left, right }
        continue
      }
      if (this.match('slash')) {
        const right = this.parseUnary()
        left = { type: 'binary', operator: '/', left, right }
        continue
      }
      break
    }
    return left
  }

  private parseUnary(): ExpressionAst {
    if (this.match('minus')) {
      return {
        type: 'unary',
        operator: '-',
        argument: this.parseUnary(),
      }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): ExpressionAst {
    const token = this.current()
    if (token.type === 'number') {
      this.advance()
      return {
        type: 'literal',
        value: Number(token.value),
      }
    }

    if (token.type === 'identifier') {
      return this.parseIdentifier()
    }

    if (this.match('lparen')) {
      const expression = this.parseAdditive()
      this.expect('rparen')
      return expression
    }

    throw new Error(`Unexpected token "${token.type}" at position ${token.index}`)
  }

  private parseIdentifier(): ExpressionAst {
    const identifier = this.expect('identifier').value as string

    if (this.match('lparen')) {
      const args: ExpressionAst[] = []
      if (!this.match('rparen')) {
        args.push(this.parseAdditive())
        while (this.match('comma')) {
          args.push(this.parseAdditive())
        }
        this.expect('rparen')
      }

      return {
        type: 'call',
        callee: identifier,
        args,
      }
    }

    return {
      type: 'variable',
      name: identifier,
    }
  }
}

export function parseExpressionAst(expr: string): ExpressionAst {
  const tokens = tokenizeExpression(expr)
  const parser = new ExpressionParser(tokens)
  return parser.parse()
}

export function evaluateExpressionAst(ast: ExpressionAst, context: EvaluateExpressionOptions): number {
  if (ast.type === 'literal') return ast.value
  if (ast.type === 'variable') return context.getVar(ast.name)
  if (ast.type === 'unary') return -evaluateExpressionAst(ast.argument, context)
  if (ast.type === 'binary') {
    const left = evaluateExpressionAst(ast.left, context)
    const right = evaluateExpressionAst(ast.right, context)
    if (ast.operator === '+') return left + right
    if (ast.operator === '-') return left - right
    if (ast.operator === '*') return left * right
    return left / right
  }

  const args = ast.args.map(arg => evaluateExpressionAst(arg, context))
  return context.callFunction(ast.callee, args)
}
