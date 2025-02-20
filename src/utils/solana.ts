import { Connection } from "@solana/web3.js";

const RPC_ENDPOINTS = [
    "https://api.mainnet-beta.solana.com",
    "https://solana-api.projectserum.com",
    "https://rpc.ankr.com/solana",
    "https://ssc-dao.genesysgo.net"
];

export async function getWorkingConnection(): Promise<Connection> {
    for (const endpoint of RPC_ENDPOINTS) {
        try {
            const connection = new Connection(endpoint, 'confirmed');
            await connection.getSlot();
            console.log(`Connected to ${endpoint}`);
            return connection;
        } catch (error) {
            console.log(`Failed to connect to ${endpoint}, trying next...`);
        }
    }
    throw new Error("Unable to connect to any Solana RPC endpoint");
} 