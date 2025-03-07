#!/usr/bin/env node
console.log("================================================================");
console.log("To complete the installation of custom-domain-nginx, please install");
console.log("the helper shell script manually.");
console.log("");
console.log("Run the following commands:");
console.log("");
console.log("  sudo cp ./node_modules/custom-domain-nginx/bin/setup_domain.sh /usr/local/bin/setup_domain.sh");
console.log("  sudo chmod +x /usr/local/bin/setup_domain.sh");
console.log("");
console.log("Then, configure passwordless sudo for the helper script by running:");
console.log("  sudo visudo");
console.log("and adding the following line (replace 'nodejs' with your process user if needed):");
console.log("  nodejs ALL=(ALL) NOPASSWD: /usr/local/bin/setup_domain.sh");
console.log("================================================================");