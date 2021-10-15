#!/usr/bin/env node

import { ProgressLogger } from "progress-logger-js";
import fs from "fs";
import { MqttService } from "./MqttService.js";
import { QoS } from "mqtt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import meow from "meow";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

let progress: ProgressLogger;
const tasks = new Array<TaskConnection>()

const appVersion = loadPackageJson().version;
const cli = meow(`
Version ${appVersion}
Usage
  $ infinite-mqtt <url> [OPTIONS]

Options
  --topic, -t Topic, default to "test". "{CLIENTID}" placeholder will be replaced with the actual client id.
  --body, -b Payload body to send, it should point to a local file, default to no body
  --username, -u Username, optional
  --password, -w Password, optional
  --jwtSecret, -j Instead of a password you can pass a jwt secret as base 64. In this case a token will be created with the clientId as issuer.
  --clientId, -c Client id, default to a random value
  --unique,  Unique client id, add the task index to the client id.
  --qos, q QoS, options default 1
  --parallelism, -p  Parallel calls, default 1
  --sleep, -s  Sleep ms, default 0

Examples
  $ infinite-mqtt mqtt://broker.mqttdashboard.com:1883 -t davide/test/hello -b ./my-payload.json -s 1000
`,
  {
    importMeta: import.meta,
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
      jwtSecret: {
        type: 'string',
        alias: 'j',
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
        default: ""
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
  jwtSecret: string;
  body: Buffer;
  qos: QoS;
  brokerUrl: string;
  unique: boolean;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

async function createTask(taskId: number, mqttUrl: string, options: MyOptions): Promise<TaskConnection> {
  let clientId = options.clientId;
  if (options.unique) {
    clientId += "-" + taskId;
  }

  let mqttPassword = options.password;
  if (options.jwtSecret) {
    mqttPassword = jwt.sign({}, Buffer.from(options.jwtSecret, "base64"), { issuer: clientId, expiresIn: "24h" });
  }

  const mqttService = await MqttService.connect({ brokerUrl: mqttUrl }, clientId, options.username, mqttPassword);
  const mqttTopic = options.topic.replace(/\{CLIENTID\}/, clientId);

  return {
    mqttService,
    mqttTopic
  };
}

async function runTask(task: TaskConnection, options: MyOptions) {
  while (true) {
    await progress.incrementPromise(task.mqttService.publish(task.mqttTopic, options.qos, options.body));

    if (options.sleep > 0) {
      await sleep(options.sleep);
    }
  }
}

interface TaskConnection {
  mqttService: MqttService;
  mqttTopic: string;
}

async function run(mqttUrl: string, options: any): Promise<any> {
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
    jwtSecret: options.jwtSecret,
    username: options.username,
    qos: options.qos,
    brokerUrl: mqttUrl,
    body: pBody,
    unique: options.unique
  };

  tasks.length = 0;
  for (let i = 0; i < optionsParser.parallelism; i++) {
    const task = await createTask(i, mqttUrl, optionsParser);
    tasks.push(task);
  }

  progress = new ProgressLogger({
    label: "infinite-mqtt",
    logInterval: 1000
  });

  const promises = tasks.map(t => runTask(t, optionsParser));
  return Promise.all(promises);
}

run(cli.input[0], cli.flags)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

process.on('SIGINT', function () {
  if (progress) {
    progress.end();
    for (const err of progress.stats().errors) {
      console.log(err);
    }
  }

  tasks.map(t => t.mqttService.close());

  process.exit(0);
});


function loadPackageJson() {
  // in the future we can use:
  // import * as pack from './package.json';
  const pack = require("./package.json");
  return pack;
}