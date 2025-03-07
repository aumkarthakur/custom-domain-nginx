const { writeFile } = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Validate the given domain.
 * This basic regex validates typical domains such as "example.com" or "sub.example.co.uk".
 *
 * @param {string} domain
 * @returns {boolean}
 */
function validateDomain(domain) {
  const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Default configuration options.
 */
const defaultConfig = {
  nginxAvailablePath: '/etc/nginx/sites-available/', // Must include trailing slash.
  nginxEnabledPath: '/etc/nginx/sites-enabled/',       // Must include trailing slash.
  nginxTestCmd: 'sudo nginx -t',
  nginxReloadCmd: 'sudo systemctl reload nginx',
  certbotCommand: (domain) =>
    `sudo certbot certonly --nginx -d ${domain} -d www.${domain}`,
  proxyPass: 'http://127.0.0.1:3000',
  sslCertificatePath: (domain) =>
    `/etc/letsencrypt/live/${domain}/fullchain.pem`,
  sslCertificateKeyPath: (domain) =>
    `/etc/letsencrypt/live/${domain}/privkey.pem`,
};

/**
 * Issue an SSL certificate using Certbot for the given domain.
 *
 * @param {string} domain - The custom domain (e.g., "yogastudio.com").
 * @param {object} config - Configuration options.
 * @throws {Error} If certificate issuance fails.
 */
async function issueCertificate(domain, config) {
  const command = config.certbotCommand(domain);
  console.log(`Issuing certificate for ${domain}...`);
  try {
    const { stdout } = await execAsync(command);
    console.log(`Certificate issued for ${domain}:\n${stdout}`);
  } catch (error) {
    throw new Error(`Error issuing certificate: ${error.message}`);
  }
}

/**
 * Generate an Nginx configuration for the given domain using the provided config.
 *
 * @param {string} domain - The custom domain.
 * @param {object} config - Configuration options.
 * @returns {string} The Nginx configuration content.
 */
function generateNginxConfig(domain, config) {
  return `
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name ${domain} www.${domain};
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ${domain} www.${domain};

    ssl_certificate ${config.sslCertificatePath(domain)};
    ssl_certificate_key ${config.sslCertificateKeyPath(domain)};
    
    # Recommended SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass ${config.proxyPass};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
`;
}

/**
 * Write the generated Nginx configuration to the sites-available directory.
 *
 * @param {string} domain - The custom domain.
 * @param {object} config - Configuration options.
 * @throws {Error} If writing the file fails.
 */
async function writeNginxConfig(domain, config) {
  const configContent = generateNginxConfig(domain, config);
  const configPath = `${config.nginxAvailablePath}${domain}`;

  try {
    await writeFile(configPath, configContent, { flag: 'w' });
    console.log(`Nginx config for ${domain} written successfully at ${configPath}.`);
  } catch (err) {
    throw new Error(`Error writing config for ${domain}: ${err.message}`);
  }
}

/**
 * Create (or update) a symbolic link in the sites-enabled directory to enable the site.
 *
 * @param {string} domain - The custom domain.
 * @param {object} config - Configuration options.
 * @throws {Error} If creating the symbolic link fails.
 */
async function enableNginxConfig(domain, config) {
  const src = `${config.nginxAvailablePath}${domain}`;
  const dest = `${config.nginxEnabledPath}${domain}`;

  try {
    await execAsync(`sudo ln -sf ${src} ${dest}`);
    console.log(`Nginx config for ${domain} enabled at ${dest}.`);
  } catch (error) {
    throw new Error(`Error enabling config for ${domain}: ${error.message}`);
  }
}

/**
 * Test the Nginx configuration and reload Nginx if the test passes.
 *
 * @param {object} config - Configuration options.
 * @throws {Error} If the Nginx configuration test or reload fails.
 */
async function testAndReloadNginx(config) {
  try {
    await execAsync(config.nginxTestCmd);
    console.log(`Nginx configuration test passed. Reloading...`);
    await execAsync(config.nginxReloadCmd);
    console.log('Nginx reloaded successfully.');
  } catch (error) {
    throw new Error(`Nginx configuration test failed: ${error.message}`);
  }
}

/**
 * Automates the process of adding a custom domain by:
 *   1. Issuing an SSL certificate.
 *   2. Writing the Nginx configuration.
 *   3. Enabling the configuration.
 *   4. Testing and reloading Nginx.
 *
 * @param {string} domain - The custom domain (e.g., "yogastudio.com").
 * @param {object} [userConfig={}] - Optional configuration overrides.
 * @returns {Promise<void>} Resolves when the domain setup completes successfully.
 */
async function addDomain(domain, userConfig = {}) {
  if (typeof domain !== 'string' || !validateDomain(domain)) {
    throw new Error(`Invalid domain provided: ${domain}`);
  }
  
  // Merge user-provided config with defaults.
  const config = { ...defaultConfig, ...userConfig };

  try {
    await issueCertificate(domain, config);
    await writeNginxConfig(domain, config);
    await enableNginxConfig(domain, config);
    await testAndReloadNginx(config);
    console.log(`Domain ${domain} setup completed successfully.`);
  } catch (error) {
    throw new Error(`Failed to set up domain ${domain}: ${error.message}`);
  }
}

module.exports = { addDomain };
