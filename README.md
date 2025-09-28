# Rainfall 🌧️

**Eternal webpage hosting on the Midnight blockchain**

Rainfall enables anyone to host webpages permanently on the blockchain with complete anonymity. Built on Midnight's privacy-focused architecture, it combines the permanence of blockchain storage with the discoverability of a traditional web browser.

## ✨ Features

- **Eternal Storage**: Your webpages live forever on the blockchain
- **Complete Anonymity**: Host content without revealing your identity
- **Live HTML Editor**: Real-time preview as you build your page
- **Global Discovery**: Browse blockchain-hosted pages like a traditional web browser
- **Privacy Control**: Choose whether your page gets indexed publicly or remains private
- **Simple Process**: Just 3 TDUST to get started

## 🚀 How It Works

1. **Create Contract**: Transfer 3 TDUST to generate your unique blockchain contract
2. **Build Page**: Use our live HTML editor with real-time preview
3. **Publish**: Set title, description, and deploy to the blockchain forever
4. **Share**: Get your permanent link that will always work

## 🌐 Discoverability

Rainfall includes a **global main ledger** that indexes all public pages, creating a blockchain-based web browser experience. Users can:

- Browse all indexed pages on the network
- Discover content created by others
- Search through the decentralized web

### Private Pages
Don't want to be indexed? No problem! Upload using the web ledger contract address and access your page directly through Rainfall without public listing.

## 🔒 Privacy & Security

Built on Midnight blockchain for maximum privacy benefits:

- **Anonymous Publishing**: Create content without revealing identity
- **Regulatory Compliance**: Controlled indexing system respects regulations
- **Private Access**: Direct contract access for unlisted pages
- **Censorship Resistant**: Content stored permanently on blockchain

Unlike other privacy blockchains where content discovery requires knowing the creator, Rainfall's selective indexing system provides the perfect balance of privacy and discoverability.

## 🛠️ Installation & Setup

### Prerequisites
- Node.js and npm installed
- Access to Midnight testnet

### Quick Start

1. **Setup Main Ledger**
   ```bash
   cd main_ledger
   npm install
   ```

2. **Build Contracts**
   ```bash
   cd ../contract
   npm run compact && npm run build
   ```

3. **Start BBoard CLI**
   ```bash
   cd ../bboard-cli
   npm install && npm run build && npm run testnet-remote -- --server
   ```

4. **Launch Web Ledger DApp**
   ```bash
   cd ../web_ledger
   npm install
   ```

5. **Build Contracts (again for web ledger)**
   ```bash
   cd ../contract
   npm run compact && npm run build
   ```

6. **Start BBoard CLI (for web ledger)**
   ```bash
   cd ../bboard-cli
   npm install && npm run build && npm run testnet-remote -- --server
   ```

7. **Launch Frontend**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

## 🎯 Use Cases

- **Anonymous Blogging**: Share thoughts without identity exposure
- **Censorship-Resistant Publishing**: Content that can't be taken down
- **Permanent Documentation**: Store important information forever
- **Decentralized Web Hosting**: Host websites without traditional servers
- **Privacy-First Content**: Publish sensitive information safely

## 👥 Team

Built in 48 hours during a hackathon by:
- **Sofia Moreno Lopez**
- **Omar Emiliano Sanchez Villegas**

## 🏗️ Architecture

- **Frontend**: React-based web interface
- **Blockchain**: Midnight network
- **Smart Contracts**: Custom contracts for page storage
- **Indexing**: Global ledger system for discoverability
- **Privacy**: Midnight's privacy features for anonymous hosting

## 🌟 Why Midnight?

Midnight blockchain provides the perfect foundation for Rainfall because:
- **Privacy by Design**: Built-in anonymity features
- **Regulatory Friendly**: Selective transparency capabilities  
- **Scalable**: Efficient storage and retrieval
- **Developer Friendly**: Robust tooling and documentation

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

*Rainfall - Making the decentralized web accessible to everyone* 🌐⚡