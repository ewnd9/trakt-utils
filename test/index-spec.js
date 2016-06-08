import test from 'ava';
import 'babel-core/register';

import moment from 'moment';
import Trakt from './../src/index';
import * as utils from './../src/utils';

const id = process.env.TRAKT_ID;
const secret = process.env.TRAKT_SECRET;
const token = process.env.TRAKT_TOKEN;

const trakt = new Trakt(id, secret, token);

const civilWarMovieId = 'tt3498820';

const flashShowId = 'tt3107288';
const arrowShowId = 'tt2193021';

test('#getTimeline', async t => {
  const data = await trakt.getTimeline();
  t.truthy(data.length);

  t.truthy(data[0].first_aired);
  t.truthy(data[0].episode);
  t.truthy(data[0].show);
});

test('#generateReport', async t => {
  const now = moment();
  const ep = days => ({ first_aired: moment(now).add(days, 'days').toISOString() });

  const offset = 3;
  const data = [
    ep(offset), // 3 days after today
    ep(offset + 7),
    ep(offset + 7 * 2),
    ep(offset + 7 * 3), // 4 series in row
    ep(offset + 7 * 3 + 14), // next episode in 2 weeks
    ep(offset + 7 * 3 + 14 + 7), // 2 series in row
    ep(offset + 7 * 3 + 14 + 7 + 21), // next episode in 3 weeks
    ep(offset + 7 * 3 + 14 + 7 + 21 + 7) // next episode in 3 weeks
  ];

  const report = utils.generateReport(data);
  t.is(3, report.future.length);

  t.is(2, report.future[0].gap);
  t.is(4, report.future[0].episodes.length);

  t.is(14, report.future[1].gap);
  t.is(2, report.future[1].episodes.length);

  t.is(21, report.future[2].gap);
  t.is(2, report.future[2].episodes.length);

  t.truthy(data);
});

test('#getReport', async t => {
  const data = await trakt.getReport();
  t.truthy(data);
});

test('#search', async t => {
  const data = await trakt.search('arrow', 'show');
  t.is(arrowShowId, data[0].show.ids.imdb);
});

test.serial('#startScrobble', async t => {
  const data = await trakt.startScrobble({ type: 'movie', imdb: civilWarMovieId }, 1);
  t.is('start', data.action);
});

test.serial('#pauseScrobble', async t => {
  const data = await trakt.pauseScrobble({ type: 'movie', imdb: civilWarMovieId }, 1);
  t.is('pause', data.action);
});

test('#addToHistory', async t => {
  const data = await trakt.addToHistory({ type: 'movie', imdb: civilWarMovieId });
  t.is(1, data.added.movies);
});

test('#getWatched', async t => {
  const movies = await trakt.getWatched('movies');
  t.truthy(movies);
  const shows = await trakt.getWatched('shows');
  t.truthy(shows);
});

test('#getMovie', async t => {
  const movie = await trakt.getMovie(civilWarMovieId, 'images');
  t.truthy(movie.images.poster.thumb);
});

test('#getShow', async t => {
  const show = await trakt.getShow(flashShowId, 'images');
  t.truthy(show.images.poster.thumb);
});

test('#getShowSeasons', async t => {
  const seasons = await trakt.getShowSeasons(flashShowId, 'images');
  t.truthy(seasons[0].number === 1);
  t.truthy(seasons[0].images.poster.thumb);
});

test('#getShowSeason', async t => {
  const season = await trakt.getShowSeason(flashShowId, 2, 'images');
  t.truthy(season[0].images.screenshot.thumb);
});

test.only('#getCompleteShows', async t => {
  const hashFunction = () => null;
  const onUpdate = () => '';
  const getCache = () => Promise.reject(null);
  const setCache = () => Promise.resolve();

  const result = await trakt.getCompleteShows(hashFunction, getCache, setCache, onUpdate);
  
  t.deepEqual(Object.keys(result[0]), [ 'title', 'year', 'ids', 'status', 'seasons', 'episodes' ]);
  t.deepEqual(Object.keys(result[0].seasons[0]), [ 'number', 'episodesCount', 'firstAired', 'airedEpisodes' ]);
  t.deepEqual(Object.keys(result[0].episodes[0]), [ 'season', 'number', 'title', 'ids', 'aired', 'watched', 'watchedDate' ]);
});

// test('#getAccessToken', async t => {
//   const token = await trakt.getAccessToken('');
//   t.truthy('string', token);
// });
