import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../../apps/studio-client/src/shared/i18n/index.js'
import { parseProviderError, formatProviderErrorMessage } from '../../../apps/studio-client/src/shared/notifications/provider-error.js'

describe('Provider Error Parser', () => {
  const tZh = createTranslator('zh-CN')
  const tEn = createTranslator('en-US')

  it('correctly classifies HTTP 401 and invalid api key', () => {
    const err = new Error('Provider request failed (401): Incorrect API key provided: sk-proj-123')
    const parsed = parseProviderError(err)
    expect(parsed.messageKey).toBe('notify.provider.authInvalid')
    expect(parsed.statusCode).toBe(401)

    const formattedZh = formatProviderErrorMessage(err, tZh)
    expect(formattedZh.title).toContain('API Key 无效')

    const formattedEn = formatProviderErrorMessage(err, tEn)
    expect(formattedEn.title).toContain('API Key is invalid')
  })

  it('correctly classifies HTTP 429 quota exhaustion vs rate limit', () => {
    // 欠费与配额耗尽
    const quotaErr = Object.assign(new Error('Provider request failed (429)'), {
      statusCode: 429,
      responseBody: JSON.stringify({
        error: { message: 'You exceeded your current quota, please check your plan and billing details.', code: 'insufficient_quota' },
      }),
    })
    const parsedQuota = parseProviderError(quotaErr)
    expect(parsedQuota.messageKey).toBe('notify.provider.quotaExceeded')
    expect(parsedQuota.statusCode).toBe(429)
    expect(formatProviderErrorMessage(quotaErr, tZh).title).toContain('额度不足')

    // 普通速率限制
    const rateErr = new Error('Provider request failed (429): Rate limit reached for requests')
    const parsedRate = parseProviderError(rateErr)
    expect(parsedRate.messageKey).toBe('notify.provider.rateLimited')
    expect(formatProviderErrorMessage(rateErr, tZh).title).toContain('速率限制')
  })

  it('correctly classifies HTTP 404 model not found', () => {
    const err = Object.assign(new Error('Provider request failed (404)'), {
      statusCode: 404,
      responseBody: JSON.stringify({
        error: { message: 'The model `gpt-5-not-exist` does not exist', code: 'model_not_found' },
      }),
    })
    const parsed = parseProviderError(err)
    expect(parsed.messageKey).toBe('notify.provider.modelNotFound')
    expect(formatProviderErrorMessage(err, tZh).title).toContain('模型不存在')
  })

  it('correctly classifies context overflow in 400', () => {
    const err = new Error('Provider request failed (400): This model maximum context length is 128000 tokens. However, your messages resulted in 135000 tokens.')
    const parsed = parseProviderError(err)
    expect(parsed.messageKey).toBe('notify.provider.contextOverflow')
    expect(formatProviderErrorMessage(err, tZh).title).toContain('超出模型最大限制')
  })

  it('correctly classifies 503 overloaded and generic 5xx', () => {
    const overloadedErr = Object.assign(new Error('Provider request failed (503): Overloaded'), { statusCode: 503 })
    expect(parseProviderError(overloadedErr).messageKey).toBe('notify.provider.upstreamOverloaded')

    const badGatewayErr = Object.assign(new Error('Provider request failed (502)'), { statusCode: 502 })
    const parsed = parseProviderError(badGatewayErr)
    expect(parsed.messageKey).toBe('notify.provider.upstreamFailed')
    expect(formatProviderErrorMessage(badGatewayErr, tZh).title).toContain('HTTP 502')
  })

  it('correctly classifies network and TLS failures', () => {
    const dnsErr = Object.assign(new Error('Provider host could not be resolved'), { name: 'ProviderDnsError' })
    expect(parseProviderError(dnsErr).messageKey).toBe('notify.provider.networkDns')

    const timeoutErr = Object.assign(new Error('Provider connection timed out'), { name: 'ProviderConnectTimeoutError' })
    expect(parseProviderError(timeoutErr).messageKey).toBe('notify.provider.networkTimeout')

    const tlsErr = Object.assign(new Error('Provider TLS validation failed'), { name: 'ProviderTlsError' })
    expect(parseProviderError(tlsErr).messageKey).toBe('notify.provider.networkTls')

    const streamErr = new Error('Provider stream ended before completion')
    expect(parseProviderError(streamErr).messageKey).toBe('notify.provider.streamInterrupted')
  })
})
