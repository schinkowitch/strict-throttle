declare namespace StrictThrottle {
    interface Options {
        /**
         Maximum number of calls within an `interval`.
         */
        limit: number;

        /**
         Timespan for `limit` in milliseconds.
         */
        interval: number;
    }

    interface Throttle {
        /**
         @returns The number of calls waiting to be executed.
         */
        waitingCount(): number;

        /**
         Reject the pending calls that are waiting to be executed. All calls waiting to be executed will be rejected
         with an Error. Any ongoing calls that have already been executed are not affected.
         */
        abort(): void;

        /**
         Throttle execution of the supplied function.

         @param fn - Promise-returning/async function.
         @returns The promise returned by calling fn()
         */
        <ReturnType>(fn: () => PromiseLike<ReturnType> | ReturnType): Promise<ReturnType>;
    }
}

/**
Execute function calls, delaying execution when necessary to limit the execution rate to the throttling constraints
provided in the options.

@param options Throttle options including the limit and interval
@returns A throttle function
 */
declare function StrictThrottle(options: StrictThrottle.Options): StrictThrottle.Throttle;

export = StrictThrottle;