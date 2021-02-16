# Strict Throttle

Strictly delays (rate limits) the execution of function calls, ensuring the function calls are executed no faster 
than the supplied *limit* times within a given *interval*. The strict throttle operates with a rolling window, such that 
no more than *limit* calls are ever executed within any period of time equal to the *interval*.

### Install

```
$ npm install strict-throttle
```

### Example

```javascript
const throttle = require('strict-throttle')({limit: 2, interval: 1000});
const delay = require('delay');

async function example () {
    const start = Date.now();
    
    function elapsedTime () {
        return Date.now() - start;
    }

    throttle(elapsedTime).then(console.log); // 0
    await delay(950);
    throttle(elapsedTime).then(console.log); // 950
    throttle(elapsedTime).then(console.log); // 1000
    throttle(elapsedTime).then(console.log); // 1950
    throttle(elapsedTime).then(console.log); // 2000
    
    throttle.waitingCount(); // 3
    
    //throttle.abort(); to reject waiting calls
}

example();
```

Similar libraries often use a windowed algorithm, allowing *limit* executions per *interval*. This is sufficient for 
most use cases, but may result in the overuse of the limited resource when bursts are encountered.

## API

### StrictThrottle(options) 

Returns a `throttle` function that delays the execution of function calls according the constraints in the `options`.
When executed, the `throttle` returns a `Promise` that resolves to return value of the supplied function.

#### options

Type: `object`

Both the `limit` and `interval` options must be specified.

##### limit

Type: `number` 

Constraint: Must be a positive integer

Maximum number of calls within an `interval`.

##### interval

Type: `number`

Constraint: Must be a positive integer

Timespan for `limit` in milliseconds.

### throttle.waitingCount()

Return the number of calls waiting to be executed.

### throttle.abort()

Abort pending executions. All calls waiting to be executed are rejected. Note: any ongoing calls that have been executed
are not affected.

## Credits

Original author: Aaron Schinkowitch

Inspired by [p-throttle](https://github.com/sindresorhus/p-throttle).