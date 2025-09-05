const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'Marquardt Inventory Management',
  script: path.join(__dirname, '..', 'server.js')
});

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', function(){
  console.log('Service uninstalled successfully!');
  console.log('Marquardt Inventory Management service removed');
});

svc.on('error', function(err){
  console.error('Uninstall error:', err);
});

console.log('Uninstalling Marquardt Inventory Management service...');
svc.uninstall();