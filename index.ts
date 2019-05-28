#!/usr/bin/env node

import {ProgressLogger} from "progress-logger-js";
import fs from "fs";
import {MqttService} from "./MqttService";
import { QoS } from "mqtt";
import crypto from "crypto";
const meow = require("meow");

const progress = new ProgressLogger({
  label: "infinite-mqtt",
  logInterval: 1000
});

const cli = meow(`
	Usage
	  $ infinite-mqtt <url> [OPTIONS]

  Options
    --topic, -t Topic, default to "test". "{CLIENTID}" placeholder will be replaced with the actual client id.
    --body, -b Payload body to send, it should point to a local file, default to no body
    --username, -u Username, optional
    --password, -w Password, optional
    --clientId, -c Client id, default to a random value
    --unique,  Unique client id, add the task index to the client id.
    --qos, q QoS, options default 1
    --parallelism, -p  Parallel calls, default 1
    --sleep, -s  Sleep ms, default 0

	Examples
	  $ infinite-mqtt mqtt://broker.mqttdashboard.com:1883 -t davide/test/hello -b ./my-payload.json -s 1000
`,
{

	flags: {
    parallelism: {
			type: 'string',
      alias: 'p',
      default: '1'
		},
		sleep: {
			type: 'string',
      alias: 's',
      default: '0'
    },
    topic: {
      type: 'string',
      alias: 't',
      default: 'test'
    },
    clientId: {
      type: 'string',
      alias: 'c',
      default: crypto.randomBytes(20).toString('hex')
    },
    unique: {
      type: 'boolean',
      default: false
    },
    username: {
      type: 'string',
      alias: 'u',
      default: ''
    },
    password: {
      type: 'string',
      alias: 'w',
      default: ''
    },
    qos: {
      type: 'number',
      alias: 'q',
      default: 1
    },
    body: {
      type: 'string',
      alias: 'b',
      default: undefined
    }
	}
});

interface MyOptions {
  sleep: number;
  parallelism: number;
  topic: string;
  clientId: string;
  username: string;
  password: string;
  body: Buffer;
  qos: QoS;
  brokerUrl: string;
  unique: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

async function runTask(taskId: number, mqttUrl: string, options: MyOptions) {
  let clientId = options.clientId;
  if (options.unique) {
    clientId += "-" + taskId;
  }

  const mqttService = await MqttService.connect({ brokerUrl: mqttUrl }, clientId, options.username, options.password)

  const mqttTopic = options.topic.replace(/\{CLIENTID\}/, clientId);

  while (true) {
    await progress.incrementPromise(mqttService.publish(mqttTopic, options.qos, options.body));

    if (options.sleep > 0) {
      await sleep(options.sleep);
    }
  }
}

async function run(mqttUrl: string, options: any) {
  if (!mqttUrl) {
    throw new Error("url not provided");
  }

  const pSleep = parseInt(options.sleep, 10);
  if (isNaN(pSleep)) {
    throw new Error("Invalid sleep parameter");
  }
  const pParallelism = parseInt(options.parallelism, 10);
  if (isNaN(pParallelism)) {
    throw new Error("Invalid parallelism parameter");
  }
  const pBody = options.body && fs.readFileSync(options.body);

  const optionsParser: MyOptions = {
    sleep: pSleep,
    parallelism: pParallelism,
    topic: options.topic,
    clientId: options.clientId,
    password: options.password,
    username: options.username,
    qos: options.qos,
    brokerUrl: mqttUrl,
    body: pBody,
    unique: options.unique
  };

  const tasks = Array.from(Array(optionsParser.parallelism))
  .map((v, i) => runTask(i, mqttUrl, optionsParser));

  return tasks;
}

run(cli.input[0], cli.flags)
.catch(console.error.bind(console));

process.on('SIGINT', function() {
  progress.end();
  for (const err of progress.stats().errors) {
    console.log(err);
  }

  process.exit();
});
