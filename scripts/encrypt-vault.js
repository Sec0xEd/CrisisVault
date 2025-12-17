import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import process from 'node:process';

const { webcrypto } = crypto;
const subtle = webcrypto.subtle;

const CONFIG = Object.freeze({
    DOCS_DIR: './docs',
    OUTPUT_FILE: './src/data/vault.json',
    ITERATIONS: 600000,
    SALT_LENGTH: 16,
    IV_LENGTH: 12,
    MIN_PASSPHRASE_LENGTH: 12,
    RECOMMENDED_PASSPHRASE_LENGTH: 16,
});

function bufferToHex(buffer) {
    return Buffer.from(buffer).toString('hex');
}

function bufferToBase64(buffer) {
    return Buffer.from(buffer).toString('base64');
}

async function deriveEncryptionKey(passphrase, salt) {
    const encoder = new TextEncoder();
    const passwordKey = await subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: CONFIG.ITERATIONS,
            hash: 'SHA-256',
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
}

async function deriveHmacKey(passphrase, salt) {
    const encoder = new TextEncoder();
    const passwordKey = await subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    const hmacSalt = new Uint8Array(salt.length);
    for (let i = 0; i < salt.length; i++) {
        hmacSalt[i] = salt[i] ^ 0x5c;
    }

    return subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: hmacSalt,
            iterations: CONFIG.ITERATIONS,
            hash: 'SHA-256',
        },
        passwordKey,
        { name: 'HMAC', hash: 'SHA-256', length: 256 },
        false,
        ['sign']
    );
}

async function encryptContent(key, content) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(content);
    const iv = crypto.getRandomValues(new Uint8Array(CONFIG.IV_LENGTH));

    const encrypted = await subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
    );

    return {
        iv: bufferToHex(iv),
        data: bufferToBase64(encrypted),
    };
}

async function computeHmac(hmacKey, data) {
    const encoder = new TextEncoder();
    const signature = await subtle.sign('HMAC', hmacKey, encoder.encode(data));
    return bufferToHex(signature);
}

function parseMarkdownFrontmatter(content) {
    const result = {
        title: '',
        priority: 'normal',
        tags: [],
        content: content,
    };

    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) {
        return result;
    }

    const frontmatter = frontmatterMatch[1];
    result.content = content.replace(frontmatterMatch[0], '').trim();

    const titleMatch = frontmatter.match(/title:\s*(.+)/);
    if (titleMatch) {
        result.title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
    }

    const priorityMatch = frontmatter.match(/priority:\s*(.+)/);
    if (priorityMatch) {
        const priority = priorityMatch[1].trim().toLowerCase();
        if (['critical', 'high', 'normal', 'low'].includes(priority)) {
            result.priority = priority;
        }
    }

    const tagsMatch = frontmatter.match(/tags:\s*\[(.+)\]/);
    if (tagsMatch) {
        result.tags = tagsMatch[1]
            .split(',')
            .map(t => t.trim().replace(/^["']|["']$/g, ''))
            .filter(t => t.length > 0);
    }

    return result;
}

function validatePassphrase(passphrase) {
    if (passphrase.length < CONFIG.MIN_PASSPHRASE_LENGTH) {
        return {
            valid: false,
            message: `Passphrase must be at least ${CONFIG.MIN_PASSPHRASE_LENGTH} characters`,
        };
    }

    const hasLower = /[a-z]/.test(passphrase);
    const hasUpper = /[A-Z]/.test(passphrase);
    const hasDigit = /[0-9]/.test(passphrase);
    const hasSpecial = /[^a-zA-Z0-9]/.test(passphrase);
    const complexity = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

    if (complexity < 3) {
        return {
            valid: false,
            message: 'Passphrase needs at least 3 of: lowercase, uppercase, digit, special character',
        };
    }

    return { valid: true, message: '' };
}

async function readPassphrase(prompt) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        if (process.stdin.isTTY) {
            process.stdout.write(prompt);
            let passphrase = '';

            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');

            const onData = (char) => {
                if (char === '\n' || char === '\r') {
                    process.stdin.setRawMode(false);
                    process.stdin.removeListener('data', onData);
                    rl.close();
                    process.stdout.write('\n');
                    resolve(passphrase);
                } else if (char === '\u0003') {
                    process.exit(1);
                } else if (char === '\u007f' || char === '\b') {
                    if (passphrase.length > 0) {
                        passphrase = passphrase.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                } else {
                    passphrase += char;
                    process.stdout.write('*');
                }
            };

            process.stdin.on('data', onData);
        } else {
            rl.question(prompt, (answer) => {
                rl.close();
                resolve(answer);
            });
        }
    });
}

async function main() {
    process.stdout.write('\x1b[36m╔════════════════════════════════════════╗\x1b[0m\n');
    process.stdout.write('\x1b[36m║\x1b[0m   \x1b[1mCrisisVault Encryption Tool\x1b[0m          \x1b[36m║\x1b[0m\n');
    process.stdout.write('\x1b[36m║\x1b[0m   ANSSI Compliant / AES-256-GCM        \x1b[36m║\x1b[0m\n');
    process.stdout.write('\x1b[36m╚════════════════════════════════════════╝\x1b[0m\n\n');

    const passphrase = await readPassphrase('Enter encryption passphrase: ');

    if (!passphrase) {
        process.stderr.write('\x1b[31mError: Passphrase required\x1b[0m\n');
        process.exit(1);
    }

    const validation = validatePassphrase(passphrase);
    if (!validation.valid) {
        process.stderr.write(`\x1b[31mError: ${validation.message}\x1b[0m\n`);
        process.exit(1);
    }

    if (passphrase.length < CONFIG.RECOMMENDED_PASSPHRASE_LENGTH) {
        process.stdout.write(`\x1b[33mWarning: ${CONFIG.RECOMMENDED_PASSPHRASE_LENGTH}+ chars recommended\x1b[0m\n`);
    }

    const confirmPassphrase = await readPassphrase('Confirm passphrase: ');

    if (passphrase !== confirmPassphrase) {
        process.stderr.write('\x1b[31mError: Passphrases do not match\x1b[0m\n');
        process.exit(1);
    }

    const salt = crypto.getRandomValues(new Uint8Array(CONFIG.SALT_LENGTH));
    const encryptionKey = await deriveEncryptionKey(passphrase, salt);
    const hmacKey = await deriveHmacKey(passphrase, salt);

    process.stdout.write('\x1b[32mKey derived successfully\x1b[0m\n');

    try {
        await fs.access(CONFIG.DOCS_DIR);
    } catch {
        process.stderr.write(`\x1b[31mError: ${CONFIG.DOCS_DIR} directory not found\x1b[0m\n`);
        process.exit(1);
    }

    await fs.mkdir(path.dirname(CONFIG.OUTPUT_FILE), { recursive: true });

    const files = await fs.readdir(CONFIG.DOCS_DIR);
    const markdownFiles = files.filter(f => f.endsWith('.md'));

    if (markdownFiles.length === 0) {
        process.stderr.write('\x1b[31mError: No markdown files found\x1b[0m\n');
        process.exit(1);
    }

    const encryptedFiles = [];

    for (const filename of markdownFiles) {
        const filepath = path.join(CONFIG.DOCS_DIR, filename);
        const content = await fs.readFile(filepath, 'utf-8');
        const parsed = parseMarkdownFrontmatter(content);

        if (!parsed.title) {
            parsed.title = filename.replace('.md', '');
        }

        const encrypted = await encryptContent(encryptionKey, parsed.content);

        encryptedFiles.push({
            id: crypto.randomUUID(),
            title: parsed.title,
            priority: parsed.priority,
            tags: parsed.tags,
            iv: encrypted.iv,
            data: encrypted.data,
        });

        process.stdout.write(`  Encrypted: ${filename}\n`);
    }

    const filesData = JSON.stringify(encryptedFiles);
    const hmac = await computeHmac(hmacKey, filesData);

    const manifest = {
        salt: bufferToHex(salt),
        hmac,
        generatedAt: new Date().toISOString(),
        files: encryptedFiles,
    };

    await fs.writeFile(CONFIG.OUTPUT_FILE, JSON.stringify(manifest, null, 2));

    process.stdout.write('\n\x1b[32m════════════════════════════════════════\x1b[0m\n');
    process.stdout.write(`\x1b[32mVault generated: ${CONFIG.OUTPUT_FILE}\x1b[0m\n`);
    process.stdout.write(`\x1b[32mFiles encrypted: ${encryptedFiles.length}\x1b[0m\n`);
    process.stdout.write('\x1b[32m════════════════════════════════════════\x1b[0m\n');
}

main().catch((err) => {
    process.stderr.write(`\x1b[31mFatal error: ${err.message}\x1b[0m\n`);
    process.exit(1);
});
