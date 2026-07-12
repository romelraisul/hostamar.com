// Forked child for CodeActProvider JS execution.
// Runs untrusted JS inside a vm context with no access to require/module/process.
// Communicates the result back to the parent over IPC.
const vm = require('vm')

process.on('message', (msg) => {
  const code = msg && msg.code ? msg.code : ''
  try {
    const sandbox = {
      console: {
        log: () => {},
        error: () => {},
        warn: () => {},
      },
      Math,
      JSON,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      parseInt,
      parseFloat,
      isNaN,
      setTimeout,
      clearTimeout,
    }
    sandbox.globalThis = sandbox
    const context = vm.createContext(sandbox)
    // capture the last expression's value via a return wrapper
    const wrapped = `(function(){ ${code}\n; return (typeof __result !== 'undefined') ? __result : (typeof result !== 'undefined' ? result : undefined); })()`
    const output = vm.runInContext(wrapped, context, { timeout: 10000 })
    let serializable = output
    try {
      JSON.stringify(output)
    } catch {
      serializable = String(output)
    }
    process.send({ ok: true, output: serializable })
  } catch (err) {
    process.send({ ok: false, error: err && err.message ? err.message : String(err) })
  }
  // allow IPC to flush then exit
  setTimeout(() => process.exit(0), 50)
})
