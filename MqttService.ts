import mqtt, { MqttClient, QoS } from "mqtt";

export class MqttService {
    constructor(private mqttClient: MqttClient) {
    }

    static connect(config: MqttConfig, clientId: string, username: string, password: string): Promise<MqttService> {
        return new Promise((resolve, reject) => {
            const mqttClient = mqtt.connect(config.brokerUrl, {
                clientId: clientId,
                username: username,
                password: password,
                reconnectPeriod: 0
            });

            let lastError: Error | undefined; 

            mqttClient.on("connect", () => {
                console.log(`Mqtt ${config.brokerUrl} connect, clientId ${clientId}`);

                resolve(new MqttService(mqttClient));
            });
            mqttClient.on("close", () => {
                console.log(`Mqtt ${config.brokerUrl} close`);
                reject(lastError || new Error("Failed to connect"))
            });
            mqttClient.on("offline", () => {
                console.log(`Mqtt ${config.brokerUrl} offline`);
            });
            mqttClient.on("reconnect", () => {
                console.log(`Mqtt ${config.brokerUrl} reconnect`);
            });
            mqttClient.on("error", (err) => {
                if (err) {
                    console.error(err);
                    lastError = err;
                }
            });
        });
    }

    publish(topic: string, qos: QoS, payload: Buffer): Promise<void> {
        return new Promise((resolve, reject) => {
            this.mqttClient.publish(
                topic,
                payload,
                { qos },
                (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
        });
    }

    close() {
        return new Promise((resolve) => {
            this.mqttClient.end(false, () => {
                resolve();
            });
        });
    }
}

export interface MqttConfig {
    brokerUrl: string;
}