export const WALLET_ADDRESSES = {
    ethereum: "0x219831c74199435faB1EF76F0Ed991CeEcbD4110",
    base: "0xb375dd58Cc6E98C7b900eAC2566040dC7F41012a",
    solana: "FvyKbbNQuD6iH1ZM23gFX3D18DoHxR9CMUonNcY8v5ur"
};

// Common ERC20 tokens to check
export const COMMON_TOKENS = [
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
    "0x0f5d2fb29fb7d3cfee444a200298f468908cc942", // MANA
    "0x4e15361fd6b4bb609fa63c81a2be19d873717870", // FTM
    "0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85", // AXS
    "0x3c3a81e81dc49A522A592e7622A7E711c06bf354"  // MNT
];

interface Config {
    ethereum: string;
    base: string;
    solana: string;
    twitter: {
        apiKey: string;
        apiSecret: string;
        accessToken: string;
        accessTokenSecret: string;
    };
}

const config: Config = {
    ethereum: "0x219831c74199435faB1EF76F0Ed991CeEcbD4110",
    base: "0xb375dd58Cc6E98C7b900eAC2566040dC7F41012a",
    solana: "FvyKbbNQuD6iH1ZM23gFX3D18DoHxR9CMUonNcY8v5ur",
    twitter: {
        apiKey: process.env.TWITTER_API_KEY || '',
        apiSecret: process.env.TWITTER_API_SECRET || '',
        accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
    }
};

export default config; 