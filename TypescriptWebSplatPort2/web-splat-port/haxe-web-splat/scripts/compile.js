const path = require('path');
const fs = require('fs');
const chalk = require('chalk')
const haxeBuildLibs = require('haxe-utils/lib/haxe-build-libs');
const info = require('haxe-utils/lib/info')
const loglines = require('haxe-utils/lib/loglines')

var haxe = require('haxe').haxe;

info(() => {
  console.log(
    '->',
    chalk.blue('Compiler: '),
    chalk.green('Start')
  )
  
  var p = path.join(__dirname, '../','build.hxml' );
  
  build(p, () => {
    console.log(
      '->',
      chalk.blue('Compiled: '),
      chalk.green('Built Successfully')
    )
  }, (err) => {
    console.error(
      '->',
      chalk.blue('Compiler: '),
      chalk.red('Build Failed'),
      err
    )
  });
});

function build(hxml, callback, errorCb){
  console.log('build')
  console.log(hxml);
  var haxeProcess = haxe(hxml);
    haxeProcess.stdout.on('data', (data) => {
      loglines(data.toString('utf8'), false);
    });
    haxeProcess.stderr.on('data', (data) => {
      loglines(data.toString('utf8'), true);
    });
    haxeProcess.on('close', function (code) {
      if (callback !== undefined) callback();
    });
    haxeProcess.on('error', function (err) {
      if (errorCb !== undefined) errorCb(err);
    });
}