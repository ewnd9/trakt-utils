import _ from 'lodash';

export const WATCHED = 'WATCHED';
export const AIRED = 'AIRED';
export const UNAIRED = 'UNAIRED';

/*
[
  {
    "title": "[string]",
    "year": "[number]",
    "ids": {
      "trakt": "[number]",
      "slug": "[string]",
      "tvdb": "[number]",
      "imdb": "[string]",
      "tmdb": "[number]",
      "tvrage": "[object]"
    },
    "status": "[string]",
    "seasons": [
      {
        "number": "[number]",
        "episodesCount": "[number]",
        "firstAired": "[string]",
        "airedEpisodes": "[number]"
      }
    ],
    "episodes": [
      {
        "season": "[number]",
        "number": "[number]",
        "title": "[string]",
        "ids": {
          "trakt": "[number]",
          "tvdb": "[number]",
          "imdb": "[object]",
          "tmdb": "[number]",
          "tvrage": "[number]"
        },
        "aired": "[boolean]",
        "watched": "[boolean]",
        "watchedDate": "[string]"
      }
    ]
  }
]
*/
export default function(hashFunction, getCache, setCache, onUpdate) {

  const trakt = this;

  return trakt
    .getWatched('shows')
    .then(stats => stats
      .reduce((total, stat, index) => {
        return total.then(result => {
          const hash = hashFunction(stat);

          let isCached = false;

          const dataPromise =
            getCache(stat, hash)
              .then(report => {
                isCached = true;
                return report
              }, () => fetchShowInfo(stat)
                .then(report => {
                  return setCache(stat, hash, report)
                    .then(() => report);
                })
              );

          return dataPromise
            .then(report => {
              onUpdate(stat.show, isCached, index, stats.length);

              result.push(report);
              return result;
            });
        });
      }, Promise.resolve([]))
  );

  function fetchShowInfo(show) {
    const showSlug = show.show.ids.slug;
    const watchedEpisodes = flatEpisodes(show.seasons);

    let status;
    let fullSeasons;

    return trakt
      .request(`/shows/${showSlug}?extended=full`)
      .then(_show => {
        show.show.status = _show.status;
        return trakt.request(`/shows/${showSlug}/seasons?extended=full`);
      })
      .then(_fullSeasons => {
        fullSeasons = _fullSeasons;
        show.show.seasons = mergeSeasons(show.seasons, fullSeasons);

        return trakt.request(`/shows/${showSlug}/seasons?extended=episodes`);
      })
      .then(episodesSeasons => {
        show.show.episodes = normalizeEpisodes(episodesSeasons, fullSeasons, watchedEpisodes);
        return show.show;
      });
  }

  function flatEpisodes(seasons) {
    return _
      .flatten(seasons.map(s => s.episodes.map(ep => {
        ep.season = s.number;
        return ep;
      })))
      .filter(ep => ep.season > 0);
  }

  function mergeSeasons(seasons, fullSeasons) {
    return fullSeasons.map(fullSeason => {
      const season = seasons.find(_ => _.number === fullSeason.number) || {};

      return {
        number: fullSeason.number,
        episodesCount: fullSeason.episode_count,
        firstAired: fullSeason.first_aired,
        airedEpisodes: fullSeason.aired_episodes
      };
    });
  }

  function normalizeEpisodes(episodesSeasons, fullSeasons, watchedEpisodes) {
    return flatEpisodes(episodesSeasons)
      .map(ep => {
        ep.aired = ep.number <= fullSeasons.find(s => s.number == ep.season).aired_episodes;

        const watchedEpisode = watchedEpisodes.find(_ep => _ep.season == ep.season && _ep.number == ep.number);

        ep.watched = !!watchedEpisode;
        ep.watchedDate = watchedEpisode && watchedEpisode.last_watched_at;

        return ep;
      });
  }
};
