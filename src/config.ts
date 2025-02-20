export const WALLET_ADDRESSES = {
    ethereum: "0x219831c74199435faB1EF76F0Ed991CeEcbD4110",
    base: "0xb375dd58Cc6E98C7b900eAC2566040dC7F41012a",
    solana: "FvyKbbNQuD6iH1ZM23gFX3D18DoHxR9CMUonNcY8v5ur"
};

// Common ERC20 tokens to check
export const COMMON_TOKENS = [
    "0x5a3e6a77ba2f983ec0d371ea3b475f8bc0811ad5",
    "0x14feE680690900BA0ccCfC76AD70Fd1b95D10e16",
    "0xf94e7d0710709388bce3161c32b4eea56d3f91cc",
    "0x292fcdd1b104de5a00250febba9bc6a5092a0076",
    "0x44971abf0251958492fee97da3e5c5ada88b9185",
    "0x8FAc8031e079F409135766C7d5De29cf22EF897C",
    "0x7da2641000cbb407c329310c461b2cb9c70c3046"
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
    rapidApi: {
        key: string;
    };
}

const config: Config = {
    ethereum: "0x5a3e6a77ba2f983ec0d371ea3b475f8bc0811ad5",
    base: "0x14feE680690900BA0ccCfC76AD70Fd1b95D10e16",
    solana: "FvyKbbNQuD6iH1ZM23gFX3D18DoHxR9CMUonNcY8v5ur",
    twitter: {
        apiKey: process.env.TWITTER_API_KEY || '',
        apiSecret: process.env.TWITTER_API_SECRET || '',
        accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
    },
    rapidApi: {
        key: process.env.RAPID_API_KEY || ''
    }
};

export default config; 