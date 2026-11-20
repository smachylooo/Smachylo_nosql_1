"""Load CSV in chunks. Replaces spotify.tracks_raw; use a dedicated database."""
import os
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient
from tqdm import tqdm

load_dotenv()
client = MongoClient(os.environ['MONGO_URI'])
db = client['spotify']
collection = db['tracks_raw']
collection.drop()
ints = ['popularity', 'duration_ms', 'key', 'mode', 'time_signature']
floats = ['danceability', 'energy', 'loudness', 'speechiness', 'acousticness',
          'instrumentalness', 'liveness', 'valence', 'tempo']
count = 0
for chunk in tqdm(pd.read_csv(os.getenv('CSV_PATH', 'dataset.csv'), chunksize=1000)):
    chunk = chunk.dropna(subset=['artists', 'track_name']).copy()
    chunk = chunk.loc[(chunk['artists'].str.strip() != '') & (chunk['track_name'].str.strip() != '')]
    explicit = chunk['explicit'].astype(str).str.strip().str.lower()
    if not explicit.isin(['true', 'false']).all():
        raise ValueError('Invalid explicit value in CSV')
    chunk['explicit'] = explicit.eq('true')
    chunk[ints] = chunk[ints].astype(int)
    chunk[floats] = chunk[floats].astype(float)
    records = chunk.astype(object).where(pd.notna(chunk), None).to_dict('records')
    if records:
        collection.insert_many(records)
        count += len(records)
print(f'Завантажено: {count}; у колекції: {collection.count_documents({})}')
print(collection.find_one())
client.close()
