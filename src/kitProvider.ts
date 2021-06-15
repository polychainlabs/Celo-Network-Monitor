const {GoogleAuth} = require('google-auth-library');
import {ContractKit, newKitFromWeb3, newKit} from '@celo/contractkit';
import Web3 from 'web3';

/** ContractKit Provider always returns a fresh ContractKit for you to use. */ 
export default class KitProvider {
    #rpcUrl: string;

    constructor() {
        // Set RPC URL
        if (process.env.RPC_URL) { 
            this.#rpcUrl = process.env.RPC_URL; 
        } else {
            this.#rpcUrl = "http://localhost:8545";
        }
    }
    /** Get a new kit */
    async getKit(): Promise<ContractKit> {
        if (process.env.IAP_AUDIENCE) { 
            return this.getIapEnabledContractKit(); 
        }
        return newKit(this.#rpcUrl);
    }

    async getIapEnabledContractKit(): Promise<ContractKit> {
        const targetAudience = process.env.IAP_AUDIENCE;
        // IAP
        const auth = new GoogleAuth();
        const client = await auth.getIdTokenClient(targetAudience);
        const metadata = await client.getRequestMetadataAsync();
        // Web3
        const web3 = new Web3();
        web3.setProvider(new Web3.providers.HttpProvider(this.#rpcUrl, {
            headers: [{
                name: "Authorization",
                value: metadata.headers.Authorization
            }]
        }));
        // ContractKit
        return newKitFromWeb3(web3);
    }
}