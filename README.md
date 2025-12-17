# CrisisVault

**Application de documentation d'urgence sécurisée et hors-ligne**

**Live Demo**: https://sec0xed.github.io/CrisisVault/

---

[English](#english) | [Français](#français)

---

## Français

### Description

CrisisVault est une application web progressive (PWA) conçue pour stocker et consulter des documents sensibles de manière sécurisée. Elle répond au besoin critique d'accéder à des playbooks d'incident, procédures d'urgence ou documentation confidentielle, même en situation de crise sans connexion internet.

### Cas d'usage

- **Équipes SOC/CERT** : Accès aux playbooks de réponse à incident même si l'infrastructure est compromise
- **Administrateurs système** : Procédures de récupération accessibles hors-ligne
- **RSSI/DSI** : Documentation de crise disponible sur appareil mobile isolé
- **Équipes terrain** : Accès aux procédures sans dépendance réseau

### Architecture de sécurité

#### Chiffrement

| Composant | Standard |
|-----------|----------|
| Algorithme | AES-256-GCM |
| Dérivation de clé | PBKDF2-SHA256 |
| Itérations | 600 000 |
| IV | 12 octets aléatoires par document |
| Intégrité | HMAC-SHA256 sur le manifeste |

#### Principes appliqués

- **Zero-knowledge** : La passphrase n'est jamais stockée ni transmise. Le déchiffrement s'effectue exclusivement côté client via l'API Web Crypto.
- **Defense in depth** : Rate limiting (5 tentatives, lockout progressif jusqu'à 5 min), wipe automatique sur inactivité (15 min), touche panique (`Ctrl+Shift+L`).
- **Content Security Policy** : Headers restrictifs empêchant XSS, clickjacking et injections.
- **Offline-first** : Service Worker cache l'application complète. Aucune requête réseau nécessaire après installation.

#### Conformité

Cette implémentation suit les recommandations de l'**ANSSI** concernant :
- Le choix des primitives cryptographiques (AES-GCM, PBKDF2)
- Le nombre d'itérations pour la dérivation de clé (≥100 000, ici 600 000)
- L'utilisation de vecteurs d'initialisation uniques

### Installation

Prérequis : Node.js 20+

```bash
npm install
npm run dev
```

### Chiffrement des documents

1. Placez vos fichiers Markdown dans le répertoire `docs/`
2. Exécutez le script de chiffrement :
   ```bash
   npm run encrypt
   ```
3. Saisissez votre passphrase
4. Le coffre chiffré est généré dans `src/data/vault.json`

Le répertoire `docs/` est exclu de Git. Seul le fichier `vault.json` chiffré est versionné et déployé.

### Production

```bash
npm run build
```

Le bundle optimisé est généré dans `dist/`.

---

## English

### Description

CrisisVault is a progressive web application (PWA) designed to securely store and view sensitive documents. It addresses the critical need to access incident playbooks, emergency procedures, or confidential documentation, even during a crisis without internet connectivity.

### Use Cases

- **SOC/CERT teams**: Access incident response playbooks even if infrastructure is compromised
- **System administrators**: Recovery procedures available offline
- **CISO/CIO**: Crisis documentation available on isolated mobile device
- **Field teams**: Procedure access without network dependency

### Security Architecture

#### Encryption

| Component | Standard |
|-----------|----------|
| Algorithm | AES-256-GCM |
| Key derivation | PBKDF2-SHA256 |
| Iterations | 600,000 |
| IV | 12 random bytes per document |
| Integrity | HMAC-SHA256 on manifest |

#### Applied Principles

- **Zero-knowledge**: Passphrase is never stored or transmitted. Decryption occurs exclusively client-side via Web Crypto API.
- **Defense in depth**: Rate limiting (5 attempts, progressive lockout up to 5 min), automatic wipe on inactivity (15 min), panic key (`Ctrl+Shift+L`).
- **Content Security Policy**: Restrictive headers preventing XSS, clickjacking, and injections.
- **Offline-first**: Service Worker caches the complete application. No network requests required after installation.

#### Compliance

This implementation follows **ANSSI** recommendations regarding:
- Choice of cryptographic primitives (AES-GCM, PBKDF2)
- Number of iterations for key derivation (≥100,000, here 600,000)
- Use of unique initialization vectors

### Installation

Prerequisites: Node.js 20+

```bash
npm install
npm run dev
```

### Encrypting Documents

1. Place your Markdown files in the `docs/` directory
2. Run the encryption script:
   ```bash
   npm run encrypt
   ```
3. Enter your passphrase
4. The encrypted vault is generated at `src/data/vault.json`

The `docs/` directory is excluded from Git. Only the encrypted `vault.json` file is versioned and deployed.

### Production

```bash
npm run build
```

The optimized bundle is generated in `dist/`.

---

## License

MIT
