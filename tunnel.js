const localtunnel = require('localtunnel');

(async () => {
  const tunnel = await localtunnel({ port: 3000, subdomain: 'noc-hub' });
  console.log(`Tunnel live at: ${tunnel.url}`);
  tunnel.on('close', () => {
    console.log('Tunnel closed, exiting...');
    process.exit(1);
  });
})();
