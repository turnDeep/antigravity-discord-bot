import { spawn } from 'child_process';

const commandsToTest = [
    { name: 'Safe command', args: ['echo', 'Hello World'] },
    { name: 'Dangerous command 1', args: ['rm', '-rf', '/tmp/test_dir'] },
    { name: 'Dangerous command 2', args: ['cat', '~/.ssh/id_rsa'] }
];

async function runTest(testCase) {
    console.log(`\n--- Running test: ${testCase.name} ---`);
    console.log(`Command: node src/proxy/proxy.js ${testCase.args.join(' ')}`);

    return new Promise((resolve) => {
        const child = spawn('node', ['src/proxy/proxy.js', ...testCase.args], { stdio: 'inherit' });

        child.on('close', (code) => {
            console.log(`Test finished with exit code: ${code}`);
            resolve();
        });
    });
}

async function main() {
    console.log('Starting OpenClaw Proxy Test Suite...');

    // Create a dummy dir to avoid actually wiping anything if it passes by accident
    spawn('mkdir', ['-p', '/tmp/test_dir']).on('close', async () => {
        for (const testCase of commandsToTest) {
            await runTest(testCase);
        }
        console.log('\nAll tests completed.');
    });
}

main();
