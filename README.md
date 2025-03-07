# custom-domain-nginx

**custom-domain-nginx** is a Node.js module that automates per-domain Nginx configuration and SSL certificate setup using Certbot. It streamlines the process of adding custom domains to your multi-tenant application by:

- Issuing SSL certificates via Certbot.
- Generating Nginx configuration files.
- Enabling configurations by creating symbolic links.
- Testing and reloading Nginx.

With sensible defaults and the option to override settings (e.g., Nginx paths, commands, proxy destination), this module is flexible enough to work in various server environments.

## Features

- **Automated Certificate Issuance:**  
  Uses Certbot to automatically generate SSL certificates for your custom domains.
  
- **Dynamic Nginx Config Generation:**  
  Automatically writes and enables Nginx configuration files tailored for each domain.
  
- **Customizable:**  
  Override default paths, commands, and settings via an optional configuration object.
  
- **Error Handling & Basic Validation:**  
  Provides basic domain validation and robust error handling for a smoother integration.

## Installation

Install via npm:

```bash
npm install custom-domain-nginx
```

## Usage
Import the module and call the addDomain function in your Node.js application:

```javascript
// CommonJS usage
const { addDomain } = require('custom-domain-nginx');

(async () => {
  try {
    // Using default configuration
    await addDomain('yourcustomdomain.com');
    console.log('Domain setup completed!');
  } catch (error) {
    console.error('Error setting up domain:', error);
  }
})();
```

Or, with a custom configuration override:

```javascript
const { addDomain } = require('custom-domain-nginx');

(async () => {
  try {
    await addDomain('anotherdomain.com', {
      nginxAvailablePath: '/custom/path/sites-available/',
      nginxEnabledPath: '/custom/path/sites-enabled/',
      proxyPass: 'http://127.0.0.1:4000',
      nginxTestCmd: 'sudo /usr/local/nginx/sbin/nginx -t',
      nginxReloadCmd: 'sudo /usr/local/nginx/sbin/nginx -s reload',
    });
    console.log('Domain setup with custom config completed!');
  } catch (error) {
    console.error('Error setting up domain:', error);
  }
})();
```

# API Documentation

## Function: `addDomain(domain, [userConfig])`

This function adds a custom domain with optional user configuration settings.

### Parameters

- **`domain`** (`string`):  
  The custom domain (e.g., `example.com`). The module performs basic validation to ensure a valid domain is provided.

- **`userConfig`** (`object`, optional):  
  An object that allows you to override default configuration options. The available keys include:

  - **`nginxAvailablePath`** (`string`):  
    Path to the Nginx sites-available directory.  
    **Default:** `/etc/nginx/sites-available/`

  - **`nginxEnabledPath`** (`string`):  
    Path to the Nginx sites-enabled directory.  
    **Default:** `/etc/nginx/sites-enabled/`

  - **`nginxTestCmd`** (`string`):  
    Command used to test the Nginx configuration.  
    **Default:** `sudo nginx -t`

  - **`nginxReloadCmd`** (`string`):  
    Command used to reload Nginx.  
    **Default:** `sudo systemctl reload nginx`

  - **`certbotCommand`** (`function(domain: string) => string`):  
    A function that returns the Certbot command for certificate issuance.  
    **Default:** Issues certificates for both `domain` and `www.domain`.

  - **`proxyPass`** (`string`):  
    The upstream proxy destination for your backend server (e.g., your ExpressJS app).  
    **Default:** `http://127.0.0.1:3000`

  - **`sslCertificatePath`** (`function(domain: string) => string`):  
    Function to determine the SSL certificate file path.  
    **Default:** `/etc/letsencrypt/live/{domain}/fullchain.pem`

  - **`sslCertificateKeyPath`** (`function(domain: string) => string`):  
    Function to determine the SSL certificate key file path.  
    **Default:** `/etc/letsencrypt/live/{domain}/privkey.pem`

## Security Considerations

- **Elevated Privileges:**  
  This module executes system commands using `sudo`. Ensure your environment is secure and that only trusted users have access to run this code.

- **Domain Validation:**  
  Basic domain validation is included. Enhance validation if your production environment requires stricter checks.

- **Server Environment:**  
  Intended for use on Linux-based servers with Nginx and Certbot installed. Test in a staging environment before deploying to production.

## Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to open issues or submit pull requests.  
Please ensure any contributions adhere to the established coding standards.

## License
This project is licensed under the MIT License.