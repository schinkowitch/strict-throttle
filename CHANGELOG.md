# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased
### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security

## 2.0.0 - 2022-02-01
### Changed
- Drop nodejs v10 support

## 1.0.1 - 2021-02-16
### Changed
- Added "engines" to package.json to explicitly state supported node.js versions (10.7.0 or higher)
- Improve timing accuracy and throughput by using nanosecond calculations and scheduling executions using [nanotimer](https://github.com/Krb686/nanotimer)

## 1.0.0 - 2021-02-15 - Initial release
### Added
- Strict Throttle that delays (rate limits) the execution of function calls, ensuring the function calls are executed
  no faster than the supplied *limit* times within a given *interval*. 