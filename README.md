# Qwick - Instant Group Settlements on Tempo

**Qwick** is a decentralized expense splitting and settlement application built for the **Tempo Hackathon**. It leverages the speed and low cost of the Tempo blockchain to allow friends to track expenses and settle debts instantly using stablecoins.

![Qwick App](https://via.placeholder.com/800x400?text=Qwick+App+Preview)

## 🚀 Key Features

*   **Group Expense Tracking:** Create groups, add friends, and seamlessy track shared expenses.
*   **Instant Settlements:** Settle your debts instantly using `pathUSD` (USDC) on Tempo Testnet.
*   **Crypto-Native:** Built with **Privy** for embedded wallets and **Wagmi** for blockchain interactions.
*   **Gas-Optimized:** Designed to work efficiently with Tempo's stablecoin gas fee model.
*   **QR Code Payments:** "Fast Pay" mode for quick, in-person settlements via QR codes.

## 🛠️ Tech Stack

*   **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
*   **Languages:** TypeScript
*   **Styling:** Tailwind CSS, Shadcn/UI
*   **Blockchain:** [Tempo Testnet (Moderato)](https://docs.tempo.xyz/)
*   **Auth & Wallets:** [Privy](https://privy.io/)
*   **Web3 Hooks:** [Wagmi](https://wagmi.sh/) / [Viem](https://viem.sh/)

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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔗 Deployment

This project is optimized for deployment on [Vercel](https://vercel.com).

```bash
npx vercel --prod
```

## 📜 License

This project is licensed under the MIT License.
