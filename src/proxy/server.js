import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import express from 'express';
import bodyParser from 'body-parser';

const proxyServer = express();
proxyServer.use(bodyParser.json());

// 承認待ちのリクエストを保持するマップ
const pendingRequests = new Map();
let discordClient = null;

export function initProxyServer(client) {
    discordClient = client;
    const PORT = process.env.PROXY_PORT || 3001;

    proxyServer.post('/request-approval', async (req, res) => {
        const { command } = req.body;
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        const requestId = Date.now().toString();

        try {
            await sendApprovalToDiscord(requestId, command);

            // Promiseを保持して、Discordからの返答を待つ
            const approvalPromise = new Promise((resolve) => {
                pendingRequests.set(requestId, resolve);
            });

            // タイムアウト設定 (例えば5分)
            const timeout = setTimeout(() => {
                if (pendingRequests.has(requestId)) {
                    const resolve = pendingRequests.get(requestId);
                    pendingRequests.delete(requestId);
                    resolve(false); // タイムアウト時は拒否として扱う
                }
            }, 5 * 60 * 1000);

            const approved = await approvalPromise;
            clearTimeout(timeout);

            res.json({ approved });

        } catch (error) {
            console.error('Error handling proxy request:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    proxyServer.listen(PORT, () => {
        console.log(`🛡️ OpenClaw Proxy Listener started on port ${PORT}`);
    });
}

export async function handleProxyInteraction(interaction) {
    if (!interaction.isButton()) return false;

    const customId = interaction.customId;
    if (!customId.startsWith('proxy_approve_') && !customId.startsWith('proxy_reject_')) {
        return false; // 他のボタンインタラクションの場合は処理しない
    }

    const isApprove = customId.startsWith('proxy_approve_');
    const requestId = customId.replace('proxy_approve_', '').replace('proxy_reject_', '');

    if (pendingRequests.has(requestId)) {
        const resolve = pendingRequests.get(requestId);
        pendingRequests.delete(requestId);
        resolve(isApprove);

        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        embed.setColor(isApprove ? 0x00FF00 : 0xFF0000);
        embed.setTitle(`🚨 コマンド実行 ${isApprove ? '許可済み' : '拒否済み'}`);

        await interaction.update({
            content: `${isApprove ? '✅ **許可されました**' : '❌ **拒否されました**'}`,
            embeds: [embed],
            components: []
        });
    } else {
        await interaction.update({
            content: '⚠️ **このリクエストは期限切れ、または既に処理されています。**',
            components: []
        });
    }
    return true;
}

async function sendApprovalToDiscord(requestId, command) {
    if (!discordClient) return;

    // TODO: 送信先のチャンネルをどう決定するか。
    // 現状はワークスペースの紐付けや、ユーザーID宛のDMが考えられる。
    // 簡単のため、特定のユーザーID（環境変数の管理者）にDMを送る。
    const userId = process.env.DISCORD_ALLOWED_USER_ID;
    if (!userId) {
        console.error('DISCORD_ALLOWED_USER_ID is not set.');
        return;
    }

    try {
        const user = await discordClient.users.fetch(userId);

        const embed = new EmbedBuilder()
            .setTitle('🚨 危険なコマンドの実行がリクエストされました')
            .setDescription('OpenClawが以下のコマンドを実行しようとしています。許可しますか？')
            .addFields({ name: 'Command', value: `\`\`\`bash\n${command}\n\`\`\`` })
            .setColor(0xFFA500)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`proxy_approve_${requestId}`)
                .setLabel('✅ 許可 (Approve)')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`proxy_reject_${requestId}`)
                .setLabel('❌ 拒否 (Reject)')
                .setStyle(ButtonStyle.Danger)
        );

        await user.send({ embeds: [embed], components: [row] });
        console.log(`[Proxy Server] Sent approval request to user ${userId} for command: ${command}`);

    } catch (error) {
        console.error('Failed to send DM to user:', error);
        throw error;
    }
}
