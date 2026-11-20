// Use only on the dedicated homework collection. Creates two named indexes.
db = db.getSiblingDB('spotify');
const popFilter = { track_genre: 'pop', 'audio_features.danceability': { $gte: 0.7 } };
const workFilter = { explicit: false, 'audio_features.instrumentalness': { $gt: 0.5 }, 'audio_features.speechiness': { $lt: 0.1 } };
function explain(label, cursor) { print('\n' + label); printjson(cursor.explain('executionStats')); }
// $natural forces the baseline collection scan even if other indexes exist.
explain('1 BEFORE: natural collection scan', db.tracks.find(popFilter).sort({ popularity: -1 }).hint({ $natural: 1 }));
db.tracks.createIndex({ track_genre: 1, popularity: -1, 'audio_features.danceability': 1 }, { name: 'genre_popularity_danceability' });
explain('1 AFTER', db.tracks.find(popFilter).sort({ popularity: -1 }).hint('genre_popularity_danceability'));
explain('2 BEFORE: natural collection scan', db.tracks.find(workFilter).hint({ $natural: 1 }));
db.tracks.createIndex({ explicit: 1, 'audio_features.instrumentalness': 1, 'audio_features.speechiness': 1 }, { name: 'explicit_instrumentalness_speechiness' });
explain('2 AFTER', db.tracks.find(workFilter).hint('explicit_instrumentalness_speechiness'));
