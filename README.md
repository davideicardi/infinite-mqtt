# infinite-mqtt

[![npm version](https://badge.fury.io/js/infinite-mqtt.svg)](https://badge.fury.io/js/infinite-mqtt)

A super simple MQTT client for performance tests. It performs infinite MQTT publish on a given url+topic until CTRL+C is pressed. Print performance statistics during the test and at the end.

    > infinite-mqtt mqtt://broker.mqttdashboard.com:1883 -t my-topic -b ./my-payload.json -s 1000
    infinite-mqtt started at 2018-05-15T08:08:46.839Z
    infinite-mqtt ... 4 (3.90/sec)
    infinite-mqtt ... 9 (4.86/sec)
    infinite-mqtt ... 14 (4.88/sec)
    infinite-mqtt completed (17 success, 0 errors) in 3.8 seconds (4.5/sec)

## Installation

    npm i infinite-mqtt -g

## Usage

    infinite-mqtt mqtt://broker.mqttdashboard.com:1883 -t my-topic -b ./my-payload.json -s 1000

See available options using

    infinite-mqtt --help

## Available options

- `sleep`, `s`: specify the number of milliseconds to wait between each call, default 0.
- `parallelism`, `p`: number of concurrent calls to perform, default 1.
- TODO ...