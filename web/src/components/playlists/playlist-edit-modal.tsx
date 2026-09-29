'use client'

import { useRef, useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT } from '@/lib/i18n/provider'
import inputStyles from '@/components/ui/input.module.css'
import styles from './playlist-detail.module.css'

const NAME_MAX = 100
const DESCRIPTION_MAX = 300

interface PlaylistEditModalProps {
  open: boolean
  onClose: () => void
  playlistId: string
  initialName: string
  initialDescription: string | null
  /** Mevcut kapak — Spotify düzenleme penceresi gibi solda büyük gösterilir. */
  coverUrl?: string | null
}

/**
 * Playlist ad/açıklama/kapak düzenleme — hero'daki "..." menüsünün gerçek
 * eylemi (Sahip, 2026-08-11: eskiden hayalet bir senkron paneline
 * bağlıydı).
 *
 * 🔴 DÜZELTME (Antigravity denetimi #07, 2026-09-27): kapak eskiden dosya
 * SEÇİLİR SEÇİLMEZ Spotify'a yükleniyordu; ad/açıklama ise ayrı "Save"
 * bekliyordu. Sonuç: kullanıcı "Cancel"a bassa BİLE kapak zaten değişmiş
 * oluyordu — modalın "iptal" sözü yalandı. Artık kapak yalnız YEREL önizleme
 * (`URL.createObjectURL`) alır; asıl yükleme ad/açıklamayla BİRLİKTE, tek
 * "Save" basışında, sırayla gönderilir (Spotify'ın iki ayrı endpoint'i var,
 * gerçek atomiklik yok — ama kullanıcı deneyiminde tek an gibi görünür).
 */
export function PlaylistEditModal({
  open,
  onClose,
  playlistId,
  initialName,
  initialDescription,
  coverUrl = null,
}: PlaylistEditModalProps) {
  const router = useRouter()
  const { t } = useT()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [hata, setHata] = useState<string | null>(null)
  /** Seçilen ama HENÜZ yüklenmemiş kapak dosyası — yalnız "Save"de gönderilir. */
  const [coverFile, setCoverFile] = useState<File | null>(null)
  /** `coverFile`den türeyen yerel önizleme URL'i; kapak yoksa mevcut `coverUrl`. */
  const [coverPreview, setCoverPreview] = useState<string | null>(coverUrl)
  const [saving, startSaving] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nameInvalid = name.trim().length === 0 || name.length > NAME_MAX
  const descriptionInvalid = description.length > DESCRIPTION_MAX

  // Modal her açılışta önceki turun state'ini değil, güncel props'u gösterir.
  // Effect yerine render sırasında sıfırlanır (React: "adjusting state on prop change").
  const [oncekiOpen, setOncekiOpen] = useState(open)
  if (open !== oncekiOpen) {
    setOncekiOpen(open)
    if (open) {
      setName(initialName)
      setDescription(initialDescription ?? '')
      setCoverFile(null)
      setCoverPreview(coverUrl)
      setHata(null)
    }
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // Aynı dosyayı arka arkaya seçebilmek için sıfırla.
    if (!file) return
    setCoverFile(file)
    setCoverPreview((eski) => {
      if (eski && eski.startsWith('blob:')) URL.revokeObjectURL(eski)
      return URL.createObjectURL(file)
    })
  }

  function handleClose() {
    if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    onClose()
  }

  function handleSave() {
    if (nameInvalid || descriptionInvalid) return
    setHata(null)
    startSaving(async () => {
      try {
        const res = await fetch(`/api/playlists/${playlistId}/details`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), description: description.trim() }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          setHata(data?.error ?? t('playlists.editModal.errorSaveGeneric'))
          return
        }

        if (coverFile) {
          const formData = new FormData()
          formData.append('cover', coverFile)
          const coverRes = await fetch(`/api/playlists/${playlistId}/cover`, {
            method: 'PUT',
            body: formData,
          })
          if (!coverRes.ok) {
            const data = await coverRes.json().catch(() => null)
            // Ad/açıklama zaten kaydedildi — yalnız kapak hatası bildirilir,
            // kullanıcı tekrar "Save"e basınca yalnız kapak yeniden dener.
            setHata(data?.error ?? t('playlists.editModal.errorCoverUpload'))
            return
          }
        }

        if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
        router.refresh()
        onClose()
      } catch {
        setHata(t('playlists.editModal.errorConnection'))
      }
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('playlists.editModal.title')}>
      <div className={styles.editForm}>
        <div className={styles.editLayout}>
          <div className={styles.editCoverCol}>
            <button
              type="button"
              className={styles.editCoverTrigger}
              onClick={() => fileInputRef.current?.click()}
              aria-label={t('playlists.editModal.changeCoverAriaLabel')}
            >
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="" className={styles.editCoverImg} />
              ) : (
                <span className={styles.editCoverEmpty} aria-hidden />
              )}
              <span className={styles.editCoverOverlay}>
                <Pencil size={36} strokeWidth={1.5} aria-hidden />
                <span>{t('playlists.editModal.choosePhoto')}</span>
              </span>
            </button>
            <input name="playlistCover"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.editCoverInput}
              onChange={handleCoverChange}
            />
            {/* Yeni bir kapak seçildiğini "Save"e basmadan da söyler — sessiz
                bekleyen bir değişiklik bırakmamak için (§Predictability). */}
            {coverFile && (
              <p className={styles.editCoverPending}>{t('playlists.editModal.newCoverSelected')}</p>
            )}
          </div>

          <div className={styles.editFieldsCol}>
            <div className={styles.editField}>
              <label htmlFor="playlist-edit-name" className={styles.editLabel}>
                {t('playlists.editModal.nameLabel')}
              </label>
              <Input
                id="playlist-edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                invalid={nameInvalid}
                maxLength={NAME_MAX}
                disabled={saving}
              />
            </div>

            <div className={styles.editField}>
              <label htmlFor="playlist-edit-description" className={styles.editLabel}>
                {t('playlists.editModal.descriptionLabel')}
              </label>
              <textarea
                id="playlist-edit-description"
                className={`${inputStyles.input} ${descriptionInvalid ? inputStyles.invalid : ''}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={DESCRIPTION_MAX}
                rows={3}
                disabled={saving}
              />
              <span className={styles.editCharCount}>
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </div>

          </div>
        </div>

        {hata && (
          <p className={styles.editFieldError} role="alert">
            {hata}
          </p>
        )}

        <div className={styles.editActions}>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            {t('playlists.editModal.cancel')}
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={nameInvalid || descriptionInvalid}>
            {t('playlists.editModal.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
