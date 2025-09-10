const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'Marquardt Inventory Management',
  description: 'Marquardt India Inventory Management System - Web Application',
  script: path.join(__dirname, '..', 'server.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: {
    name: "NODE_ENV",
    value: "production"
  }
});

// Listen for the "install" event, which indicates the process is available as a service.
svc.on('install', function(){
  console.log('Service installed successfully!');
  console.log('Starting Marquardt Inventory Management service...');
  svc.start();
});

svc.on('start', function(){
  console.log('Service started successfully!');
  console.log('Application available at: http://SERVER_IP:3000');
  console.log('Service Name: Marquardt Inventory Management');
  console.log('Service Status: Running');
});

svc.on('error', function(err){
  console.error('Service error:', err);
});

console.log('Installing Marquardt Inventory Management as Windows Service...');
svc.install();