import http from 'http'

// Simple load test script
const CONFIG = {
  baseUrl: process.env.TARGET_URL || 'http://localhost:3000',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS || '50'),
  requestsPerUser: parseInt(process.env.REQUESTS_PER_USER || '20'),
  duration: parseInt(process.env.TEST_DURATION || '60'), // seconds
  endpoints: [
    '/',
    '/api/dashboard/stats',
    '/api/videos/generate',
    '/api/subscription',
    '/api/payment/create',
    '/api/analytics'
  ]
}

interface TestResult {
  endpoint: string
  totalRequests: number
  successful: number
  failed: number
  avgResponseTime: number
  maxResponseTime: number
  minResponseTime: number
  errors: string[]
}

class LoadTester {
  private results: Map<string, TestResult> = new Map()
  private totalRequests = 0
  private totalSuccessful = 0
  private totalFailed = 0
  private allResponseTimes: number[] = []

  constructor() {
    CONFIG.endpoints.forEach(endpoint => {
      this.results.set(endpoint, {
        endpoint,
        totalRequests: 0,
        successful: 0,
        failed: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        errors: []
      })
    })
  }

  private makeRequest(endpoint: string): Promise<{ status: number; time: number; error?: string }> {
    return new Promise((resolve) => {
      const url = CONFIG.baseUrl + endpoint
      const start = Date.now()

      const req = http.get(url, (res) => {
        const time = Date.now() - start
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, time })
        })
      })

      req.on('error', (err) => {
        const time = Date.now() - start
        resolve({ status: 0, time, error: err.message })
      })

      req.setTimeout(10000, () => {
        req.destroy()
        resolve({ status: 0, time: 10000, error: 'Timeout' })
      })
    })
  }

  private async runUser(endpoint: string) {
    for (let i = 0; i < CONFIG.requestsPerUser; i++) {
      const result = await this.makeRequest(endpoint)
      const stats = this.results.get(endpoint)!

      stats.totalRequests++
      this.totalRequests++

      if (result.status >= 200 && result.status < 400) {
        stats.successful++
        this.totalSuccessful++
      } else {
        stats.failed++
        this.totalFailed++
        if (result.error && !stats.errors.includes(result.error)) {
          stats.errors.push(result.error)
        }
      }

      stats.avgResponseTime = (stats.avgResponseTime * (stats.totalRequests - 1) + result.time) / stats.totalRequests
      stats.maxResponseTime = Math.max(stats.maxResponseTime, result.time)
      stats.minResponseTime = Math.min(stats.minResponseTime, result.time)
      this.allResponseTimes.push(result.time)
    }
  }

  async run(): Promise<void> {
    console.log('🚀 Starting load test...')
    console.log(`   Target: ${CONFIG.baseUrl}`)
    console.log(`   Concurrent users: ${CONFIG.concurrentUsers}`)
    console.log(`   Requests per user: ${CONFIG.requestsPerUser}`)
    console.log('')

    const startTime = Date.now()
    const promises: Promise<void>[] = []

    // Distribute users across endpoints
    const usersPerEndpoint = Math.ceil(CONFIG.concurrentUsers / CONFIG.endpoints.length)

    for (let i = 0; i < CONFIG.concurrentUsers; i++) {
      const endpoint = CONFIG.endpoints[i % CONFIG.endpoints.length]
      promises.push(this.runUser(endpoint))
    }

    await Promise.all(promises)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    // Print results
    console.log('='.repeat(60))
    console.log('📊 LOAD TEST RESULTS')
    console.log('='.repeat(60))
    console.log(`Total time: ${elapsed}s`)
    console.log(`Total requests: ${this.totalRequests}`)
    console.log(`Successful: ${this.totalSuccessful} (${((this.totalSuccessful / this.totalRequests) * 100).toFixed(1)}%)`)
    console.log(`Failed: ${this.totalFailed} (${((this.totalFailed / this.totalRequests) * 100).toFixed(1)}%)`)
    console.log('')

    console.log('PER-ENDPOINT RESULTS:')
    console.log('-'.repeat(60))

    for (const [_, stats] of this.results) {
      console.log(`\n📍 ${stats.endpoint}`)
      console.log(`   Requests: ${stats.totalRequests}`)
      console.log(`   Success: ${stats.successful} | Failed: ${stats.failed}`)
      console.log(`   Avg response time: ${stats.avgResponseTime.toFixed(0)}ms`)
      console.log(`   Min/Max: ${stats.minResponseTime === Infinity ? 'N/A' : stats.minResponseTime}ms / ${stats.maxResponseTime}ms`)
      if (stats.errors.length > 0) {
        console.log(`   Errors: ${stats.errors.join(', ')}`)
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    const avgOverall = this.allResponseTimes.reduce((a, b) => a + b, 0) / this.allResponseTimes.length
    const p95 = this.allResponseTimes.sort((a, b) => a - b)[Math.floor(this.allResponseTimes.length * 0.95)]
    console.log(`📈 Overall avg response time: ${avgOverall.toFixed(0)}ms`)
    console.log(`📈 95th percentile: ${p95}ms`)
    console.log(`📈 Requests/second: ${(this.totalRequests / parseFloat(elapsed)).toFixed(1)}`)

    if (this.totalFailed === 0) {
      console.log('\n✅ ALL TESTS PASSED!')
    } else {
      console.log(`\n⚠️ ${this.totalFailed} requests failed`)
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const tester = new LoadTester()
  tester.run().catch(console.error)
}

export { LoadTester }