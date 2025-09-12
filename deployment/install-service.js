const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const serverPath = path.join(projectRoot, 'server.js');

// Create startup batch file
const batchContent = `@echo off
cd /d "${projectRoot}"
set NODE_ENV=production
node server.js
pause`;

// Create service batch file
const serviceBatch = `@echo off
echo Installing Marquardt Inventory Management Service...
sc create "MarquardtIMS" binPath= "node \"${serverPath}\"" start= auto
sc description "MarquardtIMS" "Marquardt India Inventory Management System"
echo Service created successfully!
echo To start: sc start MarquardtIMS
echo To stop: sc stop MarquardtIMS
echo To delete: sc delete MarquardtIMS
pause`;

try {
  fs.writeFileSync(path.join(projectRoot, 'start-app.bat'), batchContent);
  fs.writeFileSync(path.join(projectRoot, 'install-windows-service.bat'), serviceBatch);
  
  console.log('✅ Service installation files created!');
  console.log('\n📁 Files created:');
  console.log('   - start-app.bat (Manual startup)');
  console.log('   - install-windows-service.bat (Windows Service)');
  console.log('\n🚀 To run manually: double-click start-app.bat');
  console.log('🔧 To install as service: Run install-windows-service.bat as Administrator');
  console.log('\n🌐 Application will be available at: http://localhost:3000');
} catch (error) {
  console.error('❌ Error creating service files:', error.message);
}