# trakt-utils

Opinionated utils for [trakt.tv api](docs.trakt.apiary.io)

## Install

```
$ npm install trakt-utils --save
```

## Usage

```js
import Trakt from 'trakt-utils';
const trakt = new Trakt('<id>', '<secret>', '<optional-token>');
```

### Api

- `getAccessToken(pin)` - To get a pin you need to open `https://trakt.tv/oauth/applications`, open your application,
open a link from `PIN URL` section, copy the pin.

- `getTimeline(interval)`

- `getReport(interval)`

- `startScrobble(media, progress)`

- `pauseScrobble(media, progress)`

- `addToHistory(media)`

- `getWatched(type)` - `type` can be either `shows` or `movies`

- `getMovie(id)`

- `getShow(id)`

- `getShowSeasons(id)`

- `getShowSeason(id, season)`

- `getCompleteShows(hashFunction, getCache, setCache, onUpdate)`

Every method returns a promise

## License

MIT © [ewnd9](http://ewnd9.com)
