'use strict'

const fs = require('fs-extra')
const path = require('path')
const spawn = require('child_process').spawn
const debug = require('debug')('windows-build-tools')
const chalk = require('chalk')
const Spinner = require('cli-spinner').Spinner

const launchInstaller = require('./launch')
const Tailer = require('./tailer')
const utils = require('../utils')

let spinner

/**
 * Installs the build tools, tailing the installation log file
 * to understand what's happening
 *
 * @returns {Promise.<Object>} - Promise that resolves with the installation result
 */

function install (cb) {
  console.log(chalk.green('Starting installation...'))

  launchInstaller()
    .then(() => launchSpinner())
    .then(() => Promise.all([installBuildTools(), installPython()]))
    .then((paths) => {
      stopSpinner()

      const variables = {
        buildTools: paths[0],
        python: paths[1]
      }
      cb(variables)
    })
    .catch((error) => {
      stopSpinner()
  
      console.log(error)
    })
}

function stopSpinner() {
  if (spinner) {
    spinner.stop(false)
  }
}

function launchSpinner() {
  console.log('Launched installers, now waiting for them to finish.')
  console.log('This will likely take some time - please be patient!')

  spinner = new Spinner(`Waiting for installers... %s`)
  spinner.setSpinnerDelay(180)
}

function installBuildTools () {
  return new Promise((resolve, reject) => {
    const tailer = new Tailer(utils.getBuildToolsInstallerPath().logPath)

    tailer.on('exit', (result, details) => {
      debug('build tools tailer exited');
      if (result === 'error') {
        debug('Installer: Tailer found error with installer', details)
        reject(err)
      }

      if (result === 'success') {
        console.log(chalk.bold.green('Successfully installed Visual Studio Build Tools.'))
        debug('Installer: Successfully installed Visual Studio Build Tools according to tailer')
        resolve()
      }

      if (result === 'failure') {
        console.log(chalk.bold.red('Could not install Visual Studio Build Tools.'))
        console.log('Please find more details in the log files, which can be found at')
        console.log(utils.getWorkDirectory())
        debug('Installer: Failed to install according to tailer')
        resolve()
      }
    })

    tailer.start()
  })
}

function installPython () {
  return new Promise((resolve, reject) => {
    // The log file for msiexe is utf-16
    const tailer = new Tailer(utils.getPythonInstallerPath().logPath, 'ucs2')

    tailer.on('exit', (result, details) => {
      debug('python tailer exited');
      if (result === 'error') {
        debug('Installer: Tailer found error with installer', details)
        reject(err)
      }

      if (result === 'success') {
        console.log(chalk.bold.green('Successfully installed Python 2.7'))
        debug('Installer: Successfully installed Python 2.7 according to tailer')

        var variables = {
          pythonPath: details || utils.getPythonInstallerPath().targetPath
        }
        resolve(variables)
      }

      if (result === 'failure') {
        console.log(chalk.bold.red('Could not install Python 2.7.'))
        console.log('Please find more details in the log files, which can be found at')
        console.log(utils.getWorkDirectory())
        debug('Installer: Failed to install Python 2.7 according to tailer')
        resolve(undefined)
      }
    })

    tailer.start()
  })
}

module.exports = install