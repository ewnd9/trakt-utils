import got from 'got';
import moment from 'moment';
import Promise from 'bluebird';
import _ from 'lodash';
import { generateReport } from './utils';
import * as traktUtils from './format';

const baseUrl = 'https://api-v2launch.trakt.tv';

function Trakt(id, secret, token) {
  this.id = id;
  this.secret = secret;
  this.token = token;
};

Trakt.prototype.getAccessToken = function(pin) {
  const params = {
    method: 'POST',
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      code: pin,
      client_id: this.id,
      client_secret: this.secret,
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      grant_type: 'authorization_code'
    })
  };

  return got(baseUrl + '/oauth/token', params).then(({ body }) => {
    return body.access_token;
  });
};

Trakt.prototype.request = function(url, options = {}) {
  const params = {
    ...options,
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer ' + this.token,
      'trakt-api-key': this.id,
      'trakt-api-version': '2'
    }
  };

  if (params.body) {
    params.body = JSON.stringify(params.body);
  }

  return got(baseUrl + url, params).then(_ => _.body);
};

Trakt.prototype.getCalendar = function(interval) {
	const startDate = moment().add(-10, 'day').format('YYYY-MM-DD');
	return this.request(`/calendars/my/shows/${startDate}/${interval * 2}`);
};

Trakt.prototype.getHistory = function(show) {
	return this.request(`/sync/history/shows/${show}`);
};

Trakt.prototype.getWatched = function(type) {
	return this.request(`/sync/watched/${type}`);
};

Trakt.prototype.getTimeline = function(interval) {
  let episodes;

  return this
    .getCalendar(parseInt(interval) || 30)
    .then(body => {
      const shows = {};

      episodes = body.filter(ep => ep.episode.season > 0).map(ep => {
        ep.date = new Date(ep.first_aired);
        shows[ep.show.ids.trakt] = true;
        return ep;
      });

      return Promise.map(Object.keys(shows), (curr) => {
        return this.getHistory(curr).then(body => {
          body.forEach((episode) => {
            if (episode.action === 'watch') {
              const x = episodes.find(x => {
                return x.episode.season === episode.episode.season &&
                       x.episode.number === episode.episode.number &&
                       x.show.ids.trakt === episode.show.ids.trakt;
              });

              if (x) {
                x.watched = true;
              }
            }
          });
        });
      }, { concurrency: 5 });
    }).then(() => {
      return episodes;
    });
};

Trakt.prototype.getReport = function(interval) {
  return this
    .getTimeline(interval)
    .then(episodes => {
      const shows = _.groupBy(episodes, ep => ep.show.title);
      const now = moment();

      const report = _.reduce(shows, (total, eps, showTitle) => {
        total[showTitle] = generateReport(eps, now);
        return total;
  		}, {});

      const reportArray = _.map(report, (report, show) => ({ show, report }));

      const HAS_1_AIRED = 'HAS_1_AIRED';
      const MORE_THAN_1_AIRED = 'MORE_THAN_1_AIRED';
      const HAS_FUTURE = 'HAS_FUTURE';
      const NO_EPISODES = 'NO_EPISODES';

      const result = _.groupBy(reportArray, ({ report }) => {
        if (report.aired.length === 1) {
          return HAS_1_AIRED;
        } else if (report.aired.length > 1) {
          return MORE_THAN_1_AIRED;
        } if (report.future.length > 0) {
          return HAS_FUTURE;
        } else {
          return NO_EPISODES;
        }
      });

      const sortAired = (
        (a, b) => a.report.aired[a.report.aired.length - 1].date - b.report.aired[b.report.aired.length - 1].date
      );

      result[HAS_1_AIRED] = result[HAS_1_AIRED] || [];
      result[HAS_1_AIRED].sort(sortAired);
      result[MORE_THAN_1_AIRED] = result[MORE_THAN_1_AIRED] || [];
      result[MORE_THAN_1_AIRED].sort(sortAired);
      result[HAS_FUTURE] = result[HAS_FUTURE] || [];
      result[HAS_FUTURE].sort((a, b) => a.report.future[0].episodes[0].date - b.report.future[0].episodes[0].date);

      return [result[HAS_1_AIRED], result[HAS_FUTURE], result[MORE_THAN_1_AIRED]];
    });
};

Trakt.prototype.startScrobble = function(media, progress) {
  return this.request('/scrobble/start', {
    method: 'POST',
    body: traktUtils.formatScrobbleData({ media, progress })
  });
};

Trakt.prototype.pauseScrobble = function(media, progress) {
  return this.request('/scrobble/pause', {
    method: 'POST',
    body: traktUtils.formatScrobbleData({ media, progress })
  });
};

Trakt.prototype.addToHistory = function(media) {
  return this.request('/sync/history', {
    method: 'POST',
    body: traktUtils.formatHistoryData(media)
  });
};

Trakt.prototype.search = function(query, type) {
  return this.request('/search', { query: { query, type } });
};

export default Trakt;
