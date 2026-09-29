"""spotify_export.py saf fonksiyon testleri — iki alan şeması (A/B).

🔴 2026-09-27: gerçek bir "Spotify Account Data" ZIP'inde ölçüldü — bu paketin
KENDİ StreamingHistory_music/podcast_N.json dosyaları Extended Streaming
History'den (A) TAMAMEN farklı, camelCase bir şema (B) kullanıyor. Fix öncesi
(B) formatındaki her olay ms_played=0 üretiyor, is_valid_play hepsini
eliyordu — kullanıcı "başarılı" görüyor ama dinleme geçmişi sıfır kayıt
oluyordu. Bu dosya iki şemayı da aynı davranışla test eder.
"""
from app.parser.spotify_export import (
    classify_event,
    is_valid_play,
    normalize_event,
    sort_events_chronologically,
    deduplicate,
)

# (A) Extended Streaming History
_EXTENDED_MUSIC = {
    "ts": "2026-01-01T00:00:00Z",
    "ms_played": 180000,
    "master_metadata_track_name": "Song",
    "master_metadata_album_artist_name": "Artist",
    "spotify_track_uri": "spotify:track:abc",
}

# (B) Account Data paketinin kendi streaming dosyaları — camelCase, URI yok.
_ACCOUNT_MUSIC = {
    "endTime": "2026-01-01 00:00",
    "artistName": "Artist",
    "trackName": "Song",
    "msPlayed": 180000,
}
_ACCOUNT_PODCAST = {
    "endTime": "2026-01-01 00:05",
    "podcastName": "Show",
    "episodeName": "Episode",
    "msPlayed": 60000,
}
_ACCOUNT_SHORT_PLAY = {
    "endTime": "2026-01-01 00:10",
    "artistName": "Artist",
    "trackName": "Skipped",
    "msPlayed": 1200,  # < 5000 → geçersiz
}


def test_account_data_classify_music_ve_podcast():
    assert classify_event(_ACCOUNT_MUSIC) == "music"
    assert classify_event(_ACCOUNT_PODCAST) == "podcast"


def test_account_data_is_valid_play_ms_esigi():
    assert is_valid_play(_ACCOUNT_MUSIC) is True
    assert is_valid_play(_ACCOUNT_SHORT_PLAY) is False


def test_account_data_normalize_event_alan_esleme():
    n = normalize_event(_ACCOUNT_MUSIC)
    assert n["played_at"] == "2026-01-01T00:00:00Z"  # endTime → ISO, UTC varsayılır
    assert n["content_type"] == "music"
    assert n["raw_track_name"] == "Song"
    assert n["raw_artist_name"] == "Artist"
    assert n["ms_played"] == 180000
    # (B)'de yok — uydurulmaz
    assert n["spotify_track_uri"] is None
    assert n["reason_start"] is None


def test_account_data_normalize_event_podcast():
    n = normalize_event(_ACCOUNT_PODCAST)
    assert n["content_type"] == "podcast"
    assert n["episode_name"] == "Episode"
    assert n["episode_show_name"] == "Show"


def test_extended_schema_hala_calisiyor():
    """(A) davranışı (B) eklenirken bozulmadı."""
    n = normalize_event(_EXTENDED_MUSIC)
    assert n["played_at"] == "2026-01-01T00:00:00Z"
    assert n["raw_track_name"] == "Song"
    assert n["spotify_track_uri"] == "spotify:track:abc"
    assert is_valid_play(_EXTENDED_MUSIC) is True


def test_account_data_dedup_uri_yoksa_isme_duser():
    """URI olmayan (B) olaylarında aynı dakikada biten FARKLI şarkılar birbirini yutmaz."""
    same_minute_other_song = {**_ACCOUNT_MUSIC, "trackName": "Different Song"}
    deduped = deduplicate([_ACCOUNT_MUSIC, same_minute_other_song, dict(_ACCOUNT_MUSIC)])
    assert len(deduped) == 2  # iki farklı şarkı kalır, üçüncü (birebir kopya) elenir


def test_account_data_sort_endtime_ile_calisir():
    later = {**_ACCOUNT_MUSIC, "endTime": "2026-01-02 00:00"}
    ordered = sort_events_chronologically([later, _ACCOUNT_MUSIC])
    assert ordered[0] is _ACCOUNT_MUSIC
    assert ordered[1] is later


def test_account_data_bozuk_endtime_played_at_none_dondurur():
    """Parse edilemeyen tarih exception fırlatmaz — olay played_at=None ile geçer."""
    bozuk = {**_ACCOUNT_MUSIC, "endTime": "not-a-date"}
    n = normalize_event(bozuk)
    assert n["played_at"] is None
