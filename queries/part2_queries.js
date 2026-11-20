// mongosh "$MONGO_URI" --quiet --file queries/part2_queries.js > results/part2.txt
db = db.getSiblingDB('spotify');
function show(title, cursor) { print('\n' + title); cursor.forEach(doc => print(EJSON.stringify(doc))); }
show('1. Треки для вечірки', db.tracks.find({
  'audio_features.danceability': { $gt: 0.7 }, 'audio_features.energy': { $gt: 0.7 },
  duration_ms: { $gte: 180000, $lte: 300000 }
}, { track_name: 1, artists: 1, duration_ms: 1, 'audio_features.danceability': 1, 'audio_features.energy': 1 }));

// One track_id per artist: CSV may repeat the same track in several genres.
// The maximum popularity is selected deterministically if duplicate rows differ.
show('2. Артисти, усі треки яких популярні', db.tracks.aggregate([
  { $unwind: '$artists' }, { $match: { artists: { $ne: '' }, track_id: { $nin: [null, ''] } } },
  { $group: { _id: { artist: '$artists', track: '$track_id' }, popularity: { $max: '$popularity' } } },
  { $group: { _id: '$_id.artist', track_count: { $sum: 1 }, min_popularity: { $min: '$popularity' }, avg_popularity: { $avg: '$popularity' } } },
  { $match: { track_count: { $gte: 3 }, min_popularity: { $gte: 60 } } },
  { $sort: { avg_popularity: -1, track_count: -1, _id: 1 } }, { $limit: 20 },
  { $project: { _id: 0, artist: '$_id', track_count: 1, min_popularity: 1, avg_popularity: { $round: ['$avg_popularity', 1] } } }
]));

// $setWindowFields keeps individual tracks without accumulating an entire genre in one document.
show('3. Нетиповий темп за жанром', db.tracks.aggregate([
  { $match: { track_genre: { $type: 'string' }, 'audio_features.tempo': { $type: 'number' } } },
  { $setWindowFields: { partitionBy: '$track_genre', output: {
    avg_tempo: { $avg: '$audio_features.tempo', window: { documents: ['unbounded', 'unbounded'] } },
    std_tempo: { $stdDevPop: '$audio_features.tempo', window: { documents: ['unbounded', 'unbounded'] } }
  } } },
  { $set: { outlier_threshold: { $add: ['$avg_tempo', { $multiply: [2, '$std_tempo'] }] } } },
  { $match: { $expr: { $gt: ['$audio_features.tempo', '$outlier_threshold'] } } },
  { $group: { _id: '$track_genre', avg_tempo: { $first: '$avg_tempo' }, outlier_threshold: { $first: '$outlier_threshold' },
    outlier_tracks: { $push: { _id: '$_id', track_name: '$track_name', popularity: '$popularity', artists: '$artists', audio_features: { tempo: '$audio_features.tempo' } } } } },
  { $project: { _id: 0, genre: '$_id', avg_tempo: 1, outlier_threshold: 1, outlier_tracks: 1 } }, { $sort: { genre: 1 } }
], { allowDiskUse: true }));
show('4. Треки для фонової роботи', db.tracks.find({
  'audio_features.loudness': { $lt: -10 }, 'audio_features.speechiness': { $lt: 0.1 },
  'audio_features.instrumentalness': { $gt: 0.5 }, explicit: false
}, { track_name: 1, artists: 1, explicit: 1, 'audio_features.loudness': 1, 'audio_features.speechiness': 1, 'audio_features.instrumentalness': 1 }));
