"""Spotify Extended Streaming History parser — saf fonksiyonlar.

Kaynak kuralları: docs/Developer-docs/spotify-export-research.md
DB/Storage bilmez; tamamen test-edilebilir. Worker bunları çağırır.

🔴 İKİ FARKLI ALAN ŞEMASI (2026-09-27'de gerçek bir "Spotify Account Data"
ZIP'inde ölçüldü — bu dosya bu tarihe kadar yalnız Extended Streaming
History şemasını (aşağıdaki "A") biliyordu):

  A) Extended Streaming History (`endsong_*.json` / bazı `StreamingHistory_*.json`):
     snake_case — "ts", "ms_played", "master_metadata_track_name",
     "master_metadata_album_artist_name", "spotify_track_uri", "episode_name",
     "reason_start"/"reason_end"/"shuffle"/"skipped"/"offline"/"conn_country".
     "ts" ISO8601 UTC ("2026-01-01T00:00:00Z").

  B) Hesap Verisi paketinin KENDİ streaming dosyaları (`StreamingHistory_music_N.json`,
     `StreamingHistory_podcast_N.json` — tam bu ADLARLA, ama içerik FARKLI):
     camelCase, çok daha az alan — yalnız "endTime", "msPlayed", ve
     "trackName"+"artistName" (müzik) VEYA "episodeName"+"podcastName" (podcast).
     URI YOK (track/episode kimliği isimden çözülmeli). "endTime" saat dilimi
     BİLGİSİZ yerel saat, dakika hassasiyetinde ("2025-09-24 18:38") — Spotify'ın
     kendi export'unun bilinen eksiği, düzeltilemez; UTC varsayılır (§ aşağıda).

  Önceden yalnız (A) okunuyordu: (B) formatındaki her olay `ms_played=0` /
  `ts=None` üretiyor, `is_valid_play` hepsini eliyordu — kullanıcı "içe aktarma
  başarılı" görüyor ama dinleme geçmişi SIFIR kayıt oluyordu (sessiz veri kaybı).
  Artık her okuyucu ikisini de dener (önce A, yoksa B).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable

MIN_MS_PLAYED = 5000  # research §2: 5 saniyeden kısa → at

# Asla DB'ye yazılmayacak hassas alanlar (research özet: ip_addr)
_SENSITIVE_KEYS = {"ip_addr", "ip_addr_decrypted", "user_agent_decrypted"}

# content_type CHECK ile uyumlu (migration 0001)
ContentType = str  # "music" | "podcast" | "audiobook" | "unknown"


def _account_data_ts_to_iso(end_time: Any) -> str | None:
    """(B) şemasının "YYYY-MM-DD HH:MM" (saat dilimsiz) damgasını ISO8601'e çevirir.

    ⚠ Spotify bu paket için saat dilimi HİÇ vermiyor — kullanıcının yerel saati
    olduğu bilinir ama hangi dilim olduğu bilinmez. UTC varsayımı sistematik bir
    kaymaya yol açabilir (kullanıcının gerçek ofsetine eşit) — bu, veriyi
    TAMAMEN atmaktan (önceki davranış) daha iyi bir seçim, mükemmel değil.
    """
    if not isinstance(end_time, str):
        return None
    try:
        dt = datetime.strptime(end_time, "%Y-%m-%d %H:%M")
    except ValueError:
        return None
    return dt.strftime("%Y-%m-%dT%H:%M:00Z")


def _ts(raw: dict[str, Any]) -> str | None:
    """Olay zaman damgası — (A) "ts" varsa aynen, yoksa (B) "endTime"den türetilir."""
    ts = raw.get("ts")
    if ts:
        return ts
    return _account_data_ts_to_iso(raw.get("endTime"))


def _ms_played(raw: dict[str, Any]) -> int:
    """(A) "ms_played" varsa aynen, yoksa (B) "msPlayed"e düşer."""
    if "ms_played" in raw:
        return raw.get("ms_played") or 0
    return raw.get("msPlayed") or 0


def _track_name(raw: dict[str, Any]) -> str | None:
    return raw.get("master_metadata_track_name") or raw.get("trackName")


def _artist_name(raw: dict[str, Any]) -> str | None:
    return raw.get("master_metadata_album_artist_name") or raw.get("artistName")


def _episode_name(raw: dict[str, Any]) -> str | None:
    return raw.get("episode_name") or raw.get("episodeName")


def _show_name(raw: dict[str, Any]) -> str | None:
    return raw.get("episode_show_name") or raw.get("podcastName")


def classify_event(raw: dict[str, Any]) -> ContentType:
    """İçerik tipini sınıflandır (research §5 — öncelik kritik).

    audiobook_title → audiobook, sonra episode adı → podcast,
    sonra track adı → music, hiçbiri yoksa → unknown.
    Audiobook önce gelir (eski/yeni export format farkı). (B) şemasında
    audiobook alanı hiç yok — o dal yalnız (A) için anlamlı.
    """
    if raw.get("audiobook_title"):
        return "audiobook"
    if _episode_name(raw):
        return "podcast"
    if _track_name(raw):
        return "music"
    return "unknown"


def is_valid_play(raw: dict[str, Any]) -> bool:
    """Geçerli dinleme mi (research §2).

    ms_played = 0 → at; < 5000 → at.
    >= 5000 + skipped=True → SAKLA (skip istatistiği için gerekli).
    """
    return _ms_played(raw) >= MIN_MS_PLAYED


def _dedup_key(raw: dict[str, Any]) -> tuple[Any, Any]:
    """(ts, kimlik) çifti — (A)'da kimlik URI'dir (research §4).

    (B) şemasında URI hiç yok; isim çiftine (parça+sanatçı veya bölüm+program)
    düşülür. Bu, "aynı dakikada biten iki FARKLI şarkı" durumunda URI'siz
    sadece zaman damgasına bakmanın onları yanlışlıkla TEK kayda indirgemesini
    engeller.
    """
    uri = (
        raw.get("spotify_track_uri")
        or raw.get("spotify_episode_uri")
        or raw.get("audiobook_chapter_uri")
        or raw.get("audiobook_uri")
    )
    if not uri:
        name = _track_name(raw) or _episode_name(raw)
        artist = _artist_name(raw) or _show_name(raw)
        if name:
            uri = f"name:{name}|{artist or ''}"
    return (_ts(raw), uri)


def deduplicate(events: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Aynı (ts + uri) çiftini tek bırak; farklı uri = farklı kayıt (research §4)."""
    seen: set[tuple[Any, Any]] = set()
    out: list[dict[str, Any]] = []
    for ev in events:
        key = _dedup_key(ev)
        if key in seen:
            continue
        seen.add(key)
        out.append(ev)
    return out


def strip_sensitive(raw: dict[str, Any]) -> dict[str, Any]:
    """Hassas alanları (ip_addr vb.) çıkar — asla DB'ye yazılmaz."""
    return {k: v for k, v in raw.items() if k not in _SENSITIVE_KEYS}


def sort_events_chronologically(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """ts'e göre sırala (research §1: dosya adına/numarasına güvenme)."""
    return sorted(events, key=lambda e: _ts(e) or "")


def normalize_event(
    raw: dict[str, Any], *, source: str = "spotify_export"
) -> dict[str, Any]:
    """Ham export kaydını play_events satırına dönüştür (migration 0001 şeması).

    - ip_addr asla taşınmaz.
    - reason_start/reason_end/platform TEXT korunur, enum yok (research §3, §7).
    - platform alanı KAYNAK platformu ("spotify"); cihaz bilgisi conn_country/
      raw cihaz alanından ayrıdır.
    - (B) şemasında (bkz. modül başlığı) `spotify_track_uri`, `conn_country`,
      `reason_start/end`, `shuffle`, `skipped`, `offline`, `incognito_mode`
      hiç YOK — hepsi None/False kalır, uydurulmaz.
    """
    content_type = classify_event(raw)
    return {
        "played_at": _ts(raw),
        "content_type": content_type,
        "raw_track_name": _track_name(raw),
        "raw_artist_name": _artist_name(raw),
        "spotify_track_uri": raw.get("spotify_track_uri"),
        "episode_name": _episode_name(raw),
        "episode_show_name": _show_name(raw),
        "spotify_episode_uri": raw.get("spotify_episode_uri"),
        "audiobook_title": raw.get("audiobook_title"),
        "audiobook_uri": raw.get("audiobook_uri"),
        "platform": "spotify",
        "source": source,
        "ms_played": _ms_played(raw),
        "conn_country": raw.get("conn_country"),
        "reason_start": raw.get("reason_start"),
        "reason_end": raw.get("reason_end"),
        "shuffle": raw.get("shuffle"),
        "skipped": bool(raw.get("skipped", False)),
        "offline": bool(raw.get("offline", False)),
        "incognito_mode": bool(raw.get("incognito_mode", False)),
    }


# ─────────────────── ZIP girdisi sınıflandırma (export_runner için) ───────────
# Önceden app/jobs/process_export.py içindeydi; cron-tabanlı export_runner'a
# taşındı (eski process_export.py silindi).

def classify_zip_entry(name: str) -> str:
    """ZIP içindeki dosyayı tipine göre sınıflandır.

    Önce dosya adına göre hızlı karar verilir (bilinen Spotify formatları).
    .json uzantılı ama adı tanınmayan dosyalar "unknown_json" döner —
    içerik taraması _iter_streaming_events'te yapılır.
    """
    base = name.rsplit("/", 1)[-1]

    if base.startswith("StreamingHistory_") or base.startswith("Streaming_History_"):
        return "streaming"

    if base.startswith("Playlist") and base.endswith(".json"):
        return "playlist"

    if base == "YourLibrary.json":
        return "library"

    if base == "identity.json":
        return "identity"  # işlenmez, silinir (güvenlik)

    if base.endswith(".json"):
        return "unknown_json"

    return "ignore"


# Bir JSON dosyasının streaming history olduğunu doğrulayan alan seti.
# Herhangi biri yeterliyse streaming sayılır. (A) VE (B) şemalarını birlikte
# kapsar (bkz. modül başlığı) — yalnız (A)'ya bakmak (B) formatındaki gerçek
# StreamingHistory_music dosyalarını "streaming değil" sanıp atlıyordu.
_STREAMING_SIGNAL_KEYS = frozenset({
    "ts", "ms_played", "master_metadata_track_name",
    "spotify_track_uri", "reason_start", "reason_end",
    "endTime", "msPlayed", "trackName", "artistName", "episodeName", "podcastName",
})


def _looks_like_streaming_json(first_item: dict[str, Any]) -> bool:
    """İlk JSON objesinin streaming history formatında olup olmadığını kontrol et."""
    return bool(_STREAMING_SIGNAL_KEYS & first_item.keys())
