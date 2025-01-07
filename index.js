require('dotenv').config();
const { Client, GatewayIntentBits, Permissions, Collection } = require('discord.js');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

// Initialisation du bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Système d'XP
const xpFile = 'xp.json';
let xp = {};
if (fs.existsSync(xpFile)) {
    xp = JSON.parse(fs.readFileSync(xpFile, 'utf8'));
}

const xpCooldown = new Collection();
const XP_AMOUNT = 10; // XP gagné par message
const XP_COOLDOWN = 60000; // 1 minute avant de regagner de l'XP

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Vérifie le cooldown
    const lastXp = xpCooldown.get(message.author.id) || 0;
    if (Date.now() - lastXp < XP_COOLDOWN) return;

    // Ajout d'XP
    if (!xp[message.author.id]) {
        xp[message.author.id] = { xp: 0, level: 1 };
    }
    xp[message.author.id].xp += XP_AMOUNT;

    // Niveau supérieur
    const nextLevel = xp[message.author.id].level * 100;
    if (xp[message.author.id].xp >= nextLevel) {
        xp[message.author.id].level++;
        message.channel.send(`${message.author}, tu es monté au niveau ${xp[message.author.id].level} 🌟 !`);
    }

    // Enregistre les changements
    fs.writeFileSync(xpFile, JSON.stringify(xp, null, 2));
    xpCooldown.set(message.author.id, Date.now());
});

// Générer une carte d'XP stylisée avec texte lisible
async function generateXpCard(user, userXp) {
    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext('2d');

    // Charger l'image d'arrière-plan
    const background = await loadImage('custom_background_fixed.png');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Charger et dessiner l'image de profil pour masquer le logo
    const avatar = await loadImage(user.displayAvatarURL({ format: 'png' }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(350, 125, 60, 0, Math.PI * 2, true); // Position centrée sur le logo
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 290, 65, 120, 120); // Position et taille adaptées
    ctx.restore();

    // Texte stylisé pour lisibilité
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '28px sans-serif';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'; // Contour sombre pour le contraste
    ctx.lineWidth = 3;

    // Nom de l'utilisateur
    ctx.strokeText(`${user.username}`, 170, 70);
    ctx.fillText(`${user.username}`, 170, 70);

    // Niveau et XP
    ctx.font = '20px sans-serif';
    ctx.strokeText(`Niveau: ${userXp.level}`, 170, 110);
    ctx.fillText(`Niveau: ${userXp.level}`, 170, 110);
    ctx.strokeText(`XP: ${userXp.xp}/${userXp.level * 100}`, 170, 140);
    ctx.fillText(`XP: ${userXp.xp}/${userXp.level * 100}`, 170, 140);

    // Barre de progression
    const barWidth = 500;
    const progress = (userXp.xp / (userXp.level * 100)) * barWidth;
    ctx.fillStyle = '#7289DA';
    ctx.fillRect(170, 180, progress, 20);
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(170, 180, barWidth, 20);

    return canvas.toBuffer();
}

// Commande pour vérifier l'XP avec image stylisée
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!xp')) {
        const target = message.mentions.users.first() || message.author;
        const userXp = xp[target.id] || { xp: 0, level: 1 };

        const buffer = await generateXpCard(target, userXp);
        const attachment = { files: [{ attachment: buffer, name: 'xp-card.png' }] };
        message.reply(attachment);
    }
});

// Connexion au bot
client.login(process.env.TOKEN);
