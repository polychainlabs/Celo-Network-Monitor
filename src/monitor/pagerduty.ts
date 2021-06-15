const axios = require('axios').default;

const v2eventEndPoint = 'https://events.pagerduty.com/v2/enqueue';
const v2changeEventEndPoint = 'https://events.pagerduty.com/v2/change/enqueue';

export interface PagerDutyAlerterInterface {
    change(summary: string): Promise<void>
    page(title: string, details: string, throttleSeconds:number, alertKey?: string): Promise<void>
}

export default class PagerDutyAlerter implements PagerDutyAlerterInterface {
    #pdIntegrationKey: any;

    #debug: boolean

    constructor(pdIntegrationKey: string, debug: boolean) {
      this.#pdIntegrationKey = pdIntegrationKey;
      this.#debug = debug;
    }

    async change(summary: string) {
      const data = JSON.stringify({
        routing_key: this.#pdIntegrationKey,
        event_action: 'change',
        dedup_key: '',
        payload: {
          summary,
          source: 'Celo Network Monitor',
          severity: 'low',
        },
      });

      const config = {
        method: 'post',
        url: v2changeEventEndPoint,
        headers: {
          'Content-Type': 'application/json',
        },
        data,
      };

      axios(config)
        .then((response: any) => {
          if (response.data.status !== 'success') {
            throw new Error(JSON.stringify(response.data));
          }
          console.log(JSON.stringify(response.data));
        })
        .catch((error: any) => {
          throw new Error(error);
        });
    }

    async page(title: string, details: string): Promise<void> {
      if (this.#debug) {
        console.log(`\nWOULD HAVE PAGED WITH:\n- title:${title}\n- details:${details}\n`);
        return;
      }

      console.log(`Paging: ${title}`);

      const data = JSON.stringify(
        {
          payload: {
            summary: `${title} - ${details}`,
            severity: 'critical',
            source: 'Celo Network Monitor',
            class: 'external monitor',
            custom_details: {
              info: details,
            },
          },
          routing_key: this.#pdIntegrationKey,
          dedup_key: `${title}`,
          event_action: 'trigger',
          client: 'Celo External Monitor',
          // links: [
          //   {
          //     href: 'http://pagerduty.example.com',
          //     text: 'An example link.',
          //   },
          // ],
        },
      );

      const config = {
        method: 'post',
        url: v2eventEndPoint,
        headers: {
          'Content-Type': 'application/json',
        },
        data,
      };
      axios(config)
        .then((response: any) => {
          if (response.data.status !== 'success') {
            throw new Error(JSON.stringify(response.data));
          }
          console.log(JSON.stringify(response.data));
        })
        .catch((error: any) => {
          throw new Error(error);
        });
    }
}
