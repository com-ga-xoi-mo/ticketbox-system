## ADDED Requirements

### Requirement: Mobile ticket cache freshness

The mobile app SHALL keep the local ticket cache as current as possible while online by
refreshing it incrementally on a recurring schedule and on connectivity restore, using
the delta endpoint with the last successful sync timestamp, so that tickets issued or
voided before the device loses connectivity are reflected in the local cache.

#### Scenario: First cache load for an assignment is a full download

- **WHEN** the staff selects an assignment and no successful cache sync timestamp exists yet for it
- **THEN** the app SHALL request the full ticket cache and store it locally, recording the server-provided sync timestamp

#### Scenario: Subsequent refresh uses an incremental delta

- **WHEN** the app refreshes a cache that already has a recorded last-sync timestamp
- **THEN** the app SHALL request the cache with `since` set to that timestamp and apply the returned upserted and voided entries to the local cache without re-downloading the full set

#### Scenario: Cache refreshes on a recurring schedule while online

- **WHEN** the device is online, authenticated, and on the scanning context
- **THEN** the app SHALL re-refresh the ticket cache on a recurring interval so the local snapshot tracks server changes up to the moment connectivity is lost

#### Scenario: Cache refreshes immediately on reconnect

- **WHEN** connectivity is restored after being offline
- **THEN** the app SHALL trigger a cache refresh so newly issued or voided tickets are reflected as soon as the network returns

#### Scenario: Refresh is single-flight

- **WHEN** a recurring or reconnect refresh is requested while a cache download is already in progress
- **THEN** the app SHALL NOT start an overlapping download and SHALL reuse or skip in favor of the active refresh

#### Scenario: Failed refresh preserves the existing cache

- **WHEN** a cache refresh request fails (network or server error)
- **THEN** the app SHALL keep the previously cached entries and SHALL NOT clear or corrupt the local cache, retrying on the next scheduled refresh or reconnect

#### Scenario: Offline evaluation is unchanged

- **WHEN** the device is offline and evaluates a scan against the local cache
- **THEN** the cache freshness behavior SHALL NOT change how an offline scan is evaluated; it only affects how current the cached data is
