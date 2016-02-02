import test from 'ava';
import 'babel-core/register';
import moment from 'moment';
import Trakt from './../src/index';
import * as utils from './../src/utils';

const id = process.env.TRAKT_ID;
const secret = process.env.TRAKT_SECRET;
const token = process.env.TRAKT_TOKEN;

const trakt = new Trakt(id, secret, token);

test('#getTimeline', async t => {
  const data = await trakt.getTimeline();
  t.ok(data.length);

  t.ok(data[0].first_aired);
  t.ok(data[0].episode);
  t.ok(data[0].show);
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

  t.ok(data);
});

test('#getReport', async t => {
  const data = await trakt.getReport();
  t.ok(data);
});

test('#search', async t => {
  const data = await trakt.search('arrow', 'show');
  t.is('tt2193021', data[0].show.ids.imdb);
});

test('#startScrobble', async t => {
  const data = await trakt.startScrobble({ type: 'movie', imdb: 'tt1291570' }, 1);
  t.is('start', data.action);
});

test('#pauseScrobble', async t => {
  const data = await trakt.pauseScrobble({ type: 'movie', imdb: 'tt1291570' }, 1);
  t.is('pause', data.action);
});

test('#addToHistory', async t => {
  const data = await trakt.addToHistory({ type: 'movie', imdb: 'tt1291570' });
  t.is(1, data.added.movies);
});

test('#getWatched', async t => {
  const movies = await trakt.getWatched('movies');
  t.ok(movies);
  const shows = await trakt.getWatched('shows');
  t.ok(shows);
});

// test('#getAccessToken', async t => {
//   const token = await trakt.getAccessToken('');
//   t.ok('string', token);
// });
