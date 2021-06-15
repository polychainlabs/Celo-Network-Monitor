import { IncomingWebhook, IncomingWebhookSendArguments } from '@slack/webhook';
// eslint-disable-next-line import/no-unresolved,import/extensions
import PagerDutyAlerter from './pagerduty';

export interface AlertInterface {
    slack(text: string, throttleSeconds?: number, alertKey?: string): Promise<void>
    slackWarn(text: string, throttleSeconds?: number, alertKey?: string): Promise<void>
    slackError(text: string, throttleSeconds?: number, alertKey?: string): Promise<void>
    page(title: string, details: string): Promise<void>
    change(summary: string): Promise<void>
}

export class AlertTest implements AlertInterface {
    async slack(text: string, throttleSeconds: number, alertKey?: string): Promise<void> {}
    async slackWarn(text: string, throttleSeconds: number, alertKey?: string): Promise<void> {}
    async slackError(text: string, throttleSeconds: number, alertKey?: string): Promise<void> {}
    async page(title: string, details: string): Promise<void> {}
    async change(summary: string): Promise<void> {}
}

export default class Alert implements AlertInterface {
    #slackClient: IncomingWebhook;
    #slackChannel: string;
    #slackThrottle: Map<string, Date>;

    #debug: boolean;

    #pd: PagerDutyAlerter;

    constructor(slackUrl: string, slackChannel: string, pdIntegrationKey: string, debug: boolean) {
        this.#slackClient = new IncomingWebhook(slackUrl);
        this.#slackChannel = slackChannel;
        this.#slackThrottle = new Map();

        this.#pd = new PagerDutyAlerter(pdIntegrationKey, debug);
        this.#debug = debug;
    }

    async change(summary: string): Promise<void> {
        await this.#pd.change(summary);
    }

    /** Send a slack message */
    async slackWarn(text: string, throttleSeconds=60, alertKey?: string): Promise<void> { 
        await this.slack(":warning: " + text, throttleSeconds, alertKey)
    } 
    async slackError(text: string, throttleSeconds=60, alertKey?: string): Promise<void> { 
        await this.slack(":bangbang: " + text, throttleSeconds, alertKey)
    } 
    async slack(text: string, throttleSeconds=60, alertKey?: string): Promise<void> {
        alertKey = alertKey || text;

        if (this.#debug) {
            console.log(`\nWOULD HAVE SLACKED WITH:\n- message: ${text}\n`)
            return
        }

        if (this.shouldAlert(this.#slackThrottle, alertKey, throttleSeconds)) {
            console.log(`Slack Alerting: ${text}`);
            const data: IncomingWebhookSendArguments = {
                channel: this.#slackChannel,
                username: "Celo Network Monitor",
                text: text
            };
            await this.#slackClient.send(data);
        }
    }

    /** Page us */
    async page(title: string, details: string): Promise<void> {
        try {
            if (this.#debug) {
                console.log(`\nWOULD HAVE PAGED WITH:\n- title:${title}\n- details:${details}\n`);
                return;
            }
            await this.#pd.page(title, details);
            await this.slackError(`Paging with title: \`${title}\``);
        } catch(e) {
            this.slack(`Paging failed due to error: ${e}`, 30, "page-error")
            throw new Error(e)
        }
    }

    /** if we've already sent this exact alert in the past `x` seconds, then do not re-alert */
    shouldAlert(throttle: Map<string, Date>, key: string, throttleSeconds: number): boolean {
        if (!throttle.has(key)) {
            throttle.set(key, new Date());
            return true;
        }
    
        const now = new Date().getTime();
        const lastAlertTime = throttle.get(key)?.getTime() || 0;
        const secondsSinceAlerted = (now - lastAlertTime)/1000;

        if (secondsSinceAlerted > throttleSeconds) {
            // We've passed our throttle delay period
            throttle.set(key, new Date());
            return true;
        }
        return false;
    }

}

/** Address Explorer Url */
export function addressExplorerUrl(address: string): string {
    return `https://explorer.celo.org/address/${address}`
}
export function slackAddressDetails(address: string): string {
    if (isValidAddress(address)) {
        return `[<${addressExplorerUrl(address)}|Details>]`
    } 
    return ""
}
/** Block Explorer Url */
export function blockExplorerUrl(blockNumber: number): string {
    return `https://explorer.celo.org/blocks/${blockNumber}`
}
export function slackBlockDetails(blockNumber: number): string {
    return `[<${blockExplorerUrl(blockNumber)}|Details>]`
}

function isValidAddress(address: string): boolean {
    return address.match(/^[a-zA-Z0-9]*$/) != null
}
