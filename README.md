# Qwick - Next-Gen Crypto POS & Expense Manager

**Qwick** is a dual-mode financial application built on the **Tempo Blockchain** that bridges the gap between personal finance and merchant payments. It replaces expensive credit card infrastructure with instant, near-zero fee stablecoin transactions.

![Qwick App](https://via.placeholder.com/800x400?text=Qwick+POS+Preview)

## 💡 The Problem

*   **Merchants** pay **2.9% + 30¢** per transaction to credit card processors.
*   **Users** wait days for bank settlements.
*   **Group expenses** are messy and hard to track.

## 🚀 The Solution: Dual-Mode Architecture

Qwick offers two distinct modes in a single application:

### 1. 🏪 Merchant Mode (The "Square" Killer)
*   **Instant POS:** Turn any tablet or phone into a Point-of-Sale terminal.
*   **Dynamic QR Codes:** Enter an amount (e.g., "$12.50" for a latte at *Joe's Coffee*), generate a QR code, and get paid instantly.
*   **Zero-Fee Revolution:** Instead of losing 3% to Visa/Mastercard, merchants pay **<$0.001** in gas fees on Tempo.
*   **Instant Settlement:** Funds arrive in the merchant's wallet in seconds, not days.

### 2. 👤 Personal Mode (The "Splitwise" Killer)
*   **Group Splitting:** Track shared expenses with friends (trips, dinners, rent).
*   **Direct Settlement:** Settle debts instantly using `pathUSD` (USDC) without leaving the app.
*   **Social Graph:** Add friends and see your complete transaction history.

## 🛠️ Tech Stack & Architecture

*   **Blockchain:** **Tempo Testnet (Moderato)** - Chosen for high throughput and stablecoin-native gas.
*   **Frontend:** Next.js 14, Tailwind CSS, Shadcn/UI for a premium mobile-first experience.
*   **Smart Contracts:** Standard ERC-20 (`pathUSD`) for payment settlement.
*   **Wallet Integration:** **Privy** for seamless, social-login based embedded wallets.
*   **Data Layer:** **Wagmi** & **Viem** for robust blockchain hooks.

## 📦 Getting Started

### Prerequisites
*   Node.js 18+
*   npm or pnpm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/God2god0/Tempo-hackathon.git
    cd Tempo-hackathon
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env.local` file and add your Privy App ID:
    ```env
    NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

## 🔗 Live Demo & Source

*   **Live Deployment:** [https://qwick-neon.vercel.app](https://qwick-neon.vercel.app)
*   **Source Code:** [https://github.com/God2god0/Tempo-hackathon](https://github.com/God2god0/Tempo-hackathon)

## 📜 License

MIT License. Built for the Tempo Hackathon.
