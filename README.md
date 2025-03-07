# custom-domain-nginx

**custom-domain-nginx** is a Node.js module that automates per-domain Nginx configuration and SSL certificate setup using a helper shell script. It issues (or renews) SSL certificates via Certbot, generates an Nginx configuration file, enables the configuration (via symbolic links), and reloads Nginx—all with a single command. This package supports user configuration via environment variables.

> **Note:**  
> - This package requires that Nginx and Certbot are installed and properly configured on your system.  
> - Some operations require elevated privileges. For secure non-interactive operation, please configure passwordless sudo for the helper script as described below.  
> - The helper shell script is installed (copied to `/usr/local/bin`) automatically during postinstall if run with sudo.

## Features

- **Automated Certificate Issuance/Renewal:**  
  Issues or renews SSL certificates using Certbot (skips issuance if a valid certificate exists).
  
- **Dynamic Nginx Configuration:**  
  Generates an Nginx config file for the specified domain and creates the necessary symbolic links.

- **Configurable Options:**  
  Override default Nginx paths, proxy destination, and certificate renewal thresholds via environment variables.

- **Integrated Helper Script:**  
  Privileged operations are delegated to a shell script that is installed to `/usr/local/bin`.

## Installation

Install the package via npm:

```bash
npm install custom-domain-nginx
```

**Postinstall Note:**
The package includes a postinstall script that copies the helper shell script (`bin/setup_domain.sh`) to `/usr/local/bin/setup_domain.sh` and makes it executable. This step requires sudo privileges during installation. If you encounter issues, you may also install the helper script manually (see "Helper Script Installation" below).

## Helper Script Installation (Manual Option)
If you prefer to manually install the shell script, run:

```bash
sudo cp ./node_modules/custom-domain-nginx/bin/setup_domain.sh /usr/local/bin/setup_domain.sh
sudo chmod +x /usr/local/bin/setup_domain.sh
```

Then configure passwordless sudo for the helper script by editing the sudoers file:

```bash
sudo visudo
```

Add the following line (replace `nodejs` with the user running your Node.js process if needed):

```bash
nodejs ALL=(ALL) NOPASSWD: /usr/local/bin/setup_domain.sh
```

## Usage

**Using the Node.js API**

Import the `addDomain` function in your Node.js application:

```javascript
const { addDomain } = require('custom-domain-nginx');

(async () => {
  try {
    // Using default configuration
    await addDomain('example.com');
    console.log('Domain setup completed!');
    
    // With configuration overrides:
    await addDomain('sub.example.com', {
      nginxAvailablePath: '/custom/path/sites-available/',
      nginxEnabledPath: '/custom/path/sites-enabled/',
      proxyPass: 'http://127.0.0.1:4000',
      renewThreshold: 45, // days
      // scriptPath can be overridden if you installed the helper script elsewhere.
      scriptPath: '/usr/local/bin/setup_domain.sh'
    });
    console.log('Subdomain setup completed with custom config!');
  } catch (error) {
    console.error('Error setting up domain:', error);
  }
})();
```

**Environment Variable Overrides**

The helper shell script supports the following environment variables (with defaults):

- **NGINX_AVAILABLE_PATH:**  Path where the Nginx configuration file will be written.

  Default: `/etc/nginx/sites-available/` 
  
- **NGINX_ENABLED_PATH:** Path where the symlink will be created to enable the configuration.

  Default: `/etc/nginx/sites-enabled/`

- **PROXY_PASS:** The upstream proxy destination for your backend (e.g., your Express.js app).

  Default: `http://127.0.0.1:3000`

- **RENEW_THRESHOLD:** The minimum number of days the certificate must be valid before skipping issuance/renewal.

  Default: `30` (days)

You can set these variables in your Node.js code by passing them in via the userConfig object (as shown in the usage example) or by setting them in your shell environment before running your Node.js application.

## How It Works

1. **Certificate Management**:
The helper shell script checks if a certificate already exists for the domain in `/etc/letsencrypt/live/<domain>/fullchain.pem`. It uses OpenSSL to determine if the certificate is valid for more than the specified `RENEW_THRESHOLD` days. If the certificate is expiring soon or not present, Certbot is used to issue (or renew) the certificate.

2. **Nginx Configuration**:
The script generates an Nginx configuration file. For apex domains (e.g., `example.com`), it automatically adds a `www.example.com` alias. For subdomains, only the specified domain is used.

3. **Deployment**:
The configuration file is written to the path specified by `NGINX_AVAILABLE_PATH` and a symbolic link is created in `NGINX_ENABLED_PATH`. Finally, Nginx is tested and reloaded.

## Contributing

Contributions, issues, and feature requests are welcome!

Feel free to open issues or submit pull requests. Please ensure that any contributions adhere to established coding standards and security best practices.

## License

This project is licensed under the MIT License.