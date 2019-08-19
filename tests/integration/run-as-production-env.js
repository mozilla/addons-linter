const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const chalk = require('chalk');
const gunzip = require('gunzip-maybe');
const tar = require('tar-fs');
const tmp = require('tmp-promise');

const tmpOptions = { unsafeCleanup: true };
const baseSpawnOptions = { shell: true };

// Get the npm script to run.
const npmScript = process.argv[2];
// Get the path to the test dir to run.
const jestTestsPath = process.argv[3];

if (!npmScript) {
  console.error(chalk.red('Missing mandatory npm script to run'));
  process.exit(1);
}

if (!jestTestsPath) {
  console.error(chalk.red('Missing mandatory path to the tests dir to run'));
  process.exit(1);
}

// Cleanup the temporary even if non empty.
tmp.setGracefulCleanup(tmpOptions);

function spawnWithShell(cmd, args, options) {
  return spawn(cmd, args, { ...baseSpawnOptions, ...options });
}

function getPackedName() {
  return new Promise((resolve, reject) => {
    fs.readFile('package.json', (err, data) => {
      if (err) {
        reject(err);
      } else {
        const info = JSON.parse(data.toString());
        resolve(`${info.name}-${info.version}.tgz`);
      }
    });
  });
}

function createPackage(tmpDirPath) {
  console.log(chalk.green('Create a pre-release npm package archive'));
  return new Promise((resolve, reject) => {
    const pkgPack = spawnWithShell('npm', ['pack', process.cwd()], {
      cwd: tmpDirPath,
    });

    pkgPack.stdout.pipe(process.stdout);
    pkgPack.stderr.pipe(process.stderr);
    pkgPack.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(
          getPackedName().then((filename) => {
            return path.join(tmpDirPath, filename);
          })
        );
      } else {
        reject(new Error('Failed to create npm package archive'));
      }
    });
  });
}

function unpackTarPackage(packagePath, destDir) {
  console.log(
    chalk.green(['Unpacking', packagePath, 'package into', destDir].join(' '))
  );

  return new Promise((resolve, reject) => {
    fs.createReadStream(packagePath)
      .pipe(gunzip())
      .pipe(tar.extract(destDir))
      .on('error', reject)
      .on('finish', resolve);
  });
}

function installPackageDeps(packageDir) {
  console.log(chalk.green('Install production package dependencies'));
  return new Promise((resolve, reject) => {
    const pkgInstall = spawnWithShell(
      'npm',
      ['install', '--production', '--no-lockfile'],
      {
        cwd: packageDir,
      }
    );
    pkgInstall.stdout.pipe(process.stdout);
    pkgInstall.stderr.pipe(process.stderr);
    pkgInstall.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve();
      } else {
        reject(new Error('Failed to install package dependencies'));
      }
    });
  });
}

function runIntegrationTests(packageDir) {
  console.log(
    chalk.green('Running integration tests in production-like environent')
  );
  return new Promise((resolve, reject) => {
    const testRun = spawnWithShell(
      'npm',
      ['run', npmScript, '--', jestTestsPath],
      {
        env: {
          ...process.env,
          PATH: process.env.PATH,
          TEST_BIN_PATH: path.join(packageDir, 'bin'),
        },
      }
    );

    testRun.stdout.pipe(process.stdout);
    testRun.stderr.pipe(process.stderr);
    testRun.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve();
      } else {
        reject(new Error('Failed to run integration tests'));
      }
    });
  });
}

// Create a production-like environment in a temporarily created directory
// and then run the integration tests on it.
tmp
  .withDir((tmpDir) => {
    const tmpDirPath = tmpDir.path;
    const unpackedDirPath = path.join(tmpDirPath, 'package');

    return createPackage(tmpDirPath)
      .then((archiveFilePath) => unpackTarPackage(archiveFilePath, tmpDirPath))
      .then(() => installPackageDeps(unpackedDirPath))
      .then(() => runIntegrationTests(unpackedDirPath));
  }, tmpOptions)
  .catch((err) => {
    console.error(err.stack ? chalk.red(err.stack) : chalk.red(err));
    process.exit(1);
  });
