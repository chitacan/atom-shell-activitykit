module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  var binaryDir = 'binaries';

  grunt.initConfig({
    'download-atom-shell': {
      version: '0.15.0',
      outputDir: binaryDir
    },
    'shell': {
      'mac': {
        command: binaryDir + '/Atom.app/Contents/MacOS/Atom app'
      },
      'linux': {
        command: 'chmod +x ' + binaryDir + '/atom && ' + binaryDir + '/atom app'
      },
      'win': {
        command: binaryDir + '\\atom.exe app'
      }
    }
  });

  grunt.registerTask('default', [
    'install',
    'run'
  ]);

  grunt.registerTask('install', [
    'download-atom-shell'
  ]);

  grunt.registerTask('run', function() {
    if (process.platform === 'darwin') {
      grunt.task.run('shell:mac');
    } else if (process.platform === 'win32') {
      grunt.task.run('shell:win');
    } else {
      grunt.task.run('shell:linux');
    }
  });
}
