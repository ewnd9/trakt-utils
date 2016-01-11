import _ from 'lodash';
import moment from 'moment';
import Promise from 'bluebird';

export function generateReport(eps, now) {
  const result = {
    aired: [],
    future: []
  };

  const notWatched = eps.filter(ep => !ep.watched);
  if (notWatched.length === 0) {
    return result;
  }

  const isEpisodeAired = ep => moment(ep.first_aired).isBefore(now);
  const [airedEpisodes, futureEpisodes] = _.partition(notWatched, isEpisodeAired);

  result.aired = airedEpisodes;

  if (futureEpisodes.length === 0) {
    return result;
  }

  const date = ep => moment(ep.first_aired);

  let currStreak = 1;
  let currGap = date(futureEpisodes[0]).diff(now, 'days');

  const processDiff = (i, diff) => {
    if (diff === 7) {
      currStreak++;
    } else {
      result.future.push({
        gap: currGap,
        episodes: futureEpisodes.slice(i - currStreak, i)
      });

      currStreak = 1;
      currGap = diff;
    }
  };

  for (let i = 1 ; i < futureEpisodes.length ; i++) {
    const diff = date(futureEpisodes[i]).diff(date(futureEpisodes[i - 1]), 'days');
    processDiff(i, diff);
  }

  processDiff(futureEpisodes.length);
  return result;
};
