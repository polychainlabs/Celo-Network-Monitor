import { ContractKit, newKitFromWeb3 } from "@celo/contractkit";
import { AlertInterface, AlertTest } from "./alert";
import { Block } from 'web3-eth/types/index'
import Metrics from "./metrics";
import Addresses from "./addresses";
import Web3 from "web3";

export type MonitorArgs = {
    kit: ContractKit
    blocks: Block[]
    alert: AlertInterface
    addresses: Addresses
    lastBlockProcessed: number
}

export function NewMonitorArgs(): MonitorArgs {
    const web3 = new Web3();
    web3.setProvider(new Web3.providers.HttpProvider('https://fake.url'));
    const args: MonitorArgs = {
        kit: newKitFromWeb3(web3),
        blocks: new Array<Block>(),
        alert: new AlertTest(),
        addresses: new Addresses(),
        lastBlockProcessed: -1
    }
    return args
}

export default abstract class MonitorBase implements MonitorArgs {
    kit: ContractKit
    blocks: Block[]
    alert: AlertInterface
    addresses: Addresses
    lastBlockProcessed: number

    protected metrics: Metrics
    protected latestBlock: Block
    protected readonly epochSize = 17280

    constructor(args: MonitorArgs) {
        this.kit = args.kit
        this.blocks = args.blocks
        this.alert = args.alert
        this.addresses = args.addresses
        this.lastBlockProcessed = args.lastBlockProcessed

        this.latestBlock = args.blocks[args.blocks.length-1]
        this.metrics = new Metrics(this.constructor.name)
    }

    async monitor(): Promise<void> {
        console.log(`CeloMonitor::${this.constructor.name}() - Started`)
        const start = new Date().getTime()

        await this.run()

        const duration = Math.floor(new Date().getTime() - start)/1000;
        console.log(`CeloMonitor::${this.constructor.name}() - Finished in ${duration}s`);
    }

    protected abstract async run(): Promise<void>

    /** Is this run processing a distinct epoch from the last successful run? */
    isProcessingNewEpoch() {
        // Still initializing.
        if (this.lastBlockProcessed < 0) {
            return false
        }
        const currentEpoch = Math.floor(this.latestBlock.number / this.epochSize)
        const lastEpoch = Math.floor(this.lastBlockProcessed / this.epochSize)
        // Still processing the same epoch.
        if (currentEpoch == lastEpoch) {
            return false
        }
        // Different epochs
        return true
    }

    /** Is `within` number of blocks of a new epoch */
    isNearNewEpoch(within: number): boolean {
        const blocksIntoEpoch = this.latestBlock.number % this.epochSize
        const blocksFromEpoch = Math.min(blocksIntoEpoch, this.epochSize - blocksIntoEpoch)
        return blocksFromEpoch <= within
    }

    /** Do the provided blocks include an epoch transition */
    doBlocksIncludeEpochTransision(): boolean {
        const blocksIntoEpoch = this.latestBlock.number % this.epochSize
        return this.blocks.length > blocksIntoEpoch
    }
}
