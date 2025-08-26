const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const chalk = require('chalk');

function ensureHaxeInstalled() {
    const haxeDownloadDir = path.join(__dirname, '..', 'node_modules', 'haxe', 'downloads', 'neko');
    if (fs.existsSync(haxeDownloadDir)) {
    //    console.log(chalk.yellowBright("Haxe already installed, skipping..."));
        return;
    }
    //console.log(chalk.yellowBright("Haxe not installed, installing..."));
    var startCwdPath = process.cwd();
    process.chdir(__dirname);
    const installHaxe = require('haxe/install');
    process.chdir(startCwdPath);
}

ensureHaxeInstalled();

const applyEnv = require('haxe-utils/lib/apply-env');
const haxelibSetup = require('haxe-utils/lib/haxelib-setup');
const haxelibInstall = require('haxe-utils/lib/haxelib-install');
const haxeBuildLibs = require('haxe-utils/lib/haxe-build-libs');

haxelibSetup().then(() => {
    console.log(chalk.greenBright("Setup Complete"));

    haxelibInstall().then(() => {
        console.log(chalk.greenBright("Install complete"));

        var p = path.join(__dirname, '../', 'libs.hxml');
        haxeBuildLibs(p, (output) => {
            console.log(chalk.blueBright("libs.hxml updated"));
        });
    });
});
