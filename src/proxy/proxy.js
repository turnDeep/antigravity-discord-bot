import { spawn } from 'child_process';
import http from 'http';

// 危険なコマンドのパターン定義
const DANGEROUS_PATTERNS = [
    /rm\s+-r?[fF]?\s+\//, // rm -rf / など
    /cat\s+(~|\/root|\/home\/[^\/]+)\/\.ssh\//, // SSH鍵へのアクセス
    /(curl|wget).*(https?:\/\/[^\s]+)/, // 外部との通信
    /chmod\s+777/, // 危険な権限変更
    /chown\s+root/, // 所有者変更
];

// コマンドが危険かどうかを判定する関数
function isDangerousCommand(command) {
    return DANGEROUS_PATTERNS.some(pattern => pattern.test(command));
}

// 承認リクエストをDiscordボット(ローカルサーバー)に送信する関数
async function requestApproval(command) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3001, // Discordボット側のリスナーポート
            path: '/request-approval',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const response = JSON.parse(data);
                        resolve(response.approved);
                    } catch (e) {
                        reject(new Error('Invalid response format'));
                    }
                } else {
                    reject(new Error(`Server responded with status code: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(JSON.stringify({ command }));
        req.end();
    });
}

// 元のコマンドを実行する関数
function executeCommand(commandArgs) {
    const cmd = commandArgs[0];
    const args = commandArgs.slice(1);

    const child = spawn(cmd, args, { stdio: 'inherit', shell: true });

    child.on('close', (code) => {
        process.exit(code);
    });

    child.on('error', (err) => {
        console.error(`Error executing command: ${err.message}`);
        process.exit(1);
    });
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: node proxy.js <command> [args...]');
        process.exit(1);
    }

    const fullCommand = args.join(' ');

    if (isDangerousCommand(fullCommand)) {
        console.log(`[OpenClaw Proxy] 🚨 危険なコマンドを検知しました: ${fullCommand}`);
        console.log(`[OpenClaw Proxy] ⏳ Discordで承認を待機しています...`);

        try {
            const approved = await requestApproval(fullCommand);
            if (approved) {
                console.log(`[OpenClaw Proxy] ✅ 承認されました。コマンドを実行します。`);
                executeCommand(args);
            } else {
                console.log(`[OpenClaw Proxy] ❌ 拒否されました。コマンドの実行をブロックしました。`);
                process.exit(1);
            }
        } catch (error) {
            console.error(`[OpenClaw Proxy] ❌ 承認リクエスト中にエラーが発生しました: ${error.message}`);
            console.log(`[OpenClaw Proxy] 安全のため、実行をブロックしました。Discordボットが起動しているか確認してください。`);
            process.exit(1);
        }
    } else {
        // 危険ではないコマンドはそのまま実行
        executeCommand(args);
    }
}

main();
