How to Build
============

The following steps should allow you to build this project:

1. Make sure you have the lastest version of Node.js. On Ubuntu, you might
   need a custom repository:

   ```
   sudo add-apt-repository ppa:chris-lea/node.js;
   sudo apt-get update;
   sudo apt-get install nodejs;
   sudo apt-get upgrade;
   ```

2. Next hop into source directory where you cloned this repo. The following
   commands will install grunt and all the Node dependencies:

   ```
   cd Wherever_You_Cloned/pen;
   npm install;
   sudo npm install -g grunt-cli;
   ```

3. Finally, you're ready to start a build:

   ```
   grunt;
   ```

   While editing a file, you can use `watch` to automatically rebuild every
   time a file is saved:

   ```
   grunt watch;
   ```

