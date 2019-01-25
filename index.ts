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
    --topic, -t Topic, default to "test"
    --body, -b Payload body to send, it should point to a local file, default to no body
    --username, -u Username, optional
    --password, -p Password, optional
    --clientId, -c Client id, default to a random value
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
    username: {
      type: 'string',
      alias: 'u',
      default: ''
    },
    password: {
      type: 'string',
      alias: 'p',
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
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

async function runTask(mqttUrl: string, options: MyOptions) {
  console.log(options);
  const mqttService = await MqttService.connect({ brokerUrl: mqttUrl }, options.clientId, options.username, options.password)

  while (true) {
    await progress.incrementPromise(mqttService.publish(options.topic, options.qos, options.body));

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
    body: pBody
  };

  const tasks = Array.from(Array(optionsParser.parallelism))
  .map(() => runTask(mqttUrl, optionsParser));

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
