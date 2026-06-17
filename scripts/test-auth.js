const http = require('http')

// First get CSRF token
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/csrf',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
}

const req = http.request(options, (res) => {
  let data = ''
  res.on('data', (chunk) => { data += chunk })
  res.on('end', () => {
    console.log('CSRF Response:', res.statusCode)
    const csrf = JSON.parse(data)
    console.log('CSRF Token:', csrf.csrfToken)
    
    // Now try to login
    const loginData = new URLSearchParams({
      email: 'admin@hostamar.com',
      password: 'admin123',
      csrfToken: csrf.csrfToken,
      callbackUrl: 'http://localhost:3000/dashboard',
      json: 'true'
    })

    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/callback/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(loginData.toString()),
        'Cookie': res.headers['set-cookie']?.join('; ') || ''
      }
    }

    const loginReq = http.request(loginOptions, (loginRes) => {
      let loginResponse = ''
      loginRes.on('data', (chunk) => { loginResponse += chunk })
      loginRes.on('end', () => {
        console.log('Login Response:', loginRes.statusCode)
        console.log('Location:', loginRes.headers.location)
        console.log('Set-Cookie:', loginRes.headers['set-cookie'])
      })
    })

    loginReq.write(loginData.toString())
    loginReq.end()
  })
})

req.end()
