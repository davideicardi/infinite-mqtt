"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mqtt_1 = __importDefault(require("mqtt"));
class MqttService {
    constructor(mqttClient) {
        this.mqttClient = mqttClient;
    }
    static connect(config, clientId, username, password) {
        return new Promise((resolve, reject) => {
            const mqttClient = mqtt_1.default.connect(config.brokerUrl, {
                clientId: clientId,
                username: username,
                password: password,
                reconnectPeriod: 0
            });
            let lastError;
            mqttClient.on("connect", () => {
                console.log(`Mqtt ${config.brokerUrl} connect, clientId ${clientId}`);
                resolve(new MqttService(mqttClient));
            });
            mqttClient.on("close", () => {
                console.log(`Mqtt ${config.brokerUrl} close`);
                reject(lastError || new Error("Failed to connect"));
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
    publish(topic, qos, payload) {
        return new Promise((resolve, reject) => {
            this.mqttClient.publish(topic, payload, { qos }, (err) => {
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
exports.MqttService = MqttService;
