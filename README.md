# infinite-wget

[![npm version](https://badge.fury.io/js/infinite-wget.svg)](https://badge.fury.io/js/infinite-wget)

A super simple HTTP client for performance tests. It performs infinite HTTP calls on a given url until CTRL+C is pressed...

    > infinite-wget http://httpbin.org/get
    infinite-wget started at 2018-05-15T08:08:46.839Z
    infinite-wget ... 4 (3.90/sec)
    infinite-wget ... 9 (4.86/sec)
    infinite-wget ... 14 (4.88/sec)
    infinite-wget completed (17 success, 0 errors) in 3.8 seconds (4.5/sec)

## Installation

    npm i infinite-wget -g

## Usage

    infinite-wget http://httpbin.org/get

See available options using

    infinite-wget --help

## Available options

- `sleep`, `s`: specify the number of milliseconds to wait between each call, default 0.
- `parallelism`, `p`: number of concurrent calls to perform, default 1.
