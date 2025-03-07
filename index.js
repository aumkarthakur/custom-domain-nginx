// index.js (CommonJS version)
const { spawn } = require('child_process');

/**
 * Validate the given domain.
 * This simple regex checks for domains like "example.com" or "sub.example.com".
 *
 * @param {string} domain
 * @returns {boolean}
 */
function validateDomain(domain) {
  const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Automates the process of adding a custom domain by calling a shell script.
 *
 * @param {string} domain - The custom domain (e.g., "example.com" or "sub.example.com").
 * @param {object} [userConfig={}] - Optional configuration overrides.
 *   Supported keys (will be passed as environment variables):
 *     - nginxAvailablePath (NGINX_AVAILABLE_PATH)
 *     - nginxEnabledPath (NGINX_ENABLED_PATH)
 *     - proxyPass (PROXY_PASS)
 *     - renewThreshold (RENEW_THRESHOLD)
 *     - scriptPath: The full path to the setup shell script (default: "/usr/local/bin/setup_domain.sh")
 * @returns {Promise<void>} Resolves when the domain setup completes successfully.
 */
function addDomain(domain, userConfig = {}) {
  return new Promise((resolve, reject) => {
    if (typeof domain !== 'string' || !validateDomain(domain)) {
      return reject(new Error(`Invalid domain provided: ${domain}`));
    }
    const scriptPath = userConfig.scriptPath || '/usr/local/bin/setup_domain.sh';

    // Map allowed userConfig keys to corresponding environment variable names.
    const envOverrides = {};
    if (userConfig.nginxAvailablePath) envOverrides.NGINX_AVAILABLE_PATH = userConfig.nginxAvailablePath;
    if (userConfig.nginxEnabledPath) envOverrides.NGINX_ENABLED_PATH = userConfig.nginxEnabledPath;
    if (userConfig.proxyPass) envOverrides.PROXY_PASS = userConfig.proxyPass;
    if (userConfig.renewThreshold) envOverrides.RENEW_THRESHOLD = String(userConfig.renewThreshold);

    // Merge with current process.env.
    const env = { ...process.env, ...envOverrides };

    // Call the shell script with sudo.
    const proc = spawn('sudo', [scriptPath, domain], { stdio: 'inherit', env });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`setup_domain.sh exited with code ${code}`));
      }
    });
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = { addDomain };
